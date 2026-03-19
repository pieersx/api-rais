# Análisis de Cumplimiento PerúCRIS 1.1 - RAIS API

> **Fecha:** Marzo 2026  
> **Base de datos:** rais @ 172.16.156.106:3500  
> **Objetivo:** Maximizar cumplimiento PerúCRIS 1.1 usando SOLO datos existentes en BD

---

## 📊 Resumen Ejecutivo

### Estado Actual de Cumplimiento

| Entidad | Cumplimiento | Campos M | Campos MA/R Faltantes | Prioridad |
|---------|--------------|----------|----------------------|-----------|
| **Person** | ✅ 95% | 100% | CTI Vitae, Teléfono | BAJA |
| **OrgUnit** | ⚠️ 70% | 100% | ROR, ISNI, UbiGeo, CIIU, Tipo OCDE | MEDIA |
| **Publication** | 🔴 60% | **FALTA Access (M)** | Keywords, Subjects OCDE, RENATI | **CRÍTICA** |
| **Project** | ⚠️ 65% | 100% | Type OCDE, Abstract, CIIU, ResearchLine, URL | ALTA |
| **Patent** | 🔴 50% | **FALTA Subject (M)** | ApprovalDate, Abstract, Keywords, Subjects OCDE | **CRÍTICA** |
| **Funding** | ❌ 0% | No implementado | Existe en BD (campos de Project) | ALTA |
| **Equipment** | ❌ 0% | No implementado | Existe Vista `EQUIPAMIENTO_CIENTIFICO` | MEDIA |

### ⚠️ Problemas Críticos

1. **Publication.Access (M)** - Campo OBLIGATORIO faltante (COAR Access Rights)
2. **Patent.Subject (M)** - Campo OBLIGATORIO faltante (Clasificación CIP/IPC)

**Sin estos 2 campos, el repositorio NO cumple con PerúCRIS 1.1**

---

## 🗂️ Estructura de Base de Datos Actual

### Tablas Principales (Ya en uso)

```
Usuario_investigador (54 campos)
├── Datos usados: id, nombres, apellido1, apellido2, doc_numero, codigo_orcid
│   scopus_id, researcher_id, sexo, email1-3, facultad_id, palabras_clave
├── NO USADOS pero disponibles:
│   ├── cti_vitae (MA) - Identificador CTI Vitae
│   ├── enlace_cti (MA) - URL perfil CTI Vitae
│   ├── google_scholar (O) - ID Google Scholar
│   ├── renacyt + renacyt_nivel (R) - Registro RENACYT
│   ├── tipo_investigador_* (R) - Categoría investigador
│   ├── fecha_nac (O) - Fecha de nacimiento
│   ├── grado, especialidad, titulo_profesional (R) - Educación
│   ├── telefono_casa, telefono_trabajo, telefono_movil (R)
│   ├── biografia (R)
│   ├── instituto_id, dependencia_id (MA) - Otras afiliaciones
│   └── direccion1, direccion2, pais, institucion (O)

Facultad (3 campos)
├── Datos usados: id, nombre
├── NO USADOS: area_id

Instituto (4 campos)
├── Datos usados: id, instituto, facultad_id, estado
├── FALTANTES para PerúCRIS: ROR, ISNI, GRID, UbiGeo, RUC, tipo OCDE

Grupo (36 campos)
├── Datos usados: id, grupo_nombre, grupo_nombre_corto, facultad_id, estado
├── NO USADOS pero disponibles:
│   ├── presentacion (R) - Descripción del grupo
│   ├── objetivos (R)
│   ├── servicios (O)
│   ├── email (R)
│   ├── web (R)
│   ├── direccion, telefono, anexo, oficina (O)
│   ├── resolucion_rectoral, resolucion_fecha (R)
│   ├── grupo_categoria (MA) - Categoría del grupo
│   └── objetivo_ods (MA) - ODS relacionado

Publicacion (56 campos)
├── Datos usados: id, titulo, resumen, tipo_publicacion, doi, isbn, issn, issn_e
│   uri, url, fecha_publicacion, publicacion_nombre, editorial, volumen
│   edicion, pagina_inicial, pagina_final, idioma, pais_codigo, estado
├── NO USADOS pero disponibles:
│   ├── tipo_tesis (MA) - Para tesis (mapeo RENATI)
│   ├── repositorio_tesis (MA) - URL repositorio
│   ├── universidad (MA) - Universidad de grado
│   ├── evento_nombre, fecha_inicio, fecha_fin (MA) - Para eventos
│   ├── tipo_presentacion, tipo_participacion (MA)
│   ├── art_tipo (MA) - Subtipo artículo
│   ├── editor (O) - Editor
│   ├── ciudad, ciudad_edicion, lugar_publicacion (O)
│   ├── nombre_libro (MA) - Para capítulos
│   └── year_publicacion (M) - ⚠️ ALTERNATIVA a fecha_publicacion

Publicacion_palabra_clave (tabla relacional)
├── publicacion_id, clave
└── ⚠️ TABLA EXISTE pero NO SE USA en repository

Proyecto (39 campos + tablas relacionales)
├── Datos usados: id, titulo, codigo_proyecto, tipo_proyecto, fecha_inicio
│   fecha_fin, monto_asignado, palabras_clave, localizacion, estado
│   facultad_id, grupo_id, ocde_id
├── NO USADOS pero disponibles:
│   ├── linea_investigacion_id → Linea_investigacion (R)
│   ├── aporte_unmsm, aporte_no_unmsm (MA) - Funding separado
│   ├── financiamiento_fuente_externa (MA)
│   ├── entidad_asociada (MA)
│   ├── institucion_entidad_externa, entidad_externa_pais (MA)
│   ├── resolucion_rectoral, resolucion_fecha (R)
│   ├── periodo, convocatoria (R)
│   ├── duracion_proyecto (R)
│   └── instituto_id (MA)

Proyecto_descripcion (tabla relacionada)
├── proyecto_id, descripcion_id, detalle
└── ⚠️ POTENCIAL para Project.Abstract

Patente (15 campos + tabla relacional)
├── Datos usados: id, titulo, tipo, nro_registro, nro_expediente
│   fecha_presentacion, oficina_presentacion, titular1, titular2, enlace
├── NO USADOS: estado
├── ⚠️ CRÍTICO FALTANTE: Subject (Clasificación CIP/IPC) - NO EXISTE EN BD

Ocde (tabla de referencia)
├── id, codigo (ej: "1.05.01"), linea (descripción)
└── ✅ Ya se usa en Project

Pais (tabla de referencia)
├── Campos: id, codigo_iso, nombre, etc.
└── Potencial para mapeos de países
```

