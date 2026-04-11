# AGENTS.md

## Scope and source of truth
- This is a single-package Node API repo (not a monorepo).
- Prefer executable truth over prose: `package.json`, `src/index.js`, `src/utils/constants.js`, `api.http`.
- `README.md` is partially stale (examples: `/api/oai`, `src/server.js`, old structure). Verify behavior in code before changing APIs.

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
- Persons filter: `Usuario_investigador.estado = 1`.
- Publications filter: `Publicacion.estado = 1 AND Publicacion.validado = 1`.
- Projects filter: `Proyecto.estado >= 1`.
- Patents filter: `Patente.estado = 1`.
- OrgUnits logic: Facultad (all), Instituto (`estado = 1`), Grupo (`estado = 4` active).
- Funding is derived from `Proyecto` rows meeting `FUNDING_ELIGIBILITY` in `src/repositories/funding.repository.js`.

## CI and deploy facts
- Only workflow is `.github/workflows/deploy.yml` (AWS deploy on push to `main` for selected paths).
- There is no CI lint/test gate.
- Docker image includes prod deps and copies only `src/`; keep runtime code under `src/`.
