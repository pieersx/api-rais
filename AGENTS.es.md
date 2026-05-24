# AGENTS.es.md

## Alcance y fuente de verdad
- Este es un repositorio de un solo paquete Node API (no es un monorepo).
- Prefiere la verdad ejecutable sobre la prosa: `package.json`, `src/index.js`, `src/utils/constants.js`, `api.http`.
- `README.md` está parcialmente desactualizado (ejemplos: `/api/oai`, `src/server.js`, estructura antigua). Verifica el comportamiento en el código antes de cambiar APIs.
- Para la actual línea de trabajo PeruCRIS, también trata estos documentos como fuente de verdad: `docs/Directrices-perucris.md`, `docs/Guia-para-creacion-apis-json.md`, y sus gemelos en PDF.

## Línea de trabajo actual
- La tarea activa es alinear la salida JSON de OAI con la retroalimentación de revisión de CONCYTEC / PeruCRIS de mayo de 2026.
- Orden de prioridad acordado con el usuario y CONCYTEC: `OrgUnits`, `Persons`, `Fundings`, `Equipments`, `Projects`, `Publications`, `Patents`.
- `Products` está fuera del alcance para este repositorio/línea de trabajo a menos que el usuario lo reintroduzca explícitamente.
- El prefijo de metadatos canónico para esta implementación es `perucris-cerif`.

## Política de datos no sintéticos
- No inventes nombres de financiadores, metadatos de tesis, jerarquía de proyectos, o metadatos de organizaciones.
- Usa solo datos estructurados que existan en MySQL o en constantes institucionales codificadas que ya hayan sido aprobadas en el código.
- Si PeruCRIS requiere un campo pero los datos estructurados de origen no existen, prefiere uno de estos sobre sintetizar:
- omite el campo, si está permitido por las directrices
- excluye el registro de la fuente exportada, si el campo es obligatorio para la interoperabilidad
- Mantén las consultas del repositorio de solo lectura (`SELECT` solamente).

## Comandos de desarrollo (exactos)
- Instalar dependencias: `pnpm install`
- Ejecutar servidor de desarrollo (modo vigilancia): `pnpm dev`
- Ejecutar servidor normalmente: `pnpm start`
- No hay scripts de `test`, `lint`, o `typecheck`.
- Las verificaciones manuales de puntos finales están en `api.http` (todos los verbos, conjuntos y casos de error).

## Requisitos de tiempo de ejecución
- Node `>=24` y `pnpm@10.27.0` (`package.json`).
- Proyecto solo ESM (`"type": "module"`): los imports locales deben incluir la extensión `.js`.
- Las variables de entorno requeridas se validan al inicio en `src/config/env.js`: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `BASE_URL` (URL), `ADMIN_EMAIL` (correo electrónico).
- Valores por defecto: `PORT=3000`, `DB_HOST=localhost`, `DB_PORT=3306`, `PAGE_SIZE=100`.
- El nombre de host de `BASE_URL` se utiliza para generar identificadores OAI (`OAI_DOMAIN`).
- El bootstrap de BD en `src/config/database.js` registra fallos de conexión pero no sale del proceso.
- La MySQL local utilizada para esta línea de trabajo está disponible a través de `.env` y actualmente se resuelve a `localhost:3306`, base de datos `rais`.

## Pipeline de solicitud real
- Punto de entrada HTTP: `src/index.js`
- Punto final OAI: `GET /oai` (`src/routes/oai.routes.js`)
- Validación/middleware: `src/middleware/verbValidator.js`, `src/schemas/oai-params.schema.js`, `src/middleware/errorHandler.js`
- Despacho de verbos: `src/services/oai/*.js`
- Mapeo SQL y CERIF: `src/repositories/*.repository.js`

## Comportamiento OAI-PMH que es fácil de pasar por alto
- `metadataPrefix` soportado: solo `perucris-cerif`.
- Conjuntos soportados: `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments`, `patents`.
- Los alias de conjunto legados aún se aceptan: `funding -> fundings`, `equipment -> equipments`.
- `ListIdentifiers` y `ListRecords` actualmente requieren `set` en la lógica del servicio (aunque el esquema lo marca como opcional).
- Si `resumptionToken` está presente, no envíes `metadataPrefix`, `set`, `from`, o `until`.
- Los errores OAI se devuelven como HTTP 200 con cargas de error OAI.

## Mapeo de identificador y entidad
- El análisis de GetRecord espera `oai:<domain>:<EntityType>/<id>` y `EntityType` es sensible a mayúsculas y minúsculas.
- Tipos de entidad canónicos: `Persons`, `OrgUnits`, `Publications`, `Projects`, `Fundings`, `Equipments`, `Patents`.
- Tipos de entidad de GetRecord compatibles hacia atrás también mapeados: `Funding`, `Equipment`.
- Los IDs de OrgUnit tienen formato mixto: raíz `1`, facultad `F{id}`, instituto `I{id}`, grupo `G{id}`.
- Los IDs de Funding están respaldados por proyecto: `Fundings/P{id}`.

## Invariantes de capa de datos
- Mantén las consultas del repositorio de solo lectura (SELECTs); esta API se construye sobre tablas RAIS existentes.
- Filtro de Persons para exportación PeruCRIS: `Usuario_investigador.estado = 1 AND Usuario_investigador.sexo IN ('M', 'F')`.
- Filtro base de Publications: `Publicacion.estado = 1 AND Publicacion.validado = 1`.
- El filtro estricto de PeruCRIS de Publications actualmente también requiere un identificador soportado real de BD, aplicado en `src/repositories/publication.repository.js`.
- Filtro base de Projects: `Proyecto.estado >= 1`.
- El filtro estricto de PeruCRIS de Projects es actualmente más estrecho que el filtro de la tabla base y se aplica en `src/repositories/project.repository.js`.
- Filtro de Patents: `Patente.estado = 1`.
- Lógica de OrgUnits: Facultad (todas), Instituto (`estado = 1`), Grupo (`estado = 4` activo).
- Funding está respaldado por proyecto (`Fundings/P{id}`) y se deriva de filas de `Proyecto` que satisfacen la elegibilidad de financiamiento estricta de PeruCRIS en `src/repositories/funding.repository.js`.