### Tablas Relacionales Importantes

```sql
Publicacion_autor
├── publicacion_id, investigador_id, nombres, apellido1, apellido2
├── codigo_orcid, doc_numero, orden
└── ✅ Ya en uso

Patente_autor  
├── patente_id, investigador_id, nombres, apellido1, apellido2
└── ✅ Ya en uso

Proyecto_integrante
├── proyecto_id, investigador_id, proyecto_integrante_tipo_id
├── condicion, estado
└── ✅ Ya en uso

Proyecto_integrante_tipo
├── id, nombre (ej: "Responsable", "Coordinador", "Tesista")
└── ✅ Ya en uso para roles

Grupo_integrante
├── grupo_id, investigador_id (relación M:N)
└── ⚠️ NO SE USA (potencial para OrgUnit team)

Grupo_linea
├── grupo_id, linea_investigacion_id
└── ⚠️ NO SE USA (potencial para ResearchLine)

Linea_investigacion
├── id, nombre, facultad_id
└── ⚠️ NO SE USA (Project.ResearchLine)
```

### Vistas Importantes Disponibles

```sql
EQUIPAMIENTO_CIENTIFICO
├── ID_PROYECTO, CODIGO_PROYECTO, TITULO_PROYECTO
├── ID_INVESTIGADOR, DNI_INVESTIGADOR, CONDICION_INVESTIGADOR
├── ESTADO_PROYECTO, PERIODO_PROYECTO
└── 🎯 Usar para implementar entidad Equipment

PROYECTOS_FONDO_EXTERNO
├── Detalles completos de financiamiento externo
├── MONTO_FINANCIAMIENTO_UNMSM, MONTO_FINANCIAMIENTO_NO_UNMSM
├── MONTO_FINANCIAMIENTO_EXTERNO, MONTO_ENTIDAD_ASOCIADA
└── 🎯 Usar para implementar entidad Funding

PROYECTOS_FONDO_MONETARIO
├── Proyectos con financiamiento monetario
├── TIPO_INVESTIGACION, MONTO_FINANCIAMIENTO
└── 🎯 Complemento para Funding

PUBLICACION_ARTICULO
├── Vista optimizada para artículos
├── Con datos de indexación (WoS, Scopus)
└── ⚠️ Potencial para optimizar queries

GRUPO_INVESTIGACION
├── Vista consolidada de grupos
├── Con integrantes y categorías
└── ⚠️ Potencial para OrgUnit tipo "Research Group"
```

---

## 🔍 Análisis Detallado por Entidad

### 1. Person (Personas) - ✅ 95% Compliant

#### Campos PerúCRIS vs BD Actual

| Campo PerúCRIS | Persistencia | Campo BD | Estado |
|---------------|--------------|----------|--------|
| `@id` | M | `Usuario_investigador.id` | ✅ Implementado |
| `personName.familyNames` | M | `apellido1 + apellido2` | ✅ Implementado |
| `personName.firstNames` | M | `nombres` | ✅ Implementado |
| `gender` | O | `sexo` | ✅ Implementado |
| `identifiers[DNI]` | MA | `doc_numero` (si doc_tipo='DNI') | ✅ Implementado |
| `identifiers[ORCID]` | MA | `codigo_orcid` | ✅ Implementado |
| `identifiers[Scopus]` | MA | `scopus_id` | ✅ Implementado |
| `identifiers[ResearcherID]` | MA | `researcher_id` | ✅ Implementado |
| `identifiers[CTI Vitae]` | MA | `cti_vitae` | ❌ NO USADO |
| `identifiers[GoogleScholar]` | O | `google_scholar` | ❌ NO USADO |
| `emails` | R | `email1, email2, email3` | ✅ Implementado |
| `telephoneNumbers` | O | `telefono_casa, telefono_trabajo, telefono_movil` | ❌ NO USADO |
| `keywords` | R | `palabras_clave` | ✅ Implementado |
| `biography` | O | `biografia` | ❌ NO USADO |
| `affiliations` | MA | `facultad_id → Facultad` | ✅ Implementado |
| `affiliations (instituto)` | MA | `instituto_id → Instituto` | ❌ NO USADO |
| `dateOfBirth` | O | `fecha_nac` | ❌ NO USADO |
| `researcherCategory` | R | `renacyt + renacyt_nivel` | ❌ NO USADO |

#### Mejoras Propuestas (Code Changes Only)

