# Hallazgos de Verificación de Datos - RAIS BD

> **Fecha:** Marzo 2026  
> **Base de datos:** rais @ 172.16.156.106:3500

---

## 📊 Resultados Principales

### 1. PATENTES - ⚠️ NO tiene código CIP explícito

**Total patentes:** 158 (120 modelos de utilidad + 38 patentes de invención)

**Hallazgo Crítico:**
- `nro_registro` solo contiene número (ej: "6415", "0528")
- `nro_expediente` está **NULL** en todos los registros
- ❌ **NO hay campo con clasificación IPC/CIP**

**Solución:**
✅ Usar mapeo manual por tipo:
- "Patente de invención" → IPC según título (requiere análisis semántico o curación manual)
- "Modelo de utilidad" → IPC genérico "F16" (Elementos o unidades de ingeniería)

**Ejemplos de títulos:**
- "Procedimiento para obtener agregado de construcción..." → C04B (Cemento/Cerámica)
- "Mototaxi accionada por motor eléctrico..." → B60L (Vehículos eléctricos)
- "Bicicleta con mecanismo de transmisión..." → B62M (Bicicletas)

---

### 2. PUBLICACIONES - ✅ Excelente cobertura para inferir Access

**Total publicaciones:** 59,185

| Tipo | Total | Con DOI | Con URL | Con URI | % Cobertura |
|------|-------|---------|---------|---------|-------------|
| Artículo | 26,641 | 9,420 (35%) | 11,503 (43%) | 0 | **78%** |
| Evento | 15,615 | 0 | 2,675 (17%) | 0 | **17%** |
| Tesis-asesoría | 7,821 | 0 | 7,212 (92%) | 7,155 (91%) | **92%** |
| Tesis | 3,682 | 0 | 1,295 (35%) | 10 | **35%** |
| Libro | 2,654 | 0 | 556 (21%) | 0 | **21%** |
| Capítulo | 2,533 | 398 (16%) | 903 (36%) | 1 | **52%** |

**Estrategia de inferencia Access:**
1. Si tiene DOI o URL o URI → **Open Access** (c_abf2)
2. Tipo "tesis-asesoria" → **Open Access** (92% tienen URI repositorio)
3. Artículos sin DOI/URL → **Metadata Only** (c_14cb) - 22% de artículos
4. Eventos sin URL → **Metadata Only** - 83% de eventos

**Cobertura general:** ~60% con acceso abierto comprobable, 40% metadata only por defecto

---

### 3. PUBLICACIONES - ✅ 88% tienen keywords

**Total publicaciones:** 59,185  
**Con keywords:** 52,468 (88.6%)  
**Total keywords:** 200,991 (promedio ~3.8 keywords/publicación)

✅ **Tabla `Publicacion_palabra_clave` ESTÁ POBLADA**

**Acción:** Modificar `publication.repository.js` para incluir JOIN con esta tabla

---

### 4. PROYECTOS - ✅ 99% tienen descripciones

**Total proyectos:** 6,693  
**Con descripciones:** 6,652 (99.4%)  
**Total descripciones:** 61,991 (promedio ~9.3 descripciones/proyecto)

✅ **Tabla `Proyecto_descripcion` MUY COMPLETA**

**Observación:** Múltiples descripciones por proyecto sugiere diferentes secciones:
- Abstract/Resumen
- Objetivos
- Metodología
- Resultados esperados
- etc.

**Acción:** Usar `descripcion_id` para identificar cuál es el abstract principal

---

### 5. PROYECTOS - ✅ 91% tienen línea de investigación

**Total proyectos:** 6,693  
**Con línea asignada:** 6,115 (91.4%)

✅ **Campo `linea_investigacion_id` BIEN POBLADO**

**Acción:** Hacer JOIN con `Linea_investigacion` para obtener nombre

---

### 6. PROYECTOS - ⚠️ Solo 8% tienen financiamiento detallado

**Total proyectos:** 6,693

| Tipo financiamiento | Cantidad | Porcentaje |
|---------------------|----------|------------|
| Aporte UNMSM | 26 | 0.4% |
| Aporte no UNMSM | 209 | 3.1% |
| Fuente externa | 311 | 4.6% |
| **Cualquier aporte detallado** | **546** | **8.2%** |

⚠️ **Mayoría usa solo `monto_asignado`** (campo genérico)

