# AGENTS.md - Guía para Agentes de IA

> **Proyecto:** RAIS-API - OAI-PMH 2.0 con perfil CERIF PerúCRIS 1.1 (CONCYTEC)  
> **Institución:** Universidad Nacional Mayor de San Marcos (UNMSM)  
> **Stack:** Node.js v24+ | Express v5 | MySQL 8.0+ | Zod | pnpm

---

## 1. Comandos Esenciales

### Instalación y Desarrollo

```bash
# Instalar dependencias (usar pnpm, no npm)
pnpm install

# Iniciar servidor en modo producción
pnpm start

# Iniciar servidor en modo desarrollo con hot-reload (Node.js --watch)
pnpm dev
```

### Ejecutar Servidor

```bash
# El servidor corre en http://localhost:3000
# Endpoint OAI-PMH: http://localhost:3000/oai
# Health check: http://localhost:3000/health
```

### Testing

```bash
# ⚠️ IMPORTANTE: Este proyecto NO tiene framework de testing todavía
# Para pruebas manuales, usar el archivo api.http con REST Client (VSCode)
# Archivo de pruebas: api.http (207 líneas con ejemplos de todos los verbos OAI-PMH)
```

**Cuando se agregue testing en el futuro:**
- Instalar framework recomendado: `vitest` o `node:test` (nativo Node.js v24)
- Tests deben ir en carpeta `src/__tests__/` o archivos `*.test.js`
- Nombrar tests descriptivamente: `person.repository.test.js`

---

## 2. Configuración de Base de Datos

### Credenciales (archivo .env)

```env
DB_HOST=172.16.156.106
DB_PORT=3500
DB_USER=bolsistaRais
DB_PASSWORD=r415bolsista2026
DB_NAME=rais
```

### Conexión

- **Driver:** `mysql2/promise` (async/await)
- **Pool de conexiones:** Max 10 conexiones concurrentes
- **Charset:** utf8mb4
- **Archivo config:** `src/config/database.js`

### Tablas Principales

| Tabla | Entidad CERIF | Descripción |
|-------|---------------|-------------|
| `Usuario_investigador` | Persons | Investigadores (filtrar `estado = 1`) |
| `Facultad` | OrgUnits | Unidades organizativas |
| `Publicacion` | Publications | Publicaciones (filtrar `validado = 1`) |
| `Proyecto` | Projects | Proyectos (filtrar `estado >= 1`) |
| `Patente` | Patents | Patentes (filtrar `estado >= 1`) |

**⚠️ NUNCA modificar la base de datos:** Solo lectura (SELECT). No usar INSERT/UPDATE/DELETE.

---

## 3. Estilo de Código

### 3.1 Imports (ES Modules)

```javascript
// ✅ CORRECTO: ES6 imports con extensión .js SIEMPRE
import express from 'express'
import { env } from './config/env.js'
import pool from '../config/database.js'

// ❌ INCORRECTO: Sin extensión .js
import { env } from './config/env'

// ✅ Named exports e imports
export { toOAIIdentifier, toCerifId }
export async function getPersons() { ... }

// ✅ Default export
export default pool
```

### 3.2 Formato y Estilo

```javascript
// Indentación: 2 espacios (NO tabs)
// Punto y coma: SÍ (siempre al final)
// Comillas: Simples preferidas (''), dobles ("") aceptadas
// Longitud de línea: Máximo 120 caracteres

// ✅ Ejemplo de función bien formateada
export async function mapToCerif(row, affiliation = null) {
  const identifiers = filterEmpty([
    row.codigo_orcid
      ? createIdentifier(IDENTIFIER_SCHEMES.ORCID, `https://orcid.org/${row.codigo_orcid}`)
      : null,
  ]);
  
  return {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    personName: {
      familyNames: formatFamilyNames(row.apellido1, row.apellido2),
      firstNames: row.nombres || '',
    },
  };
}
```

### 3.3 Convenciones de Nombres

```javascript
// Variables y funciones: camelCase
const metadataPrefix = 'perucris-cerif';
async function getPersonById(id) { ... }

// Constantes: UPPER_SNAKE_CASE
const ENTITY_TYPE = 'Persons';
const OAI_DOMAIN = 'rais.unmsm.edu.pe';

// Clases y tipos: PascalCase (si se usan)
class OaiError extends Error { ... }

// Archivos: kebab-case o camelCase
// ✅ person.repository.js, oai-params.schema.js
```

### 3.4 Comentarios y Documentación

```javascript
/**
 * Obtiene personas con paginacion
 * @param {object} options - Opciones de consulta
 * @param {string} options.from - Fecha desde (ISO 8601)
 * @param {string} options.until - Fecha hasta (ISO 8601)
 * @param {number} options.offset - Offset para paginacion
 * @param {number} options.limit - Limite de resultados
 * @returns {Promise<Array>} Array de registros Person con header y metadata
 */