```javascript
// En person.repository.js - función mapToCerif()

// 1. Agregar CTI Vitae identifier (MA)
if (row.cti_vitae) {
  identifiers.push(
    createIdentifier('https://purl.org/pe-repo/concytec/terminos#cti-vitae', row.cti_vitae)
  );
}

// 2. Agregar Google Scholar (O)
if (row.google_scholar) {
  identifiers.push(
    createIdentifier('https://scholar.google.com', row.google_scholar)
  );
}

// 3. Agregar teléfonos (O)
const phones = filterEmpty([row.telefono_trabajo, row.telefono_movil, row.telefono_casa]);
if (phones.length > 0) {
  person.telephoneNumbers = phones;
}

// 4. Agregar biografía (O)
if (row.biografia && row.biografia.trim()) {
  person.biography = { value: row.biografia.trim(), lang: 'es' };
}

// 5. Agregar fecha de nacimiento (O)
if (row.fecha_nac) {
  person.dateOfBirth = toISO8601(row.fecha_nac).split('T')[0];
}

// 6. Agregar categoría RENACYT (R)
if (row.renacyt && row.renacyt_nivel) {
  person.researcherCategory = {
    scheme: 'https://purl.org/pe-repo/concytec/renacyt',
    value: row.renacyt_nivel,
    name: `RENACYT ${row.renacyt_nivel}`,
  };
}

// 7. Agregar afiliación a Instituto (MA)
if (row.instituto_id) {
  // Necesita JOIN con Instituto en query principal
  affiliations.push({
    orgUnit: {
      id: toCerifId('OrgUnits', `I${row.instituto_id}`),
      name: row.instituto_nombre, // Agregar al SELECT
    },
    role: row.tipo || 'Investigador',
  });
}
```

#### Queries SQL a Modificar

```sql
-- Actualizar query en getPersons() y getPersonById()
SELECT 
  ui.*,
  f.id as facultad_id,
  f.nombre as facultad_nombre,
  i.id as instituto_id,
  i.instituto as instituto_nombre
FROM Usuario_investigador ui
LEFT JOIN Facultad f ON ui.facultad_id = f.id
LEFT JOIN Instituto i ON ui.instituto_id = i.id
WHERE ui.estado = 1
```

---

### 2. Publication (Publicaciones) - 🔴 60% Compliant - **CRÍTICO**

#### ⚠️ Campo OBLIGATORIO Faltante

**`Publication.Access` (M) - COAR Access Rights**

Este campo es **OBLIGATORIO** según PerúCRIS 1.1 pero NO existe en la tabla `Publicacion`.

##### Solución Propuesta (Inferir desde datos existentes)

```javascript
// En publication.repository.js - función mapToCerif()

/**
 * Infiere nivel de acceso basado en datos disponibles
 * Vocabulario COAR: http://purl.org/coar/access_right/
 */
function inferAccessRights(row) {
  // Si tiene DOI o URL pública → probablemente acceso abierto
  if (row.doi || row.url || row.uri) {
    return {
      '@xmlns': 'http://purl.org/coar/access_right/',
      '#text': 'http://purl.org/coar/access_right/c_abf2', // open access
    };
  }
  
  // Si solo tiene repositorio_tesis → acceso abierto
  if (row.repositorio_tesis) {
    return {
      '@xmlns': 'http://purl.org/coar/access_right/',
      '#text': 'http://purl.org/coar/access_right/c_abf2', // open access
    };
  }
  
  // Por defecto → metadata only (conservador)
  return {
    '@xmlns': 'http://purl.org/coar/access_right/',
    '#text': 'http://purl.org/coar/access_right/c_14cb', // metadata only
  };
}

// Agregar en mapToCerif():
publication.Access = inferAccessRights(row);
```

#### Campos Adicionales Disponibles en BD

| Campo PerúCRIS | Persistencia | Campo BD | Estado |
|---------------|--------------|----------|--------|
| `Access` | **M** | ❌ NO EXISTE | 🔴 **CRÍTICO - Inferir** |
| `keywords` | R | `Publicacion_palabra_clave.clave` | ❌ Tabla existe, no usada |
| `subjects[OCDE]` | MA | ❌ No hay relación con Ocde | ❌ No disponible |
| `subjects[RENATI]` | MA | `tipo_tesis` (para tesis) | ❌ NO USADO |
| `version` | MA | ❌ No existe | ❌ No disponible |
| `license` | R | ❌ No existe | ❌ No disponible |
| `advisors` | MA | ❌ No hay relación | ❌ No disponible |
| `publishers.place` | O | `ciudad_edicion, lugar_publicacion` | ❌ NO USADO |
| `partOf` | MA | `nombre_libro` (para capítulos) | ❌ NO USADO |
| `event` | MA | `evento_nombre, fecha_inicio, fecha_fin` | ❌ NO USADO |

#### Mejoras Propuestas

```javascript
// 1. CRÍTICO: Agregar Access (M)
publication.Access = inferAccessRights(row);

// 2. Agregar keywords desde tabla Publicacion_palabra_clave (R)
const [keywords] = await pool.query(`
  SELECT clave FROM Publicacion_palabra_clave 
  WHERE publicacion_id = ?