**Conclusión:** 
- Para Funding como entidad separada: Solo ~8% de proyectos califican
- Para Project.funding: 100% pueden usar `monto_asignado`

---

## 🎯 Decisiones de Implementación

### CRÍTICO 1: Publication.Access (M)

```javascript
function inferAccessRights(row) {
  // Tesis-asesoría: 92% tienen URI repositorio → Open Access
  if (row.tipo_publicacion === 'tesis-asesoria' && (row.uri || row.url)) {
    return 'http://purl.org/coar/access_right/c_abf2'; // open access
  }
  
  // Tiene DOI, URL o URI → Open Access
  if (row.doi || row.url || row.uri) {
    return 'http://purl.org/coar/access_right/c_abf2'; // open access
  }
  
  // Resto → Metadata Only (conservador)
  return 'http://purl.org/coar/access_right/c_14cb'; // metadata only
}
```

**Resultado esperado:**
- ~35,000 publicaciones (60%) → Open Access
- ~24,000 publicaciones (40%) → Metadata Only

---

### CRÍTICO 2: Patent.Subject (M)

**Estrategia:** Mapeo manual por análisis de título + tipo

```javascript
// Crear tabla de mapeo en constants.js
const PATENT_IPC_BY_KEYWORDS = {
  'construcción|edificación|cemento|concreto': 'E04', // Construcción
  'motor|eléctric|solar|energía': 'H02', // Generación/conversión energía
  'bicicleta|vehículo': 'B62', // Vehículos terrestres
  'alumina|metal|limpieza': 'C22', // Metalurgia
  'semilla|plant|agrícola': 'A01', // Agricultura
  'procedimiento|método': 'C', // Química/Metalurgia (genérico)
  'dispositivo|aparato': 'G', // Física (genérico)
};

function inferIPCClassification(row) {
  const titulo = (row.titulo || '').toLowerCase();
  
  for (const [keywords, ipc] of Object.entries(PATENT_IPC_BY_KEYWORDS)) {
    const regex = new RegExp(keywords, 'i');
    if (regex.test(titulo)) {
      return {
        scheme: 'https://www.wipo.int/classifications/ipc',
        value: ipc,
        note: `Clasificación inferida desde título. Requiere validación manual.`,
      };
    }
  }
  
  // Fallback por tipo
  if (row.tipo === 'Modelo de utilidad') {
    return {
      scheme: 'https://www.wipo.int/classifications/ipc',
      value: 'F16', // Elementos de ingeniería
      note: 'Clasificación genérica para modelo de utilidad.',
    };
  }
  
  // Último recurso
  return {
    scheme: 'https://www.wipo.int/classifications/ipc',
    value: 'Y10S', // Clase técnica general
    note: 'Clasificación CIP no disponible. Requiere curación manual.',
  };
}
```

**Recomendación:** Crear CSV con ID, título, tipo → para que bibliotecarios asignen CIP manualmente

---

## 📋 Resumen de Acciones

### ✅ Inmediato (Fase 1 - 1 semana)

1. ✅ Implementar `inferAccessRights()` en publication.repository.js
2. ✅ Implementar `inferIPCClassification()` en patent.repository.js  
3. ✅ Agregar JOIN con `Publicacion_palabra_clave` en publication.repository.js
4. ✅ Actualizar constants.js con:
   - ACCESS_RIGHTS
   - PATENT_IPC_BY_KEYWORDS
5. ✅ Crear documento de curación manual: `CURACION-MANUAL.md`

### ⚠️ Alta Prioridad (Fase 2 - 2 semanas)

6. ✅ Agregar JOIN con `Proyecto_descripcion` (abstract)
7. ✅ Agregar JOIN con `Linea_investigacion`
8. ✅ Mejorar funding usando campos `aporte_*`
9. ✅ Agregar identificadores UNMSM (ROR, ISNI, RUC)

### 📊 Opcional (Fase 3+)

10. ⚠️ Implementar entidad Funding separada (solo ~550 proyectos califican)
11. ⚠️ Crear workflow de curación manual para CIP
12. ⚠️ Implementar Equipment desde vistas

---

**Última actualización:** Marzo 2026  
**Queries ejecutadas:** 6  
**Registros analizados:** 72,731 (59,185 pubs + 6,693 proyectos + 158 patentes + 6,695 otros)
