# RAIS API OAI-PMH (JSON / PeruCRIS CERIF)

API de interoperabilidad para RAIS usando OAI-PMH 2.0 con respuesta JSON y perfil CERIF PeruCRIS.

## Estado actual

- 6 verbos implementados: `Identify`, `ListMetadataFormats`, `ListSets`, `ListIdentifiers`, `ListRecords`, `GetRecord`.
- Endpoint principal: `GET /oai`.
- Formato principal de cosecha: `metadataPrefix=perucris-cerif`.
- Sets canonicos: `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments`, `patents`.
- Alias legacy aceptados en entrada: `funding -> fundings`, `equipment -> equipments`.

## Requisitos

- Node.js `>=24`
- pnpm `10.27.0`
- MySQL 8+

## Configuracion

Variables requeridas en `.env`:

```env
DB_USER=
DB_PASSWORD=
DB_NAME=
BASE_URL=
ADMIN_EMAIL=
```

Variables con default:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
PAGE_SIZE=100
```

Notas:

- `BASE_URL` define el dominio OAI usado en identifiers (`oai:<dominio>:...`).
- El servicio valida variables al iniciar (`src/config/env.js`).

## Comandos

```bash
pnpm install
pnpm dev
pnpm start
```

No existen scripts de `test`, `lint` o `typecheck`.

## Uso rapido

URL base:

```text
http://localhost:3000/oai
```

Ejemplos:

```bash
# 1) Identify
curl "http://localhost:3000/oai?verb=Identify"

# 2) ListMetadataFormats
curl "http://localhost:3000/oai?verb=ListMetadataFormats"

# 3) ListSets
curl "http://localhost:3000/oai?verb=ListSets"

# 4) ListIdentifiers
curl "http://localhost:3000/oai?verb=ListIdentifiers&metadataPrefix=perucris-cerif&set=publications"

# 5) ListRecords
curl "http://localhost:3000/oai?verb=ListRecords&metadataPrefix=perucris-cerif&set=publications"

# 6) GetRecord
curl "http://localhost:3000/oai?verb=GetRecord&metadataPrefix=perucris-cerif&identifier=oai:rais.unmsm.edu.pe:Publications/68172"
```

## Reglas de validacion importantes

- `ListIdentifiers` y `ListRecords`:
  - solo `metadataPrefix=perucris-cerif`
  - si viene `resumptionToken`, no se permiten `set`, `metadataPrefix`, `from`, `until`
  - `from` y `until` validan rango (`from <= until`)
- `GetRecord`:
  - solo `metadataPrefix=perucris-cerif`
  - `identifier` obligatorio
  - dominio de `identifier` debe coincidir con el dominio del repositorio
  - formato esperado: `oai:<dominio>:<EntityType>/<id>`
  - `EntityType` es case-sensitive (`Persons`, `OrgUnits`, etc.)

## Errores OAI-PMH

Codigos usados por la API:

- `badVerb`
- `badArgument`
- `cannotDisseminateFormat`
- `idDoesNotExist`
- `noRecordsMatch`
- `noSetHierarchy`
- `badResumptionToken`

## Fuente de datos

- API de solo lectura sobre tablas RAIS existentes.
- Logica por entidad en `src/repositories/*.repository.js`.
- Filtros clave:
  - Persons: `Usuario_investigador.estado = 1`
  - Publications: `Publicacion.estado = 1 AND Publicacion.validado = 1`
  - Projects: `Proyecto.estado >= 1`
  - Patents: `Patente.estado = 1`
  - OrgUnits: Facultad (todas), Instituto (`estado = 1`), Grupo (`estado = 4`)

## Estructura del proyecto

- `src/index.js`: entrada HTTP
- `src/routes/oai.routes.js`: despacho de verbos
- `src/middleware/verbValidator.js`: validacion OAI
- `src/middleware/errorHandler.js`: envelope OAI y errores
- `src/services/oai/*.js`: logica por verbo
- `src/repositories/*.repository.js`: consultas y mapping CERIF
- `api.http`: bateria manual de pruebas
- `docs/`: directrices y material de referencia PeruCRIS
- `rais/`: proyecto Laravel RAIS usado como referencia funcional y de datos

## Material para reunion con CONCYTEC

- Resumen ejecutivo: `docs/CONCYTEC-READINESS.md`
- Casos de prueba listos: `api.http`

## Decisiones conocidas

- La API declara `deletedRecord: persistent` en `Identify`, pero no expone aun `header.status = "deleted"` en cosecha.
- En campos opcionales sin fuente confiable en BD, se omite el campo (no se inventan valores).