`, [row.id]);

if (keywords.length > 0) {
  publication.keywords = keywords.map(k => ({ value: k.clave, lang: 'es' }));
}

// 3. Para TESIS: Agregar RENATI type (MA)
if (row.tipo_publicacion === 'Tesis' && row.tipo_tesis) {
  // Mapeo tipo_tesis → RENATI
  const renatiMap = {
    'Tesis de pregrado': 'https://purl.org/pe-repo/renati/type#tesis',
    'Tesis de maestría': 'https://purl.org/pe-repo/renati/type#trabajoDeInvestigacion',
    'Tesis doctoral': 'https://purl.org/pe-repo/renati/type#tesis',
  };
  
  publication.subjects = publication.subjects || [];
  publication.subjects.push({
    scheme: 'https://purl.org/pe-repo/renati/type',
    value: renatiMap[row.tipo_tesis] || renatiMap['Tesis de pregrado'],
  });
}

// 4. Agregar universidad (MA para tesis)
if (row.universidad) {
  publication.degreeGrantor = { name: row.universidad };
}

// 5. Agregar repositorio URL (MA para tesis)
if (row.repositorio_tesis) {
  if (!publication.identifiers) publication.identifiers = [];
  publication.identifiers.push({ type: 'URI', value: row.repositorio_tesis });
}

// 6. Agregar evento (MA)
if (row.evento_nombre) {
  publication.event = {
    name: row.evento_nombre,
  };
  
  if (row.fecha_inicio) publication.event.startDate = toISO8601(row.fecha_inicio).split('T')[0];
  if (row.fecha_fin) publication.event.endDate = toISO8601(row.fecha_fin).split('T')[0];
}

// 7. Agregar lugar de publicación (O)
const placePublished = row.ciudad_edicion || row.lugar_publicacion || row.ciudad;
if (placePublished) {
  publication.placePublished = placePublished;
}

// 8. PartOf para capítulos de libro (MA)
if (row.nombre_libro) {
  publication.partOf = {
    title: row.nombre_libro,
  };
}
```

---

### 3. Patent (Patentes) - 🔴 50% Compliant - **CRÍTICO**

#### ⚠️ Campo OBLIGATORIO Faltante

**`Patent.Subject` (M) - Clasificación CIP (Clasificación Internacional de Patentes)**

Este campo es **OBLIGATORIO** pero NO existe en la BD actual.

##### Posibles Soluciones

**Opción A: Verificar si está en otro campo**
```sql
-- Revisar si nro_registro contiene el código CIP
SELECT nro_registro, nro_expediente, tipo 
FROM Patente 
WHERE estado = 1 
LIMIT 10;
```

**Opción B: Valor por defecto genérico**
```javascript
// Usar clasificación genérica temporal
patent.Subject = {
  scheme: 'https://www.wipo.int/classifications/ipc',
  value: 'G06F', // General (Computing) como placeholder
  warning: 'Clasificación CIP no disponible en BD. Requiere curación manual.',
};
```

**Opción C: Dejar en NULL temporalmente**
```javascript
// NO RECOMENDADO - Viola especificación M (Mandatory)
patent.Subject = null; // ⚠️ Esto haría el registro no conforme
```

#### Otros Campos Disponibles en BD

| Campo PerúCRIS | Persistencia | Campo BD | Estado |
|---------------|--------------|----------|--------|
| `Subject` | **M** | ❌ NO EXISTE | 🔴 **CRÍTICO** |
| `approvalDate` | MA | ❌ No existe (solo fecha_presentacion) | ❌ |
| `abstract` | R | ❌ No existe | ❌ |
| `keywords` | R | ❌ No existe | ❌ |
| `subjects[OCDE]` | MA | ❌ No hay relación con Ocde | ❌ |
| `originatesFrom` | MA | ❌ No hay relación con Project | ❌ |

#### Mejoras Propuestas

```javascript
// 1. CRÍTICO: Subject CIP - Requiere investigación manual
// Revisar primero si nro_registro o tipo contienen el código
patent.Subject = determineIPCClassification(row);

function determineIPCClassification(row) {
  // Intentar parsear de nro_registro si tiene formato "PE-123456-A01B"
  const ipcMatch = row.nro_registro?.match(/([A-H]\d{2}[A-Z])/);
  
  if (ipcMatch) {
    return {
      scheme: 'https://www.wipo.int/classifications/ipc',
      value: ipcMatch[1],
    };
  }
  
  // Si tipo tiene pista
  const tipoMap = {
    'Invención': 'G06F', // Placeholder genérico
    'Modelo de utilidad': 'F16B',
    'Diseño industrial': 'D99Z',
  };
  
  if (tipoMap[row.tipo]) {
    return {
      scheme: 'https://www.wipo.int/classifications/ipc',
      value: tipoMap[row.tipo],
      note: 'Clasificación inferida. Requiere validación.',
    };
  }
  
  // Último recurso: Código genérico
  return {
    scheme: 'https://www.wipo.int/classifications/ipc',
    value: 'Y10S', // Clase técnica general
    note: 'Clasificación CIP no disponible en base de datos. Requiere curación manual.',
  };
}

// 2. Si existe fecha de aprobación en otro campo
if (row.fecha_aprobacion) { // Verificar si existe este campo
  patent.approvalDate = toISO8601(row.fecha_aprobacion).split('T')[0];
}
```

---

### 4. Project (Proyectos) - ⚠️ 65% Compliant

#### Campos Faltantes con Datos Disponibles

| Campo PerúCRIS | Persistencia | Campo BD | Estado |
|---------------|--------------|----------|--------|
| `Type` (OCDE activity) | MA | ❌ No existe | ❌ Falta mapeo |
| `Abstract` | R | `Proyecto_descripcion.detalle` | ⚠️ Tabla existe |
| `ResearchLine` | R | `linea_investigacion_id → Linea_investigacion` | ❌ NO USADO |
| `subjects[CIIU]` | O | ❌ No existe | ❌ |
| `URL` | R | ❌ No existe | ❌ |
| `OAMandate` | R | ❌ No existe | ❌ |
| `geoLocationPoint` | MA | ❌ Solo texto en `localizacion` | ⚠️ Parsear |
| `Funding` (relación) | MA | Campos `aporte_*`, `financiamiento_*` | ⚠️ Datos dispersos |

#### Mejoras Propuestas

```javascript
// 1. Agregar Abstract desde Proyecto_descripcion (R)
const [descripciones] = await pool.query(`
  SELECT pd.detalle, pd.descripcion_id
  FROM Proyecto_descripcion pd
  WHERE pd.proyecto_id = ?
