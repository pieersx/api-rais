# RAIS-API: OAI-PMH JSON con PerúCRIS 1.1

Backend API para el **Registro de Actividades de Investigación San Marcos (RAIS)** con cumplimiento total de las **Directrices PerúCRIS 1.1** de CONCYTEC.

## Descripción General

RAIS-API implementa el protocolo **OAI-PMH 2.0** (Open Archives Initiative Protocol for Metadata Harvesting) con respuestas en **JSON** en lugar de XML, y utiliza el perfil de metadatos **CERIF** (Common European Research Information Format) para interoperabilidad con el ecosistema de investigación de CONCYTEC.

### Características principales

- **5 entidades de investigación**: Publicaciones, Proyectos, Patentes, Personas (Investigadores), Unidades Organizativas (Facultades, Institutos, Grupos de Investigación)
- **Protocolo OAI-PMH 2.0**: Soporte completo para los 6 verbos estándar
- **Formato CERIF**: Metadatos estructurados según PerúCRIS 1.1
- **JSON only**: Respuestas en JSON (sin XML)
- **Paginación con resumptionToken**: Manejo eficiente de grandes colecciones
- **Vocabularios controlados**: COAR Resource Types, OCDE Classification
- **Base de datos MySQL**: Lectura desde tablas RAIS existentes (sin modificar)

## Stack Tecnológico

| Componente | Versión |
|---|---|
| **Node.js** | v24.x |
| **Express.js** | v5.x (ES Modules) |
| **MySQL** | 8.0+ |
| **mysql2** | Promise-based queries |
| **Zod** | v4+ Schema validation |
| **pnpm** | Package manager |

## Despliegue en AWS (pruebas)

- Infraestructura Terraform: `infra/terraform/`
- Pipeline CI/CD: `.github/workflows/deploy.yml`
- Guía paso a paso: `docs/aws-deploy.md`
- Scripts de base de datos: `scripts/db/`

## Instalación

### 1. Clonar y dependencias

```bash
git clone <repo-url>
cd rais-api
pnpm install
```

### 2. Configuración de variables de entorno

Crear archivo `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=demo
DB_NAME=rais
NODE_ENV=development
```

O copiar desde plantilla:

```bash
cp .env.example .env
```

### 3. Iniciar servidor

```bash
node src/server.js
```

Servidor corre en `http://localhost:3000`

## Uso de la API

### URL base

```
http://localhost:3000/api/oai?verb=<VERB>&<PARAMS>
```

### 1. Identify

Obtener información del repositorio:

```bash
curl "http://localhost:3000/api/oai?verb=Identify"
```

**Respuesta incluye:**
- Nombre del repositorio
- Protocolo version
- Conteos de cada entidad (59,543 publicaciones, 6,690 proyectos, 406 patentes, 36,455 personas, 492 unidades organizativas)
- Datestamp más antiguo
- Formatos de metadatos soportados

### 2. ListMetadataFormats

Listar formatos de metadatos disponibles:

```bash
curl "http://localhost:3000/api/oai?verb=ListMetadataFormats"
```

**Respuesta:**
```json
{
  "metadataFormats": [
    {
      "metadataPrefix": "oai_cerif",
      "schema": "https://raw.githubusercontent.com/concytec-pe/Peru-CRIS/...",
      "metadataNamespace": "urn:xmlns:org:eurocris:cerif-1.6-2",
      "description": "Perfil CERIF PeruCRIS 1.1"
    }
  ]
}
```

### 3. ListSets

Listar todos los conjuntos (sets) disponibles:

```bash
curl "http://localhost:3000/api/oai?verb=ListSets"
```

**Sets disponibles:**
- `publicacion` — Todas las publicaciones
- `publicacion:articulo`, `publicacion:libro`, `publicacion:tesis`, etc.
- `proyecto` — Todos los proyectos
- `patente` — Todas las patentes
- `persona` — Todos los investigadores
- `orgunit` — Todas las unidades organizativas
- `orgunit:facultad`, `orgunit:instituto`, `orgunit:grupo`
- `facultad:*`, `ocde:*` — Sets por facultad y línea OCDE

### 4. ListIdentifiers

Listar identificadores (headers) de registros con paginación:

```bash
# Primeros 100 identificadores de publicaciones
curl "http://localhost:3000/api/oai?verb=ListIdentifiers&set=publicacion&metadataPrefix=oai_cerif"

# Con resumptionToken para página siguiente
curl "http://localhost:3000/api/oai?verb=ListIdentifiers&resumptionToken=<TOKEN>"
```

**Parámetros opcionales:**
- `set` — Filtrar por conjunto (ej: `publicacion:articulo`)
- `from` — Desde fecha (YYYY-MM-DD)
- `until` — Hasta fecha (YYYY-MM-DD)
- `resumptionToken` — Token de paginación

### 5. ListRecords

Listar registros completos (headers + metadatos) con paginación:

