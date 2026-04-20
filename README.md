# RAIS API

API Node.js/Express de solo lectura para interoperabilidad académica sobre datos RAIS mediante OAI-PMH 2.0 y el perfil CERIF de PerúCRIS.

OAI-PMH es un protocolo XML. Esta API expone una adaptación JSON para facilitar la integración y las pruebas; el XML oficial de PerúCRIS v1.1 sigue siendo la fuente de verdad normativa. La convención JSON usada en este proyecto es:

- atributos XML -> `@`
- texto del nodo -> `#text`

## 1. Descripción del proyecto

- Endpoint principal: `GET /oai`
- Verbos implementados: `Identify`, `ListMetadataFormats`, `ListSets`, `ListIdentifiers`, `ListRecords`, `GetRecord`
- Perfil XML oficial de PeruCRIS v1.1 (canonico): `metadataPrefix=cerif_perucris`, `metadataNamespace=https://purl.org/pe-repo/cerif-profile/1.0/`, `schema=https://purl.org/pe-repo/cerif-profile/1.0/perucris-cerif-profile.xsd`, `setSpec` `perucris_persons`, `perucris_orgunits`, `perucris_publications`, `perucris_projects`, `perucris_fundings`, `perucris_equipments`, `perucris_patents`, `perucris_products`
- Adaptacion JSON documentada para APIs: `metadataPrefix=perucris-cerif`, `metadataNamespace=https://purl.org/pe-repo/perucris/cerif`, sets cortos `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments`, `patents`, `products`
- Sets actualmente expuestos por el backend de este repositorio: `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments`, `patents`
- `Products` sigue siendo una entidad oficial del perfil PeruCRIS y una brecha de implementacion pendiente en el backend; no debe interpretarse como una exclusion del modelo
- Alias legacy aceptados: `funding -> fundings`, `equipment -> equipments`
- API de solo lectura sobre tablas RAIS existentes

Los documentos en `docs/` cubren el marco PerúCRIS más amplio y los equivalentes canónicos del perfil XML. Este repositorio documenta la implementación operativa actual de la API, sin reemplazar la fuente normativa.

## 2. Relación con los documentos (`docs/`)

- `docs/Directrices-perucris.md`: documento de referencia para vocabularios, reglas CERIF, OAI-PMH y equivalentes canónicos del XML oficial. Si existe duda normativa o una diferencia entre XML y JSON, prevalece este documento.
- `docs/Guia-para-creacion-apis-json.md`: guía de implementación JSON y ejemplos de respuestas OAI-PMH representadas como JSON. Ayuda a entender la proyección del XML a JSON.
- `README.md`: guía práctica de este repositorio. Explica cómo configurar, ejecutar y consumir la implementación actual sin duplicar el contenido normativo.

Nota de interoperabilidad:

- Perfil XML oficial canonico: `metadataPrefix=cerif_perucris`, `metadataNamespace=https://purl.org/pe-repo/cerif-profile/1.0/`, `schema=https://purl.org/pe-repo/cerif-profile/1.0/perucris-cerif-profile.xsd`, `setSpec` `perucris_*`.
- Adaptacion JSON documentada para este repositorio: `metadataPrefix=perucris-cerif`, `metadataNamespace=https://purl.org/pe-repo/perucris/cerif`, sets cortos del modelo como `persons`, `projects` y `products`; en la exposicion efectiva del backend actual siguen publicandose solo 7 sets.
- La adaptacion JSON facilita integracion y pruebas, pero no sustituye ni redefine el perfil XML oficial de PeruCRIS.
- Para validacion formal contra PeruCRIS, revisar siempre `docs/Directrices-perucris.md` y `docs/Guia-para-creacion-apis-json.md`.

## 3. Requisitos

- Node.js `>=24`
- pnpm `10.27.0`
- MySQL 8+

Comandos disponibles:

```bash
pnpm install
pnpm dev
pnpm start
```

No existen scripts de `test`, `lint` o `typecheck`. Las verificaciones manuales están en `api.http`.

## 4. Configuración

1. Copiar `.env.example` a `.env`.
2. Configurar las variables requeridas.
3. Asegurar que `BASE_URL` apunte al endpoint publico OAI de la instancia.

Variables requeridas:

```env
DB_USER=
DB_PASSWORD=
DB_NAME=
BASE_URL=http://localhost:3000/oai
ADMIN_EMAIL=
```

Variables con valor por defecto:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
PAGE_SIZE=100
```

Notas de configuración:

- `BASE_URL` debe ser una URL valida y su hostname se usa para construir identifiers OAI con la forma `oai:<dominio>:<Entidad>/<id>`.
- Las variables de entorno se validan al iniciar en `src/config/env.js`.
- Si faltan variables requeridas o tienen formato inválido, la aplicación no inicia.

## 5. Uso rápido

Iniciar en local:

```bash
pnpm install
pnpm dev
```

Endpoint base local:

```text
http://localhost:3000/oai
```

Ejemplos `curl`:

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

# 7) Cosecha incremental
curl "http://localhost:3000/oai?verb=ListIdentifiers&metadataPrefix=perucris-cerif&set=persons&from=2024-01-01&until=2024-12-31"

# 8) Continuacion por resumptionToken
curl "http://localhost:3000/oai?verb=ListIdentifiers&resumptionToken=TOKEN_DEVUELTO_POR_LA_RESPUESTA_ANTERIOR"
```

