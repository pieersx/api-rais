# Estado de Preparacion para Reunion CONCYTEC

Fecha: 2026-04-12

## 1) Objetivo

Exponer RAIS por OAI-PMH para cosecha operativa con representación JSON alineada con PeruCRIS, manteniendo al XML oficial como referencia normativa.

> **Nota:** Este documento resume el estado operativo de la implementación actual. La fuente de verdad normativa sigue siendo `docs/Directrices-perucris.md`, y la adaptación JSON de referencia está en `docs/Guia-para-creacion-apis-json.md`.

Endpoint base:

```text
GET https://rais.unmsm.edu.pe/api/oai
```

## 2) Estado por verbo

| Verbo | Estado | Notas |
|---|---|---|
| Identify | OK | Incluye metadatos del repositorio y granularidad |
| ListMetadataFormats | OK | Publica `oai_dc` y `perucris-cerif` en la adaptación JSON operativa |
| ListSets | OK | 7 sets operativos implementados |
| ListIdentifiers | OK | `metadataPrefix` operativo `perucris-cerif`, token estricto |
| ListRecords | OK | `metadataPrefix` operativo, token/paginacion y rango de fechas |
| GetRecord | OK | `metadataPrefix` operativo y dominio de identifier estricto |

## 3) Reglas clave implementadas

- Formato de identifier: `oai:<dominio>:<Entidad>/<id>`.
- El segmento de entidad es case-sensitive.
- Con `resumptionToken` no se permiten `set`, `metadataPrefix`, `from`, `until`.
- Validacion de rango de fechas (`from <= until`).
- Errores OAI devueltos en HTTP 200 con payload OAI.
- En `Fundings`, el contenedor sigue siendo `Fundings/{id}`; en esta implementación el identificador interno actual puede ser project-backed (`Fundings/P{idProyecto}`).

## 4) Cobertura de entidades

Sets activos:

- `persons`
- `orgunits`
- `publications`
- `projects`
- `fundings`
- `equipments`
- `patents`

Nota de alcance:

- El perfil XML oficial de PeruCRIS contempla tambien `Products`, pero ese set no forma parte del alcance operativo actual.

Alias de compatibilidad:

- `funding` (entrada) -> `fundings`
- `equipment` (entrada) -> `equipments`

## 5) Evidencia para demo en reunion

Usar `api.http` y ejecutar, al menos:

- Identify
- ListMetadataFormats
- ListSets
- ListIdentifiers (`publications` + continuidad por token)
- ListRecords (`publications` + incremental)
- GetRecord (casos ricos por entidad)
- Error controlado (`set` invalido, `identifier` invalido, `metadataPrefix` invalido)

## 6) Riesgos/observaciones transparentes

- `Identify` declara `deletedRecord: persistent`; no se emite aun `header.status="deleted"`.
- Algunos campos opcionales CERIF se omiten cuando no existe fuente confiable en RAIS.
- La operación actual documenta 7 sets expuestos; no equivale por sí sola a cobertura completa del perfil XML oficial.

## 7) Mensaje recomendado en la reunion

"La implementación actual esta lista para cosecha operativa en los 6 verbos y 7 sets expuestos. Donde la base RAIS no tiene dato confiable para campos opcionales CERIF, se omite el campo para no inventar metadatos; la conformidad normativa completa sigue evaluandose contra el perfil XML oficial."

## 8) Q&A rapido

- **Por que no llenar todos los campos del ejemplo largo?**
  - Porque el ejemplo es referencial; se prioriza dato verificable en BD.

- **Se puede cosechar incrementalmente?**
  - Si, con `from`/`until` y paginacion por `resumptionToken`.

- **Que pasa si mandan identificador de otro dominio?**
  - `GetRecord` responde `idDoesNotExist`.