```bash
# Primeros 100 registros completos de publicaciones
curl "http://localhost:3000/api/oai?verb=ListRecords&set=publicacion&metadataPrefix=oai_cerif"

# Registros de un grupo de investigación
curl "http://localhost:3000/api/oai?verb=ListRecords&set=orgunit:grupo&metadataPrefix=oai_cerif"

# Proyectos con estado activo
curl "http://localhost:3000/api/oai?verb=ListRecords&set=proyecto&metadataPrefix=oai_cerif"
```

### 6. GetRecord

Obtener un registro específico por identificador:

```bash
# Publicación
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:publicacion/2&metadataPrefix=oai_cerif"

# Proyecto
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:proyecto/1&metadataPrefix=oai_cerif"

# Patente
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:patente/1&metadataPrefix=oai_cerif"

# Persona (Investigador)
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:persona/1&metadataPrefix=oai_cerif"

# Unidad Organizativa (Facultad)
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:orgunit/facultad-1&metadataPrefix=oai_cerif"

# Unidad Organizativa (Instituto)
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:orgunit/instituto-102&metadataPrefix=oai_cerif"

# Unidad Organizativa (Grupo de Investigación)
curl "http://localhost:3000/api/oai?verb=GetRecord&identifier=oai:rais.unmsm.edu.pe:orgunit/grupo-24&metadataPrefix=oai_cerif"
```

## Estructura de respuestas (CERIF JSON)

### Publicación

```json
{
  "@type": "Publication",
  "Type": {
    "@uri": "http://purl.org/coar/resource_type/c_6501",
    "#text": "journal article"
  },
  "Language": "es",
  "Title": "Ejemplo de publicación",
  "PublicationDate": "2021-01-15",
  "Volume": "10",
  "Issue": "2",
  "Authors": {
    "Author": [
      {
        "DisplayName": "Apellido, Nombre",
        "Person": {
          "@id": "oai:rais.unmsm.edu.pe:persona/123"
        },
        "ORCID": "https://orcid.org/0000-0001-2345-6789"
      }
    ]
  },
  "Identifier": {
    "DOI": "10.1234/example"
  },
  "Subject": ["Línea de investigación"],
  "Keyword": ["palabra1", "palabra2"],
  "Abstract": "Resumen de la publicación...",
  "Status": "Published",
  "Source": {
    "Title": "Nombre de la revista"
  }
}
```

### Proyecto

```json
{
  "@type": "Project",
  "Title": "Nombre del proyecto",
  "Acronym": "SIGLAS",
  "StartDate": "2021-01-01",
  "EndDate": "2023-12-31",
  "Team": {
    "Member": [
      {
        "Role": "PrincipalInvestigator",
        "DisplayName": "Investigador Principal",
        "Person": {
          "@id": "oai:rais.unmsm.edu.pe:persona/123"
        }
      }
    ]
  },
  "OrgUnit": [
    {
      "@id": "oai:rais.unmsm.edu.pe:orgunit/facultad-1",
      "Name": "Nombre Facultad"
    }
  ],
  "Abstract": "Descripción del proyecto..."
}
```

### Persona (Investigador)

```json
{
  "@type": "Person",
  "PersonName": {
    "FamilyNames": "Apellido",
    "FirstNames": "Nombre"
  },
  "Identifier": {
    "ORCID": "https://orcid.org/0000-0001-2345-6789",
    "RENACYT": "P12345"
  },
  "Affiliation": {
    "OrgUnit": {
      "@id": "oai:rais.unmsm.edu.pe:orgunit/facultad-1",
      "Name": "Facultad de Ejemplo"
    }
  },
  "Statistics": {
    "Publications": 25,
    "Projects": 5,
    "Patents": 1
  }
}
```

### Unidad Organizativa (Facultad/Instituto/Grupo)

```json
{
  "@type": "OrgUnit",
  "Type": "Faculty",
  "Name": "Facultad de Ciencias",
  "Acronym": "FC",
  "Identifier": {
    "RORID": "https://ror.org/00rwzpz13"
  },
  "PartOf": {
    "OrgUnit": {
      "Name": "Universidad Nacional Mayor de San Marcos",
      "Identifier": {
        "RORID": "https://ror.org/00rwzpz13"
      }
    }
  },
  "ElectronicAddress": [
    {
      "@type": "email",
      "#text": "contacto@ejemplo.edu.pe"
    }
  ]
}
```

## Reglas de negocio

| Entidad | Filtro | Condición |
|---|---|---|
| **Publicación** | `Publicacion.validado = 1` | Solo registros públicos/validados |
| **Proyecto** | `Proyecto.estado >= 1` | Estados: 1=Aprobado, 2=En ejecución, 3=Finalizado, 4=Cancelado |
| **Patente** | `Patente.estado >= 1` | Solo patentes registradas |
| **Persona** | Todos | Todos los investigadores en `Usuario_investigador` |
| **Unidad Org.** | `Instituto.estado >= 1`, `Grupo.estado >= 1` | Facultades: todas; Institutos/Grupos: solo activos |