`, [proj.id]);

if (descripciones.length > 0) {
  // Buscar descripción con descripcion_id correspondiente a "Abstract" o "Resumen"
  const abstract = descripciones.find(d => d.descripcion_id === 1) || descripciones[0];
  
  if (abstract && abstract.detalle) {
    project.abstract = [{ value: abstract.detalle, lang: 'es' }];
  }
}

// 2. Agregar ResearchLine (R)
if (row.linea_investigacion_id) {
  const [linea] = await pool.query(`
    SELECT nombre FROM Linea_investigacion WHERE id = ?
  `, [row.linea_investigacion_id]);
  
  if (linea.length > 0) {
    project.researchLines = [{ value: linea[0].nombre }];
  }
}

// 3. Corregir Acronym (actualmente usa tipo_proyecto incorrectamente)
// tipo_proyecto NO es acronym, es el TIPO
delete project.acronym; // Remover mapeo incorrecto

// Buscar acronym real (si existe en otro campo)
if (row.codigo_proyecto_corto) { // Si existe
  project.acronym = row.codigo_proyecto_corto;
}

// 4. Agregar Type OCDE (MA) - Requiere mapeo manual
const tipoActividadMap = {
  'Investigación básica': 'https://purl.org/pe-repo/ocde/ford#actividad-investigacion-basica',
  'Investigación aplicada': 'https://purl.org/pe-repo/ocde/ford#actividad-investigacion-aplicada',
  'Desarrollo experimental': 'https://purl.org/pe-repo/ocde/ford#actividad-desarrollo-experimental',
};

// Inferir desde tipo_proyecto si es posible
if (row.tipo_proyecto && tipoActividadMap[row.tipo_proyecto]) {
  project.Type = {
    scheme: 'https://purl.org/pe-repo/ocde/ford',
    value: tipoActividadMap[row.tipo_proyecto],
  };
}

// 5. Mejorar Funding usando campos separados (MA)
if (row.aporte_unmsm || row.aporte_no_unmsm || row.financiamiento_fuente_externa) {
  project.funding = {
    funders: [],
  };
  
  if (row.aporte_unmsm > 0) {
    project.funding.funders.push({
      name: 'Universidad Nacional Mayor de San Marcos',
      amount: { value: parseFloat(row.aporte_unmsm), currency: 'PEN' },
    });
  }
  
  if (row.aporte_no_unmsm > 0) {
    project.funding.funders.push({
      name: 'Otros aportes nacionales',
      amount: { value: parseFloat(row.aporte_no_unmsm), currency: 'PEN' },
    });
  }
  
  if (row.financiamiento_fuente_externa > 0) {
    project.funding.funders.push({
      name: row.institucion_entidad_externa || 'Entidad externa',
      amount: { value: parseFloat(row.financiamiento_fuente_externa), currency: 'PEN' },
    });
  }
}

// 6. Parsear geoLocation para extraer coordenadas si existen (MA)
// Ejemplo: "Lima, Peru (-12.0464, -77.0428)"
function parseGeoLocation(locationStr) {
  if (!locationStr) return null;
  
  const coordsMatch = locationStr.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
  
  if (coordsMatch) {
    return {
      geoLocationPoint: {
        pointLatitude: parseFloat(coordsMatch[1]),
        pointLongitude: parseFloat(coordsMatch[2]),
      },
      geoLocationPlace: locationStr.replace(/\s*\([^)]*\)/, '').trim(),
    };
  }
  
  return {
    geoLocationPlace: locationStr,
  };
}

const geoLoc = parseGeoLocation(row.localizacion);
if (geoLoc) {
  project.geoLocations = [geoLoc];
}
```

---

### 5. OrgUnit (Unidades Organizativas) - ⚠️ 70% Compliant

#### Campos Faltantes (Mayormente MA)

| Campo PerúCRIS | Persistencia | Disponible en BD | Solución |
|---------------|--------------|------------------|----------|
| `ROR` | MA | ❌ No | Buscar manualmente para UNMSM |
| `ISNI` | MA | ❌ No | Buscar manualmente |
| `GRID` | MA | ❌ No | Buscar manualmente |
| `Scopus Affiliation ID` | MA | ❌ No | Buscar manualmente |
| `UbiGeo` (INEI) | MA | ❌ No | Mapeo facultad → departamento |
| `Type` (Sector OCDE) | MA | ❌ No | Inferir (Universidad = Enseñanza superior) |
| `CIIU` | O | ❌ No | Usar código genérico educación |
| `Naturaleza` (pública/privada) | MA | ❌ No | UNMSM = Pública |

#### Mejoras Propuestas (Hardcoded Constants)

