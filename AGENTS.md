# AGENTS.md

## Scope and source of truth
- This is a single-package Node API repo (not a monorepo).
- Prefer executable truth over prose: `package.json`, `src/index.js`, `src/utils/constants.js`, `api.http`.
- `README.md` is partially stale (examples: `/api/oai`, `src/server.js`, old structure). Verify behavior in code before changing APIs.
- For the current PeruCRIS workstream, also treat these as source-of-truth docs: `docs/Directrices-perucris.md`, `docs/Guia-para-creacion-apis-json.md`, and their PDF twins.

## Current workstream
- The active task is to align the OAI JSON output with CONCYTEC / PeruCRIS review feedback from May 2026.
- Priority order agreed with the user and CONCYTEC: `OrgUnits`, `Persons`, `Fundings`, `Equipments`, `Projects`, `Publications`, `Patents`.
- `Products` is out of scope for this repo/workstream unless the user explicitly reintroduces it.
- The canonical metadata prefix for this implementation is `perucris-cerif`.

## Non-synthetic data policy
- Do not invent funder names, thesis metadata, project hierarchy, publication identifiers, or organization metadata.
- Use only structured data that exists in MySQL or in hardcoded institutional constants already approved in code.
- If PeruCRIS requires a field but the structured source data does not exist, prefer one of these over synthesizing:
- omit the field, if allowed by the guidelines
- exclude the record from the exported feed, if the field is mandatory for interoperability
- Keep repository queries read-only (`SELECT` only).

## Dev commands (exact)
- Install deps: `pnpm install`
- Run dev server (watch mode): `pnpm dev`
- Run server normally: `pnpm start`
- There are no `test`, `lint`, or `typecheck` scripts.
- Manual endpoint checks are in `api.http` (all verbs, sets, and error cases).

## Runtime requirements
- Node `>=24` and `pnpm@10.27.0` (`package.json`).
- ESM-only project (`"type": "module"`): local imports must include `.js` extension.
- Required env vars are validated at startup in `src/config/env.js`: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `BASE_URL` (URL), `ADMIN_EMAIL` (email).
- Defaults: `PORT=3000`, `DB_HOST=localhost`, `DB_PORT=3306`, `PAGE_SIZE=100`.
- `BASE_URL` hostname is used to generate OAI identifiers (`OAI_DOMAIN`).
- DB bootstrap in `src/config/database.js` logs connection failures but does not exit the process.
- The local MySQL used for this workstream is available through `.env` and currently resolves to `localhost:3306`, database `rais`.

## Real request pipeline
- HTTP entrypoint: `src/index.js`
- OAI endpoint: `GET /oai` (`src/routes/oai.routes.js`)
- Validation/middleware: `src/middleware/verbValidator.js`, `src/schemas/oai-params.schema.js`, `src/middleware/errorHandler.js`
- Verb dispatch: `src/services/oai/*.js`
- SQL and CERIF mapping: `src/repositories/*.repository.js`

## OAI-PMH behavior that is easy to miss
- Supported `metadataPrefix`: only `perucris-cerif`.
- Supported sets: `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments`, `patents`.
- Legacy set aliases are still accepted: `funding -> fundings`, `equipment -> equipments`.
- `ListIdentifiers` and `ListRecords` currently require `set` in service logic (even though schema marks it optional).
- If `resumptionToken` is present, do not send `metadataPrefix`, `set`, `from`, or `until`.
- OAI errors are returned as HTTP 200 with OAI error payloads.

## Identifier and entity mapping
- GetRecord parsing expects `oai:<domain>:<EntityType>/<id>` and `EntityType` is case-sensitive.
- Canonical entity types: `Persons`, `OrgUnits`, `Publications`, `Projects`, `Fundings`, `Equipments`, `Patents`.
- Backward-compatible GetRecord entity types also mapped: `Funding`, `Equipment`.
- OrgUnit IDs are mixed-format: root `1`, faculty `F{id}`, institute `I{id}`, group `G{id}`.
- Funding IDs are project-backed: `Fundings/P{id}`.

## Data-layer invariants
- Keep repository queries read-only (SELECTs); this API is built over existing RAIS tables.
- Persons filter for PeruCRIS export: `Usuario_investigador.estado = 1 AND Usuario_investigador.sexo IN ('M', 'F')`.
- Publications base filter: `Publicacion.estado = 1 AND Publicacion.validado = 1`.
- Publications strict PeruCRIS filter currently also requires a real supported identifier from DB, enforced in `src/repositories/publication.repository.js`.
- Projects base filter: `Proyecto.estado >= 1`.
- Projects strict PeruCRIS filter is currently narrower than the base table filter and is enforced in `src/repositories/project.repository.js`.
- Patents filter: `Patente.estado = 1`.
- OrgUnits logic: Facultad (all), Instituto (`estado = 1`), Grupo (`estado = 4` active).
- Funding is project-backed (`Fundings/P{id}`) and derived from `Proyecto` rows that satisfy the strict PeruCRIS funding eligibility in `src/repositories/funding.repository.js`.

