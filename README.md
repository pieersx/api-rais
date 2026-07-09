# RAIS API

API Node.js de solo lectura para exponer metadatos RAIS mediante OAI-PMH 2.0 en la adaptacion JSON CERIF/PeruCRIS usada para las pruebas de interoperabilidad con CONCYTEC.

## Estado Actual

- Produccion institucional: `https://rais.unmsm.edu.pe/api/oai`
- Local: `http://localhost:3000/oai`
- Metadata prefix soportado: `perucris-cerif`
- Sets soportados: `persons`, `orgunits`, `fundings`, `equipments`, `projects`, `publications`, `patents`
- La API no modifica la base de datos; todos los repositorios deben consultar con `SELECT`.

## Requisitos

- Node.js `>=24`
- pnpm `10.27.0`
- MySQL `8.0+`

## Instalacion

```bash
pnpm install
```

Copia `.env.example` a `.env` y configura las credenciales de MySQL y datos publicos del repositorio:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=usuario
DB_PASSWORD=clave
DB_NAME=rais
BASE_URL=http://localhost:3000/oai
ADMIN_EMAIL=admin@unmsm.edu.pe
PORT=3000
PAGE_SIZE=100
```

No subas `.env`, `.env.production`, backups, dumps ni archivos de trabajo local.

## Ejecucion

```bash
pnpm dev
```

o en modo normal:

```bash
pnpm start
```

Prueba rapida:

```bash
curl "http://localhost:3000/oai?verb=Identify"
```

## OAI-PMH

La ruta principal es:

```http
GET /oai
```

Verbos soportados:

- `Identify`
- `ListMetadataFormats`
- `ListSets`
- `ListIdentifiers`
- `ListRecords`
- `GetRecord`

Ejemplos:

```http
GET http://localhost:3000/oai?verb=ListRecords&metadataPrefix=perucris-cerif&set=publications
GET http://localhost:3000/oai?verb=GetRecord&metadataPrefix=perucris-cerif&identifier=oai:rais.unmsm.edu.pe:Projects/UNMSM-7368
GET https://rais.unmsm.edu.pe/api/oai?verb=Identify
```

Usa `api.http` para probar local y produccion con los 6 verbos y ejemplos por entidad.

## Entidades

La API expone actualmente:

- `Persons`: investigadores/personas validas para PeruCRIS.
- `OrgUnits`: universidad, facultades, institutos, grupos y unidades segun reglas de exportacion.
- `Fundings`: convocatorias, programas y subvenciones con `Type` OpenAIRE obligatorio.
- `Equipments`: equipamiento CTI, excluyendo bienes comunes o patrimoniales no cientificos.
- `Projects`: proyectos exportables con relaciones y campos obligatorios PeruCRIS.
- `Publications`: publicaciones con identificador real soportado y reglas estrictas para tesis.
- `Patents`: patentes con IPC/CIP real desde `view_patente_ipc`.

## Politica De Datos

- No inventar nombres, identificadores, IPC/CIP, metadatos de tesis, jerarquias ni financiamientos.
- Si un campo obligatorio no existe de forma estructurada en MySQL, se excluye el registro antes que enviar datos sinteticos.
- `exports/` es local e ignorado por git; puede contener SQL/CSV auxiliares para HeidiSQL, pero no forma parte del runtime.
- Las vistas requeridas por la API, como `view_patente_ipc`, deben existir en la base de datos de cada ambiente.

## Validacion Manual

No hay suite automatizada de tests ni scripts de lint/typecheck.

Flujo recomendado:

```bash
pnpm start
curl "http://localhost:3000/oai?verb=Identify"
curl "http://localhost:3000/oai?verb=ListSets"
curl "http://localhost:3000/oai?verb=ListRecords&metadataPrefix=perucris-cerif&set=patents"
```

Tambien valida ejemplos concretos con `api.http`, especialmente:

- `OrgUnits/UNMSM-F1`
- `Fundings/UNMSM-C1`
- `Equipments/UNMSM-9`
- `Projects/UNMSM-7368`
- `Publications/UNMSM-51336`
- `Patents/UNMSM-6`

## Despliegue

El despliegue actual se realiza en el servidor institucional de la universidad. El repositorio ya no contiene scripts de AWS/Terraform ni workflows de despliegue AWS.

En servidor:

```bash
git pull origin main
pnpm install --prod
pnpm start
```

Asegura antes:

- `.env` de produccion configurado en el servidor.
- MySQL accesible desde el servidor.
- vistas necesarias creadas en la base de datos, por ejemplo `view_patente_ipc`.
- proceso Node administrado por el mecanismo del servidor institucional.

## Documentacion

- `docs/Directrices-perucris.md`: directrices PeruCRIS y equivalencias JSON/XML.
- `docs/Guia-para-creacion-apis-json.md`: guia JSON PeruCRIS.
- `docs/api-bd-relaciones.md`: relacion general entre API y tablas RAIS.
- `AGENTS.md`: notas operativas para mantener el mapeo PeruCRIS, decisiones CONCYTEC y reglas de no sintetizar datos.
- `api.http`: pruebas manuales local/produccion.

## Mantenimiento

Al modificar una entidad:

1. Lee primero el repositorio correspondiente en `src/repositories/`.
2. Usa solo datos reales de MySQL o constantes institucionales aprobadas.
3. Actualiza `api.http` si cambia un endpoint, set, identificador o ejemplo.
4. Actualiza `AGENTS.md` si se aprende una regla nueva de CONCYTEC/PeruCRIS.
5. Valida con `pnpm start` y pruebas OAI locales antes de publicar.

## Licencia

MIT. Los datos pertenecen a RAIS/UNMSM y deben tratarse segun las politicas institucionales.