Endpoints auxiliares:

```bash
curl "http://localhost:3000/health"
curl "http://localhost:3000/"
```

## 6. Reglas OAI-PMH (resumidas)

- OAI-PMH sigue siendo XML; el JSON de esta API es una representacion operativa, no un reemplazo del XML oficial.
- La convencion de serializacion JSON es estable en este proyecto: atributos XML con `@` y texto del nodo con `#text`.
- En la adaptacion JSON de esta documentacion, `Person`, `OrgUnit`, `Project`, `Funding` y `Equipment` suelen modelar `identifiers` como pares `scheme` + `value`; `Publication` usa `type` + `value` para reflejar elementos XML dedicados como `DOI`, `ISSN` o `Handle`.
- Para interoperabilidad formal PeruCRIS, el valor canonico XML es `metadataPrefix=cerif_perucris`; la implementacion actual del repositorio opera con la adaptacion JSON `metadataPrefix=perucris-cerif`.
- `ListMetadataFormats` expone `oai_dc` y `perucris-cerif` en la adaptacion JSON operativa de este repositorio.
- `ListIdentifiers` y `ListRecords` aceptan `metadataPrefix`, `set`, `from`, `until` y `resumptionToken`; en la logica actual, `set` es obligatorio cuando no se usa token.
- Si se envia `resumptionToken`, no se deben reenviar `metadataPrefix`, `set`, `from` ni `until`.
- En paginacion, `resumptionToken.#text` no vacio significa que hay mas paginas; si llega vacio, la cosecha termino.
- `from` y `until` deben estar en formato ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDThh:mm:ssZ`) y cumplir `from <= until`.
- `GetRecord` requiere `metadataPrefix=perucris-cerif` e `identifier`.
- El formato de identifier es `oai:<dominio>:<Entidad>/<id>`; el dominio debe coincidir con el hostname de `BASE_URL`.
- El segmento `<Entidad>` es sensible a mayusculas/minusculas. La implementacion actual expone `Persons`, `OrgUnits`, `Publications`, `Projects`, `Fundings`, `Equipments` y `Patents`; el perfil XML oficial tambien define `Products` como entidad canonica del modelo.
- `GetRecord` mantiene compatibilidad hacia atras para `Funding` y `Equipment` como aliases de entidad.
- Los IDs internos no siempre son uniformes: por ejemplo `OrgUnits/1`, `OrgUnits/F1`, `OrgUnits/I2` y `OrgUnits/G24`.
- En el perfil PeruCRIS el contenedor de financiamiento sigue siendo `Fundings/{id}`; en esta implementacion el identificador interno actual es project-backed, por ejemplo `Fundings/P13892`.
- Los sets actualmente soportados por esta API son `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments` y `patents`; el set `products` pertenece al modelo documental PeruCRIS, pero sigue pendiente de exposicion en el backend. Tambien se aceptan los aliases `funding` y `equipment`.
- Los errores OAI-PMH se devuelven como payload OAI con HTTP 200. Para la semantica normativa de cada codigo y sus ejemplos, ver `docs/Directrices-perucris.md`.

## 7. Estructura del proyecto

- `src/index.js`: entrada HTTP, rutas auxiliares y montaje de `GET /oai`
- `src/config/env.js`: validación de entorno y configuración del repositorio OAI
- `src/config/database.js`: pool MySQL y prueba inicial de conexión
- `src/routes/oai.routes.js`: despacho de verbos OAI-PMH
- `src/middleware/`: validación de parámetros y envelope de errores OAI
- `src/schemas/oai-params.schema.js`: esquemas de query params por verbo
- `src/services/oai/`: logica por verbo y manejo de `resumptionToken`
- `src/repositories/`: consultas `SELECT` y mapping CERIF desde RAIS
- `src/utils/constants.js`: namespaces, formatos, sets y constantes compartidas
- `api.http`: batería manual de pruebas para verbos, sets y errores
- `docs/`: directrices PerúCRIS y guía de implementación JSON
- `database/` e `infra/`: recursos de apoyo para datos y despliegue

## 8. Decisiones técnicas

- El XML oficial de PerúCRIS v1.1 es la fuente de verdad; el JSON expuesto por esta API es una representación práctica para integración.
- La API no inventa campos ni completa datos faltantes: cuando no hay una fuente confiable para un campo opcional, el campo se omite.
- La capa de repositorio es de solo lectura y debe mantenerse sobre consultas `SELECT`.
- `Identify` declara `deletedRecord: persistent`, pero la cosecha actual todavia no expone `header.status="deleted"`.
- El hostname de `BASE_URL` se reutiliza para generar los identifiers OAI.
- La inicialización de base de datos registra errores de conexión en logs, pero no finaliza el proceso automáticamente.
- El proyecto es ESM-only (`"type": "module"`), por lo que los imports locales deben incluir extensión `.js`.
- El runtime debe mantenerse bajo `src/`, porque la imagen Docker copia ese árbol para ejecución.
