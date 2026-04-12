# Estado de Preparacion para Reunion CONCYTEC

Fecha: 2026-04-12

## 1) Objetivo

Exponer RAIS por OAI-PMH para cosecha PeruCRIS con payload CERIF en JSON.

Endpoint base:

```text
GET https://rais.unmsm.edu.pe/api/oai
```

## 2) Estado por verbo

| Verbo | Estado | Notas |
|---|---|---|
| Identify | OK | Incluye metadatos del repositorio y granularidad |
| ListMetadataFormats | OK | Publica `oai_dc` y `perucris-cerif` |
| ListSets | OK | 7 sets canonicos |
| ListIdentifiers | OK | `metadataPrefix` estricto a `perucris-cerif`, token estricto |
| ListRecords | OK | `metadataPrefix` estricto, token/paginacion y rango de fechas |
| GetRecord | OK | `metadataPrefix` estricto y dominio de identifier estricto |

## 3) Reglas clave implementadas

- Formato de identifier: `oai:<dominio>:<EntityType>/<id>`.
- `EntityType` case-sensitive.
- Con `resumptionToken` no se permiten `set`, `metadataPrefix`, `from`, `until`.
- Validacion de rango de fechas (`from <= until`).
- Errores OAI devueltos en HTTP 200 con payload OAI.

## 4) Cobertura de entidades

Sets activos:

- `persons`
- `orgunits`
- `publications`
- `projects`
- `fundings`
- `equipments`
- `patents`

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

## 7) Mensaje recomendado en la reunion

"La API esta lista para cosecha operativa PeruCRIS en los 6 verbos. Donde la base RAIS no tiene dato confiable para campos opcionales CERIF, se omite el campo para no inventar metadatos."

## 8) Q&A rapido

- **Por que no llenar todos los campos del ejemplo largo?**
  - Porque el ejemplo es referencial; se prioriza dato verificable en BD.

- **Se puede cosechar incrementalmente?**
  - Si, con `from`/`until` y paginacion por `resumptionToken`.

- **Que pasa si mandan identificador de otro dominio?**
  - `GetRecord` responde `idDoesNotExist`.