export async function getPersons({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  // Implementación...
}
```

### 3.5 Tipos y Validación

```javascript
// ⚠️ NO usar TypeScript en este proyecto
// ✅ Usar Zod para validación de schemas

import { z } from 'zod';

export const getRecordSchema = z.object({
  verb: z.literal('GetRecord'),
  metadataPrefix: z.enum(['perucris-cerif']),
  identifier: z.string().min(1),
});

// Validar en middleware
const result = schema.safeParse(req.query);
if (!result.success) {
  // Manejar error OAI-PMH
}
```

---

## 4. Arquitectura del Proyecto

### 4.1 Estructura de Carpetas

```
src/
├── config/
│   ├── database.js          # Pool de conexiones MySQL
│   └── env.js               # Variables de entorno con validación Zod
├── middleware/
│   ├── errorHandler.js      # Manejo de errores OAI-PMH
│   └── verbValidator.js     # Validación de parámetros con Zod
├── repositories/
│   ├── person.repository.js    # Queries para Persons
│   ├── orgunit.repository.js   # Queries para OrgUnits
│   ├── publication.repository.js
│   ├── project.repository.js
│   └── patent.repository.js
├── routes/
│   └── oai.routes.js        # Ruta GET /oai con verbos OAI-PMH
├── schemas/
│   └── oai-params.schema.js # Schemas Zod por verbo OAI-PMH
├── services/
│   └── oai/
│       ├── identify.js
│       ├── listMetadataFormats.js
│       ├── listSets.js
│       ├── listIdentifiers.js
│       ├── listRecords.js
│       ├── getRecord.js
│       └── resumptionToken.js
├── utils/
│   ├── constants.js         # Constantes globales (vocabularios, schemes)
│   └── formatters.js        # Funciones de formateo CERIF
└── index.js                 # Entry point del servidor
```

### 4.2 Flujo de Request

```
Request → Express → Middleware (Zod validation)
  → Route Handler → Service (OAI verb logic)
  → Repository (SQL query) → Database
  ← CERIF JSON Response ← Formatter ← Service ← Handler
```

---

## 5. Manejo de Errores

### Códigos OAI-PMH Estándar

```javascript
// Usar estos códigos en respuestas de error:
const OAI_ERRORS = {
  badArgument: 'Argumentos inválidos o faltantes',
  badResumptionToken: 'Token de paginación inválido o expirado',
  badVerb: 'Verbo OAI-PMH no válido',
  cannotDisseminateFormat: 'Formato de metadatos no soportado',
  idDoesNotExist: 'Identificador no encontrado en el repositorio',
  noRecordsMatch: 'No hay registros que coincidan con los criterios',
  noSetHierarchy: 'Set no soportado o no existe',
};

// ✅ Crear error OAI-PMH
import { createOaiError } from '../middleware/errorHandler.js';

const errorResponse = createOaiError(
  'idDoesNotExist',
  'El identificador oai:rais.unmsm.edu.pe:Persons/999999 no existe',
  req.query
);

return res.status(200).json(errorResponse); // ⚠️ Siempre HTTP 200 (estándar OAI-PMH)
```

---

## 6. Directrices PerúCRIS 1.1 (CONCYTEC)

### 6.1 Niveles de Persistencia

| Nivel | Abreviatura | Descripción |
|-------|-------------|-------------|
| **Obligatorio** | `M` | Campo SIEMPRE presente. No se permite vacío. |
| **Obligatorio si aplica** | `MA` | Presente cuando se cumplen condiciones previas. |
| **Recomendado** | `R` | No obligatorio pero exhortado para calidad. |
| **Opcional** | `O` | Puede estar o no. Información complementaria. |

### 6.2 Entidades y Sets OAI-PMH

| Entity Type | Set OAI-PMH | Tabla BD | ID Format |
|-------------|-------------|----------|-----------|
| Persons | `persons` | Usuario_investigador | `Persons/{id}` |
| OrgUnits | `orgunits` | Facultad | `OrgUnits/F{id}` o `OrgUnits/G{id}` |
| Publications | `publications` | Publicacion | `Publications/{id}` |
| Projects | `projects` | Proyecto | `Projects/{id}` |
| Patents | `patents` | Patente | `Patents/{id}` |

### 6.3 Identificadores Estándar (Schemes)

```javascript
// Usar estas URIs para identificadores (ver utils/constants.js)
const IDENTIFIER_SCHEMES = {
  // Persons
  DNI: 'http://purl.org/pe-repo/concytec/terminos#dni',
  ORCID: 'https://orcid.org',
  SCOPUS_AUTHOR_ID: 'https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID',
  RESEARCHER_ID: 'https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID',
  
  // OrgUnits
  RUC: 'https://purl.org/pe-repo/concytec/terminos#ruc',
  ROR: 'https://ror.org',
  
  // Publications
  DOI: 'DOI',
  HANDLE: 'Handle',
  ISSN: 'ISSN',
  
  // Projects
  PROJECT_CODE: 'https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference',
};
```

### 6.4 Formato de Fechas

```javascript
// ✅ SIEMPRE usar ISO 8601 (W3CDTF)
import { toISO8601, parseFilterDate } from '../utils/formatters.js';

// Ejemplos válidos:
'2026-03-18T15:30:00Z'  // Completo con hora (preferido)
'2026-03-18'            // Solo fecha (aceptado para filtros from/until)
```

---

## 7. Reglas de Negocio Importantes

### Filtros por Estado

```sql
-- Persons: Solo activos
WHERE estado = 1

-- Publications: Solo validadas/públicas
WHERE validado = 1

-- Projects: Estados >= 1 (Aprobado, En ejecución, Finalizado)
WHERE estado >= 1

-- Patents: Solo registradas
WHERE estado >= 1

-- OrgUnits: Facultades todas, Institutos/Grupos solo activos
WHERE estado >= 1  -- (para institutos y grupos)
```

### Paginación

```javascript
// Tamaño de página por defecto: 100 registros
const PAGE_SIZE = 100; // Ver .env

// Usar resumptionToken para páginas siguientes
// Token codifica: { cursor, set, metadataPrefix, from, until }
```

---

## 8. Patrones de Código Comunes

### 8.1 Repository Pattern

```javascript
// Estructura típica de un repository

export async function getEntities({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);
  
  let query = `
    SELECT e.*
    FROM Entidad e
    WHERE e.estado = 1
  `;
  
  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }
  
  query += ` ORDER BY e.id LIMIT ? OFFSET ?`;
  
  const params = [...dateFilter.params, limit, offset];
  const [rows] = await pool.query(query, params);
  
  return rows.map(row => ({
    header: {
      identifier: toOAIIdentifier('Entities', row.id),
      datestamp: toISO8601(row.updated_at),
      setSpec: 'entities',
    },
    metadata: {
      Entity: mapToCerif(row),
    },
  }));
}
```

### 8.2 Formatter para CERIF

```javascript
// Siempre filtrar campos vacíos antes de retornar
function mapToCerif(row) {
  const person = {
    '@id': toCerifId('Persons', row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    personName: {
      familyNames: formatFamilyNames(row.apellido1, row.apellido2),
      firstNames: row.nombres || '',
    },
  };
  
  // Solo agregar campos con valores
  if (row.email) {
    person.emails = [row.email];
  }
  
  return person;
}
```

---

## 9. Referencias y Documentación

### Documentos Clave

- **PeruCris-API-Design.md** (1088 líneas): Especificación completa PerúCRIS 1.1
- **README.md**: Guía de usuario y endpoints
- **api.http**: 200+ ejemplos de requests para testing manual

### Vocabularios Controlados

- **COAR Resource Types:** http://purl.org/coar/resource_type/
- **OCDE Fields (FORD):** https://purl.org/pe-repo/ocde/ford
- **RENATI Types:** https://purl.org/pe-repo/renati/type

### Namespace Principal

```
metadataPrefix: perucris-cerif
namespace: https://purl.org/pe-repo/perucris/cerif
```

---

## 10. Checklist para Nuevas Funcionalidades

Antes de implementar nuevas features, verificar:

- [ ] ¿Cumple con niveles de persistencia PerúCRIS (M, MA, R, O)?
- [ ] ¿Usa vocabularios controlados correctos (COAR, OCDE, etc.)?
- [ ] ¿Identifiers usan schemes URI oficiales?
- [ ] ¿Fechas en formato ISO 8601?
- [ ] ¿Queries SQL usan parámetros (NO string concatenation)?
- [ ] ¿Manejo de errores con códigos OAI-PMH estándar?
- [ ] ¿Validación con Zod schemas?
- [ ] ¿Comentarios JSDoc en funciones públicas?
- [ ] ¿Imports con extensión .js?
- [ ] ¿Respeta estructura de carpetas existente?

---

**Última actualización:** Marzo 2026  
**Versión API:** 1.0.0  
**Contacto:** rais@unmsm.edu.pe