## Notas de implementación de PeruCRIS
- `Fundings`, `Projects`, y `Publications` fueron recientemente endurecidos para usar solo datos respaldados por BD reales y para evitar fallbacks sintéticos.
- La jerarquía de financiamiento real debe provenir de `Convocatoria` y `Convocatoria.parent_id`; la profundidad máxima observada actualmente es `2`.
- Los nombres de financiadores externos deben provenir de `Publicacion_proyecto.entidad_financiadora` cuando existe exactamente un valor real no-`UNMSM` para el proyecto vinculado.
- No reintroduzcas nombres sintéticos como `Fuente financiadora externa` o ids de orgunit sintéticos como `ExternalFundingSource/{id}`.
- Los resúmenes de proyectos deben usar solo `Proyecto_descripcion.codigo = 'resumen'`, no filas arbitrarias de `Proyecto_descripcion.detalle`.
- El enriquecimiento de tesis en publicaciones debe confiar primero en `Publicacion.tipo_tesis`, `Publicacion.tipo_doc`, y `Publicacion.universidad`.
- `Proyecto_H` existe, pero `Publicacion_proyecto.proyecto_h_id` actualmente tiene cobertura débil para metadatos de tesis y no debe tratarse como completo.
- Los jurados de tesis no están modelados estructuralmente en la BD actual. No sintetices jurados a partir de texto.
- `Publicacion_revista` existe y puede usarse para enriquecer metadatos del contenedor de revista (`ISSN`, `ISSNE`, `revista`, `casa`, `isi`) si es necesario.

## Correcciones CONCYTEC implementadas (24 de mayo de 2026)
- **PROJECT_TYPE_CONCYTEC_MAP**: Removido mapeo `ECI: 'http://purl.org/pe-repo/concytec/terminos#equipamientoCientifico'` ya que CONCYTEC rechazó explícitamente este valor. Solo se incluyen ahora tipos de proyecto OCDE.
- **Estructuras de Patents**: Corregidas estructuras `Inventors`, `Holders` e `Issuer` OrgUnit para conformidad CERIF completa:
  - `Inventors.Inventor.Person.PersonName.FullName` en lugar de `Person.name`
  - `Holders.Holder.OrgUnit.Name` como array de entradas de valor de texto en lugar de string
  - `Issuer.OrgUnit.Acronym` e `Issuer.OrgUnit.Name` capitalizados y como array de entradas de valor de texto
- Todos los cambios verificados con pruebas GetRecord y ListRecords de OAI-PMH; la estructura está lista para producción para cosecha de CONCYTEC.

## Cobertura real de BD descubierta durante esta línea de trabajo
- Proyectos activos: `6690`.
- Proyectos con datos de financiamiento estructurados: `5970`.
- Proyectos con montos de financiamiento externo: `317`.
- Proyectos externos con un único nombre de financiador real no-`UNMSM` recuperable de BD: `104`.
- Financiamientos actualmente exportados después de filtrado estricto: `6409`.
- Proyectos actualmente exportados después de filtrado estricto: `2576`.
- Publicaciones válidas: `58911`.
- Publicaciones válidas con identificadores soportados estrictos actualmente exportables: `18175`.
- Las publicaciones válidas sin un identificador estricto soportado (`DOI`, `Handle`, `ISBN` de nivel superior, `ISSN` de nivel superior) son numerosas y deben permanecer excluidas a menos que los datos de origen mejoren.
- Publicaciones de tesis: `11424`.
- Publicaciones de tesis con `tipo_tesis`: `8916`.
- Publicaciones de tesis con `universidad`: `10713`.
- Filas similares a jurados de tesis encontradas en `Publicacion_autor`: `0`.

## Tablas importantes para correcciones actuales
- Persons: `Usuario_investigador`
- OrgUnits: `Facultad`, `Instituto`, `Grupo`
- Fundings / Projects: `Proyecto`, `Proyecto_tipo`, `Convocatoria`, `Proyecto_integrante`, `Proyecto_integrante_tipo`, `Proyecto_descripcion`
- Publications: `Publicacion`, `Publicacion_autor`, `Publicacion_palabra_clave`, `Publicacion_proyecto`, `Publicacion_revista`
- Contexto de publicación relacionado con tesis: `Publicacion.tipo_tesis`, `Publicacion.tipo_doc`, `Publicacion.universidad`
- Equipments: `Grupo_infraestructura`

## Hechos de CI e implementación
- El único flujo de trabajo es `.github/workflows/deploy.yml` (implementación AWS en push a `main` para rutas seleccionadas).
- No hay una puerta de CI lint/test.
- La imagen Docker incluye deps de producción y copia solo `src/`; mantén el código de tiempo de ejecución bajo `src/`.

## Orientación de validación
- No hay una suite de pruebas automatizadas; valida primero con funciones de repositorio, luego `pnpm start` y verificaciones manuales de OAI.
- Para entidades sensibles a PeruCRIS actuales, prefiere validar explícitamente estas rutas:
- `GetRecord` para un registro representativo de cada entidad modificada
- `ListRecords` para `fundings`, `projects`, y `publications`
- confirma que los campos requeridos por CONCYTEC estén presentes con mayúsculas y minúsculas correctas y que ningún valor de fallback sintético haya sido reintroducido