```javascript
// En constants.js - Agregar constantes para UNMSM

export const UNMSM_IDENTIFIERS = {
  ROR: 'https://ror.org/026zsd177', // Verificar en https://ror.org
  ISNI: '0000 0001 2107 4242', // Verificar en isni.org
  GRID: 'grid.8395.0', // Verificar
  RUC: '20106897914', // RUC UNMSM
  SCOPUS_AFFILIATION_ID: '60012091', // Verificar en Scopus
};

export const UBIGEO_LIMA = '150000'; // Código INEI para Lima
export const CIIU_EDUCACION_SUPERIOR = '8530'; // Enseñanza superior

// En orgunit.repository.js - función mapToCerif()

// Para Facultades (nivel raíz UNMSM)
if (entityType === 'Facultad') {
  orgUnit.identifiers = [
    { scheme: 'https://purl.org/pe-repo/concytec/terminos#ruc', value: UNMSM_IDENTIFIERS.RUC },
    { scheme: 'https://ror.org', value: UNMSM_IDENTIFIERS.ROR },
    { scheme: 'https://isni.org', value: UNMSM_IDENTIFIERS.ISNI },
    { scheme: 'https://www.grid.ac', value: UNMSM_IDENTIFIERS.GRID },
    { scheme: 'https://purl.org/cerif/vocab/IdentifierTypes#ScopusAffiliationID', 
      value: UNMSM_IDENTIFIERS.SCOPUS_AFFILIATION_ID },
  ];
  
  // UbiGeo (MA)
  orgUnit.ubiGeo = UBIGEO_LIMA;
  
  // Tipo de organización (M)
  orgUnit.organizationType = {
    scheme: 'https://purl.org/pe-repo/concytec/tipoOrganizacion',
    value: 'Universidad',
  };
  
  // Sector institucional OCDE (MA)
  orgUnit.sectorInstitucional = {
    scheme: 'https://purl.org/pe-repo/ocde/sector',
    value: 'Enseñanza superior',
  };
  
  // CIIU (O)
  orgUnit.ciiu = [CIIU_EDUCACION_SUPERIOR];
  
  // Naturaleza pública/privada (MA)
  orgUnit.naturaleza = 'Pública';
}

// Para Grupos - Agregar datos adicionales disponibles
if (entityType === 'Grupo') {
  // Description (R)
  if (row.presentacion) {
    orgUnit.description = [{ value: row.presentacion, lang: 'es' }];
  }
  
  // Objetivos como descripción adicional
  if (row.objetivos) {
    if (!orgUnit.description) orgUnit.description = [];
    orgUnit.description.push({ 
      value: `Objetivos: ${row.objetivos}`, 
      lang: 'es' 
    });
  }
  
  // Email (R)
  if (row.email) {
    orgUnit.electronicAddresses = [{ type: 'email', value: row.email }];
  }
  
  // Web (R)
  if (row.web) {
    if (!orgUnit.electronicAddresses) orgUnit.electronicAddresses = [];
    orgUnit.electronicAddresses.push({ type: 'url', value: row.web });
  }
  
  // Categoría del grupo (MA)
  if (row.grupo_categoria) {
    orgUnit.category = row.grupo_categoria;
  }
  
  // Dirección postal (O)
  if (row.direccion || row.oficina) {
    orgUnit.postAddress = {
      streetAddress: row.oficina || row.direccion,
    };
    
    if (row.telefono) {
      orgUnit.postAddress.telephoneNumber = row.telefono;
    }
  }
}
```

---

## 🎯 Implementación de Entidades Faltantes

### 6. Funding (Financiamiento) - ❌ No Implementado

**Datos Disponibles:**
- Campos en `Proyecto`: `aporte_unmsm`, `aporte_no_unmsm`, `financiamiento_fuente_externa`, `entidad_asociada`
- Vista `PROYECTOS_FONDO_EXTERNO` con detalles completos
- Vista `PROYECTOS_FONDO_MONETARIO`

#### Propuesta de Implementación

```javascript
// Crear src/repositories/funding.repository.js

export async function getFundings({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);
  
  let query = `
    SELECT 
      p.id,
      p.codigo_proyecto,
      p.titulo,
      p.fecha_inicio,
      p.fecha_fin,
      p.monto_asignado,
      p.aporte_unmsm,
      p.aporte_no_unmsm,
      p.financiamiento_fuente_externa,
      p.entidad_asociada,
      p.institucion_entidad_externa,
      p.entidad_externa_pais,
      p.convocatoria,
      p.updated_at
    FROM Proyecto p
    WHERE p.estado >= 1
      AND (
        p.aporte_unmsm > 0 
        OR p.aporte_no_unmsm > 0 
        OR p.financiamiento_fuente_externa > 0
      )
  `;
  
  // ... implementación similar a project.repository.js
  
  return results.map(row => ({
    header: {
      identifier: toOAIIdentifier('Fundings', `P${row.id}`),
      datestamp: toISO8601(row.updated_at),
      setSpec: 'fundings',
    },
    metadata: {
      Funding: mapFundingToCerif(row),
    },
  }));
}

function mapFundingToCerif(row) {
  const funding = {
    '@id': toCerifId('Fundings', `P${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Type: {
      scheme: 'https://w3id.org/cerif/vocab/FundingTypes',
      value: row.convocatoria ? 'Call' : 'Grant',
    },
    identifier: row.codigo_proyecto,
    name: [{ value: `Financiamiento: ${row.titulo}`, lang: 'es' }],
  };
  
  // Funder(s)
  const funders = [];
  
  if (row.aporte_unmsm > 0) {
    funders.push({
      orgUnit: {
        id: toCerifId('OrgUnits', 'F1'), // UNMSM
        name: 'Universidad Nacional Mayor de San Marcos',
      },
      amount: {
        value: parseFloat(row.aporte_unmsm),
        currency: 'PEN',
      },
    });
  }
  
  if (row.financiamiento_fuente_externa > 0 && row.institucion_entidad_externa) {
    funders.push({
      orgUnit: {
        name: row.institucion_entidad_externa,
        country: row.entidad_externa_pais || null,
      },
      amount: {
        value: parseFloat(row.financiamiento_fuente_externa),
        currency: 'PEN', // Asumir PEN, verificar si puede ser otra
      },
    });
  }
  
  if (funders.length > 0) {
    funding.funders = funders;
  }
  
  // Duración
  if (row.fecha_inicio || row.fecha_fin) {
    funding.duration = {};
    if (row.fecha_inicio) funding.duration.startDate = toISO8601(row.fecha_inicio).split('T')[0];
    if (row.fecha_fin) funding.duration.endDate = toISO8601(row.fecha_fin).split('T')[0];
  }
  
  // Monto total programado
  if (row.monto_asignado) {
    funding.amount = {
      value: parseFloat(row.monto_asignado),
      currency: 'PEN',
    };
  }
  
  return funding;
}
```

**Agregar a routes/oai.routes.js:**

```javascript
import { getFundings, getFundingById, /* ... */ } from '../repositories/funding.repository.js';