## Vocabularios controlados

### Tipos de publicación (COAR Resource Types)

| Tipo local | COAR URI | Label |
|---|---|---|
| articulo | c_6501 | journal article |
| libro | c_3734 | book |
| capitulo | c_3248 | book part |
| tesis | c_db06 | doctoral thesis |
| evento | c_5794 | conference paper |
| resumen_evento | c_8185 | conference poster |
| ensayo | c_6947 | article |
| revisión | c_4317 | review article |

### Clasificación OCDE

Las líneas de investigación de proyectos se mapean a códigos OCDE según estándar internacional.

## Manejo de identificadores

### Formato de identificadores

Todos los identificadores siguen el estándar OAI-PMH:

```
oai:rais.unmsm.edu.pe:<tipo>/<id>
```

**Ejemplos:**

- Publicación: `oai:rais.unmsm.edu.pe:publicacion/2`
- Proyecto: `oai:rais.unmsm.edu.pe:proyecto/1`
- Patente: `oai:rais.unmsm.edu.pe:patente/1`
- Persona: `oai:rais.unmsm.edu.pe:persona/123`
- Facultad: `oai:rais.unmsm.edu.pe:orgunit/facultad-1`
- Instituto: `oai:rais.unmsm.edu.pe:orgunit/instituto-102`
- Grupo: `oai:rais.unmsm.edu.pe:orgunit/grupo-24`

### Paginación

Las respuestas de `ListIdentifiers` y `ListRecords` retornan máximo 100 registros por página. Para obtener más registros, usar el `resumptionToken`:

```json
{
  "resumptionToken": {
    "token": "eyJjdXJzb3IiOjEwMCwic2V0IjoicHVibGljYWNpb24iLCJmcm9tIjpudWxsLCJ1bnRpbCI6bnVsbCwibWV0YWRhdGFQcmVmaXgiOiJvYWlfY2VyaWYifQ",
    "completeListSize": 59543,
    "cursor": 0
  }
}
```

## Estructura del proyecto

```
src/
├── config/
│   └── database.js           # Configuración MySQL pool
├── controllers/
│   └── oai.controller.js     # Punto de entrada HTTP
├── middlewares/
│   └── validateVerb.js       # Validación de parámetros con Zod
├── repositories/
│   ├── publicacion.repository.js    # Queries para publicaciones
│   ├── proyecto.repository.js       # Queries para proyectos
│   ├── patente.repository.js        # Queries para patentes
│   ├── persona.repository.js        # Queries para personas/investigadores
│   └── orgunit.repository.js        # Queries para unidades organizativas
├── services/
│   ├── oai.service.js               # Dispatcher de verbos
│   ├── identify.service.js
│   ├── listMetadataFormats.service.js
│   ├── listSets.service.js
│   ├── listIdentifiers.service.js
│   ├── listRecords.service.js
│   ├── getRecord.service.js
│   ├── cerif.service.js             # Formateos CERIF para 5 entidades
│   └── resumptionToken.js
├── utils/
│   ├── errors.js             # Clases de error OAI-PMH
│   └── oaiIdentifier.js      # Parseo de identificadores
├── routes/
│   └── oai.routes.js         # Ruta GET /api/oai
├── app.js                    # Configuración Express
└── server.js                 # Punto de entrada
```

## Constantes institucionales

```javascript
const UNMSM = {
  nombre: 'Universidad Nacional Mayor de San Marcos',
  ror: 'https://ror.org/00rwzpz13',
  ruc: '20148092282',
  pais: 'PE'
}
```

## Errores y códigos

OAI-PMH define los siguientes códigos de error:

| Código | Significado |
|---|---|
| `badArgument` | Argumentos inválidos |
| `badResumptionToken` | Token de paginación inválido/expirado |
| `badVerb` | Verbo OAI-PMH desconocido |
| `cannotDisseminateFormat` | Formato de metadatos no soportado |
| `idDoesNotExist` | Identificador no encontrado |
| `noRecordsMatch` | Ningún registro coincide con los filtros |
| `noSetHierarchy` | Sets no soportados para esta colección |

## Testing

Ver ejemplos en `api.http` para pruebas rápidas con REST Client de VSCode.

## Documentación adicional

- `PERUCRIS_COMPLIANCE_REPORT.md` — Análisis de cumplimiento con PerúCRIS 1.1
- `Directrices_PerúCRIS_versión 1.1_junio2024.pdf` — Especificación oficial de CONCYTEC

## Responsables

Desarrollado por: [Nombre del equipo]
Institución: Universidad Nacional Mayor de San Marcos
Contacto: rais@unmsm.edu.pe

---

**Última actualización:** Marzo 2026
