# Estado de preparación para reunión CONCYTEC

Fecha: 2026-04-12

## 1) Objetivo

Exponer RAIS por OAI-PMH para cosecha operativa con adaptación JSON alineada con PerúCRIS, manteniendo el XML oficial como referencia normativa.

> **Nota:** Este documento resume el estado operativo de la implementación actual. La fuente de verdad normativa sigue siendo `docs/Directrices-perucris.md`, y la adaptación JSON de referencia está en `docs/Guia-para-creacion-apis-json.md`.

> **Nota técnica:** Para esta instancia, la `baseURL` canónica del repositorio es `https://rais.unmsm.edu.pe/oai`. Operativamente el backend usa la adaptación JSON `perucris-cerif`; normativamente el perfil XML oficial de PerúCRIS mantiene `cerif_perucris`.

Endpoint base:

```text
GET https://rais.unmsm.edu.pe/oai
```

## 2) Estado por verbo

| Verbo | Estado | Notas |
|---|---|---|
| Identify | OK | Incluye metadatos del repositorio y granularidad |
| ListMetadataFormats | OK | Publica `oai_dc` y `perucris-cerif` en la adaptación JSON operativa; el valor canónico XML sigue siendo `cerif_perucris` |
| ListSets | OK | 7 sets operativos implementados; `products` sigue pendiente como brecha frente al perfil oficial |
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

Entidades oficiales del perfil PeruCRIS v1.1:

- `persons`
- `orgunits`
- `publications`
- `projects`
- `fundings`
- `equipments`
- `patents`
- `products`

Sets actualmente expuestos por el backend:

- `persons`
- `orgunits`
- `publications`
- `projects`
- `fundings`
- `equipments`
- `patents`

Brecha actual de implementacion:

- `products` sigue siendo entidad oficial del perfil PeruCRIS y del modelo conceptual CERIF aplicado; su ausencia actual en el backend debe leerse como brecha temporal de exposicion, no como exclusion de alcance.

Alias de compatibilidad:

- `funding` (entrada) -> `fundings`
- `equipment` (entrada) -> `equipments`

## 5) Evidencia para demo en reunión

Usar `api.http` y ejecutar, al menos:

- Identify
- ListMetadataFormats
- ListSets
- ListIdentifiers (`publications` + continuidad por token)
- ListRecords (`publications` + incremental)
- GetRecord (casos ricos por entidad)
- Error controlado (`set` invalido, `identifier` invalido, `metadataPrefix` invalido)

## 6) Riesgos y observaciones transparentes

- `Identify` declara `deletedRecord: persistent`; no se emite aun `header.status="deleted"`.
- Algunos campos opcionales CERIF se omiten cuando no existe fuente confiable en RAIS.
- La operación actual expone 7 de las 8 entidades oficiales del perfil; `products` sigue pendiente de implementacion para cerrar la brecha documental y operativa.

## 7) Mensaje recomendado en la reunión

"La implementación actual esta lista para cosecha operativa en los 6 verbos y 7 sets hoy expuestos sobre la `baseURL` `https://rais.unmsm.edu.pe/oai`. El perfil oficial de PeruCRIS comprende 8 entidades y mantiene `Products` como parte obligatoria del modelo, por lo que su exposicion sigue pendiente como brecha de implementacion. Donde la base RAIS no tiene dato confiable para campos opcionales CERIF, se omite el campo para no inventar metadatos; la conformidad normativa completa sigue evaluandose contra el perfil XML oficial."

## 8) Q&A rápido

- **¿Por qué no llenar todos los campos del ejemplo largo?**
  - Porque el ejemplo es referencial; se prioriza el dato verificable en la BD.

- **Se puede cosechar incrementalmente?**
  - Si, con `from`/`until` y paginacion por `resumptionToken`.

- **¿Qué pasa si mandan un identificador de otro dominio?**
  - `GetRecord` responde `idDoesNotExist`.