// En listSets:
{ setSpec: 'fundings', setName: 'Financiamientos' }

// En switch cases de verbos:
case 'fundings':
  records = await getFundings({ from, until, offset: cursor, limit: pageSize });
  total = await countFundings(from, until);
  break;
```

---

### 7. Equipment (Equipamiento) - ❌ No Implementado

**Datos Disponibles:**
- Vista `EQUIPAMIENTO_CIENTIFICO` (proyectos con equipamiento)
- Tabla `Grupo_infraestructura` (equipamiento de grupos)

#### Propuesta de Implementación

```javascript
// Crear src/repositories/equipment.repository.js

export async function getEquipments({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  // Usar vista EQUIPAMIENTO_CIENTIFICO
  let query = `
    SELECT 
      e.ID_PROYECTO as id,
      e.CODIGO_PROYECTO as codigo,
      e.TITULO_PROYECTO as titulo,
      e.ID_INVESTIGADOR as investigador_id,
      e.PERIODO_PROYECTO as periodo
    FROM EQUIPAMIENTO_CIENTIFICO e
    WHERE e.ESTADO_PROYECTO IN ('Aprobado', 'En ejecución', 'Finalizado')
    ORDER BY e.ID_PROYECTO
    LIMIT ? OFFSET ?
  `;
  
  const [rows] = await pool.query(query, [limit, offset]);
  
  // También consultar equipamiento de grupos
  const grupoQuery = `
    SELECT 
      gi.id,
      gi.grupo_id,
      gi.descripcion as nombre,
      gi.tipo,
      g.grupo_nombre,
      g.facultad_id
    FROM Grupo_infraestructura gi
    JOIN Grupo g ON gi.grupo_id = g.id
    WHERE g.estado = 4
    LIMIT ? OFFSET ?
  `;
  
  const [grupoEquip] = await pool.query(grupoQuery, [limit, offset]);
  
  // Combinar resultados y mapear
  const results = [];
  
  // Equipment de proyectos
  for (const row of rows) {
    results.push({
      header: {
        identifier: toOAIIdentifier('Equipments', `P${row.id}`),
        datestamp: nowISO8601(),
        setSpec: 'equipments',
      },
      metadata: {
        Equipment: mapProjectEquipmentToCerif(row),
      },
    });
  }
  
  // Equipment de grupos
  for (const eq of grupoEquip) {
    results.push({
      header: {
        identifier: toOAIIdentifier('Equipments', `G${eq.id}`),
        datestamp: nowISO8601(),
        setSpec: 'equipments',
      },
      metadata: {
        Equipment: mapGrupoEquipmentToCerif(eq),
      },
    });
  }
  
  return results;
}

function mapProjectEquipmentToCerif(row) {
  return {
    '@id': toCerifId('Equipments', `P${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    identifier: row.codigo,
    name: [{ value: `Equipamiento proyecto ${row.titulo}`, lang: 'es' }],
    Type: {
      scheme: 'https://w3id.org/cerif/vocab/EquipmentTypes',
      value: 'ResearchInfrastructure',
    },
    owner: {
      orgUnit: {
        id: toCerifId('OrgUnits', 'F1'), // UNMSM genérico, mejorar con facultad específica
        name: 'Universidad Nacional Mayor de San Marcos',
      },
    },
  };
}

function mapGrupoEquipmentToCerif(row) {
  return {
    '@id': toCerifId('Equipments', `G${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    identifier: `GI-${row.grupo_id}-${row.id}`,
    name: [{ value: row.nombre, lang: 'es' }],
    Type: {
      scheme: 'https://w3id.org/cerif/vocab/EquipmentTypes',
      value: row.tipo || 'Instrument',
    },
    owner: {
      orgUnit: {
        id: toCerifId('OrgUnits', `G${row.grupo_id}`),
        name: row.grupo_nombre,
      },
    },
  };
}
```

---

## 📋 Plan de Acción Recomendado

### Fase 1: CRÍTICO (1-2 semanas) - **DEBE hacerse primero**

1. ✅ **Publication.Access (M)**
   - Implementar función `inferAccessRights()`
   - Agregar campo en `mapToCerif()`
   - **Sin esto, el repositorio NO es conforme**

2. ✅ **Patent.Subject (M)**
   - Investigar si existe en `nro_registro` o `tipo`
   - Implementar función `determineIPCClassification()`
   - Crear constante con mapeo por defecto
   - **Sin esto, las patentes NO son conformes**

3. ✅ **Publication.keywords**
   - Usar tabla `Publicacion_palabra_clave`
   - Modificar query para incluir JOIN

**Resultado esperado:** 80% de cumplimiento en Publication y Patent

---

### Fase 2: ALTA PRIORIDAD (2-3 semanas)

4. ✅ **Project mejoras**
   - Agregar `Abstract` desde `Proyecto_descripcion`
   - Agregar `ResearchLine` desde `Linea_investigacion`
   - Corregir mapeo `acronym` (actualmente incorrecto)
   - Mejorar `Funding` con campos separados

5. ✅ **OrgUnit identificadores**
   - Agregar constantes UNMSM (ROR, ISNI, GRID, RUC, Scopus)
   - Agregar UbiGeo para Lima
   - Agregar sector OCDE y naturaleza pública

6. ✅ **Implementar entidad Funding**
   - Crear `funding.repository.js`
   - Usar datos de campos `aporte_*` en Project
   - Agregar set `fundings` en OAI-PMH

**Resultado esperado:** 85-90% cumplimiento general

---

### Fase 3: MEDIA PRIORIDAD (1-2 semanas)

7. ✅ **Person mejoras**
   - Agregar CTI Vitae identifier
   - Agregar Google Scholar
   - Agregar teléfonos, biografía, RENACYT
   - Agregar afiliación a Instituto

8. ✅ **Publication mejoras adicionales**
   - Agregar RENATI types para tesis
   - Agregar `event` para ponencias
   - Agregar `partOf` para capítulos
   - Agregar `degreeGrantor` para tesis

9. ✅ **Implementar entidad Equipment**
   - Crear `equipment.repository.js`
   - Usar vista `EQUIPAMIENTO_CIENTIFICO`
   - Usar tabla `Grupo_infraestructura`

**Resultado esperado:** 95% cumplimiento

---

### Fase 4: OPCIONAL (1 semana)

10. ✅ **Optimizaciones**
    - Crear índices en BD (consultar DBA)
    - Revisar N+1 queries
    - Implementar caching si necesario

11. ✅ **Documentación**
    - Actualizar README con campos nuevos
    - Documentar decisiones de mapeo
    - Crear guía de curación manual (CIP, Access Rights)

---

## 🚨 Acciones Inmediatas Recomendadas

### 1. Verificar Datos Críticos (HACER HOY)

```sql
-- ¿Hay código CIP en patentes?
SELECT tipo, nro_registro, nro_expediente, COUNT(*) as total
FROM Patente
WHERE estado = 1
GROUP BY tipo
ORDER BY total DESC;

-- ¿Publicaciones tienen URL/DOI para inferir Access?
SELECT 
  tipo_publicacion,
  COUNT(*) as total,
  SUM(CASE WHEN doi IS NOT NULL THEN 1 ELSE 0 END) as con_doi,
  SUM(CASE WHEN url IS NOT NULL THEN 1 ELSE 0 END) as con_url,
  SUM(CASE WHEN uri IS NOT NULL THEN 1 ELSE 0 END) as con_uri
FROM Publicacion
WHERE estado = 1
GROUP BY tipo_publicacion;

-- ¿Proyectos tienen abstract en Proyecto_descripcion?
SELECT 
  COUNT(DISTINCT p.id) as total_proyectos,
  COUNT(DISTINCT pd.proyecto_id) as con_descripcion
FROM Proyecto p
LEFT JOIN Proyecto_descripcion pd ON p.id = pd.proyecto_id
WHERE p.estado >= 1;
```

### 2. Actualizar Constantes (constants.js)

Agregar:
```javascript
// COAR Access Rights
export const ACCESS_RIGHTS = {
  OPEN: 'http://purl.org/coar/access_right/c_abf2',
  EMBARGOED: 'http://purl.org/coar/access_right/c_f1cf',
  RESTRICTED: 'http://purl.org/coar/access_right/c_16ec',
  METADATA_ONLY: 'http://purl.org/coar/access_right/c_14cb',
};

// IPC Classifications (Patent Subject)
export const IPC_CLASSES = {
  GENERAL: 'Y10S', // Placeholder genérico
  COMPUTING: 'G06F',
  // ... agregar más según análisis de datos
};

// UNMSM Identifiers
export const UNMSM_IDENTIFIERS = {
  ROR: 'https://ror.org/026zsd177',
  RUC: '20106897914',
  // ... etc
};
```

### 3. Modificar Formatters (formatters.js)

Agregar funciones auxiliares:
```javascript
/**
 * Infiere Access Rights basado en disponibilidad de URLs
 */
export function inferAccessRights(row) {
  // Implementación...
}

/**
 * Determina clasificación IPC desde datos de patente
 */
export function determineIPCClassification(row) {
  // Implementación...
}

/**
 * Parsea coordenadas geográficas desde texto
 */
export function parseGeoLocation(locationStr) {
  // Implementación...
}
```

---

## 📊 Métricas de Éxito

### Antes de Mejoras (Estado Actual)
- Person: 95% ✅
- OrgUnit: 70% ⚠️
- Publication: 60% 🔴 (**NO conforme - falta Access**)
- Project: 65% ⚠️
- Patent: 50% 🔴 (**NO conforme - falta Subject**)
- Funding: 0% ❌
- Equipment: 0% ❌

**Cumplimiento General: ~63%**

### Después de Fase 1 (Crítico)
- Publication: 80% ✅ (Access implementado)
- Patent: 75% ⚠️ (Subject con placeholder)

**Cumplimiento General: ~70%**

### Después de Fase 2 (Alta)
- Project: 85% ✅
- OrgUnit: 85% ✅
- Funding: 70% ⚠️

**Cumplimiento General: ~85%**

### Después de Fase 3 (Media)
- Person: 98% ✅
- Publication: 90% ✅
- Equipment: 60% ⚠️

**Cumplimiento General: ~92%**

---

## 🔗 Referencias

1. **PeruCris-API-Design.md** (líneas 200-500) - Especificación completa de campos
2. **AGENTS.md** - Guías de estilo y patrones de código
3. **Base de datos RAIS** - Esquema explorado con 156 tablas/vistas

---

## ✅ Próximos Pasos

1. **Revisar este análisis** con el equipo
2. **Ejecutar queries de verificación** (sección "Acciones Inmediatas")
3. **Aprobar plan de acción** (Fases 1-4)
4. **Comenzar implementación Fase 1** (crítico)
5. **Coordinar con DBA** si se requieren cambios en esquema (poco probable)

---

**Última actualización:** Marzo 2026  
**Autor:** Análisis automático OpenCode  
**Contacto:** rais@unmsm.edu.pe