## PeruCRIS implementation notes
- `Fundings`, `Projects`, and `Publications` were recently hardened to use only real DB-backed data and to avoid synthetic fallbacks.
- Real funding hierarchy must come from `Convocatoria` and `Convocatoria.parent_id`; current observed max depth is `2`.
- External funder names should come from `Publicacion_proyecto.entidad_financiadora` when there is exactly one real non-`UNMSM` value for the linked project.
- Do not reintroduce synthetic names like `Fuente financiadora externa` or synthetic orgunit ids such as `ExternalFundingSource/{id}`.
- Project abstracts should use only `Proyecto_descripcion.codigo = 'resumen'`, not arbitrary `Proyecto_descripcion.detalle` rows.
- Thesis enrichment in publications should rely first on `Publicacion.tipo_tesis`, `Publicacion.tipo_doc`, and `Publicacion.universidad`.
- `Proyecto_H` exists, but `Publicacion_proyecto.proyecto_h_id` currently has weak coverage for thesis metadata and should not be treated as complete.
- Thesis jurors are not structurally modeled in the current DB. Do not synthesize them from text.
- `Publicacion_revista` exists and can be used to enrich journal container metadata (`ISSN`, `ISSNE`, `revista`, `casa`, `isi`) if needed.

## CONCYTEC corrections implemented (May 24, 2026)
- **PROJECT_TYPE_CONCYTEC_MAP**: Removed `ECI: 'http://purl.org/pe-repo/concytec/terminos#equipamientoCientifico'` mapping as CONCYTEC explicitly rejected this value. Only OCDE project types are now included.
- **Patent structures**: Corrected `Inventors`, `Holders`, and `Issuer` OrgUnit structures for full CERIF compliance:
  - `Inventors.Inventor.Person.PersonName.FullName` instead of `Person.name`
  - `Holders.Holder.OrgUnit.Name` as array of text value entries instead of string
  - `Issuer.OrgUnit.Acronym` and `Issuer.OrgUnit.Name` capitalized and as array of text value entries
- All changes verified with GetRecord and ListRecords OAI-PMH tests; structure is production-ready for CONCYTEC harvesting.

## Real DB coverage discovered during this workstream
- Projects active: `6690`.
- Projects with structured funding data: `5970`.
- Projects with external funding amounts: `317`.
- External projects with a single real non-`UNMSM` funder name recoverable from DB: `104`.
- Fundings currently exported after strict filtering: `6409`.
- Projects currently exported after strict filtering: `2576`.
- Valid publications: `58911`.
- Valid publications with strict supported identifiers currently exportable: `18175`.
- Valid publications without a supported strict identifier (`DOI`, `Handle`, top-level `ISBN`, top-level `ISSN`) are numerous and should remain excluded unless the source data improves.
- Thesis publications: `11424`.
- Thesis publications with `tipo_tesis`: `8916`.
- Thesis publications with `universidad`: `10713`.
- Thesis juror-like structured rows found in `Publicacion_autor`: `0`.

## Important tables for current fixes
- Persons: `Usuario_investigador`
- OrgUnits: `Facultad`, `Instituto`, `Grupo`
- Fundings / Projects: `Proyecto`, `Proyecto_tipo`, `Convocatoria`, `Proyecto_integrante`, `Proyecto_integrante_tipo`, `Proyecto_descripcion`
- Publications: `Publicacion`, `Publicacion_autor`, `Publicacion_palabra_clave`, `Publicacion_proyecto`, `Publicacion_revista`
- Thesis-related publication context: `Publicacion.tipo_tesis`, `Publicacion.tipo_doc`, `Publicacion.universidad`
- Equipments: `Grupo_infraestructura`

## CI and deploy facts
- Only workflow is `.github/workflows/deploy.yml` (AWS deploy on push to `main` for selected paths).
- There is no CI lint/test gate.
- Docker image includes prod deps and copies only `src/`; keep runtime code under `src/`.

## Validation guidance
- There is no automated test suite; validate with repository functions first, then `pnpm start` and manual OAI checks.
- For current PeruCRIS-sensitive entities, prefer validating these paths explicitly:
- `GetRecord` for one representative record of each changed entity
- `ListRecords` for `fundings`, `projects`, and `publications`
- confirm that fields required by CONCYTEC are present with correct casing and that no synthetic fallback values were reintroduced
