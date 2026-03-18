# API PerúCRIS — Guía Completa para Implementación
> **Fuentes:** Directrices #PerúCRIS v1.1 (CONCYTEC, Junio 2024) + Guía de APIs JSON (CONCYTEC, Marzo 2026)
> **Protocolo:** OAI-PMH | **Formato:** CERIF-XML / JSON | **Namespace:** `https://purl.org/pe-repo/perucris/cerif`
> **metadataPrefix:** `perucris-cerif` | **Base:** CERIF 1.5 + OpenAIRE Guidelines v1.1.1

---

## Índice

1. [Estándares e Identificadores](#1-estándares-e-identificadores)
2. [Niveles de Persistencia y Ocurrencia](#2-niveles-de-persistencia-y-ocurrencia)
3. [Protocolo OAI-PMH](#3-protocolo-oai-pmh)
4. [Estructura base de los JSON](#4-estructura-base-de-los-json)
5. [Entidades y sus campos](#5-entidades-y-sus-campos)
   - [5.1 Person — Persona](#51-person--persona)
   - [5.2 OrgUnit — Unidad Organizativa](#52-orgunit--unidad-organizativa)
   - [5.3 Funding — Financiamiento](#53-funding--financiamiento)
   - [5.4 Project — Proyecto](#54-project--proyecto)
   - [5.5 Equipment — Equipamiento](#55-equipment--equipamiento)
   - [5.6 Publication — Publicación](#56-publication--publicación)
   - [5.7 Patent — Patente](#57-patent--patente)
   - [5.8 Product — Producto de Investigación](#58-product--producto-de-investigación)
6. [Ejemplos JSON oficiales por entidad](#6-ejemplos-json-oficiales-por-entidad)
7. [Verbos OAI-PMH y respuestas JSON](#7-verbos-oai-pmh-y-respuestas-json)
8. [URIs y vocabularios controlados](#8-uris-y-vocabularios-controlados)

---

## 1. Estándares e Identificadores

| Ámbito | Estándar / Vocabulario |
|--------|------------------------|
| Formato de intercambio | CERIF-XML (Common European Research Information Format) |
| Protocolo de cosecha | OAI-PMH (Open Archives Initiative) |
| Fechas | ISO 8601 [W3CDTF] |
| Idiomas | IETF language tag (ISO 639, ISO 3166-1, ISO 15924, UN M.49) |
| Países | ISO 3166 |
| Monedas | ISO 4217 |
| Tipos de recursos | COAR Controlled Vocabulary for Resource Type Genres v3.0 |
| Derechos de acceso | COAR Access Rights v1.0 |
| Versiones | COAR Version Types v1.0 |
| Campos OCDE | Campos de I+D según Manual de Frascati (CONCYTEC) |
| Actividades CTI | Manual Frascati + Manual Oslo (CONCYTEC) |
| Clasificación industrial | CIIU (SUNAT) |
| Patentes | CIP — Clasificación Internacional de Patentes (OMPI) |
| Geo Perú | UbiGeo (INEI) |
| Instituciones educativas | SUNEDU |
| Trabajos académicos | RENATI |
| Identificadores de org. | ROR, ISNI, GRID, Ringgold, Scopus Affiliation, CrossRef Funder, RUC |
| Identificadores de persona | ORCID, DNI, Scopus Author ID, ResearcherID (WoS), CTI Vitae |
| Identificadores de publicación | DOI, Handle, ARK, ISBN, ISSN, PMCID, ISI-Number, SCP-Number |

---

## 2. Niveles de Persistencia y Ocurrencia

Todo campo de cada entidad lleva **dos atributos**: persistencia y ocurrencia.

### Persistencia

| Nivel | Abrev. | Descripción |
|-------|--------|-------------|
| **Obligatorio** | `M` | Siempre presente. No se permite vacío. |
| **Obligatorio si aplica** | `MA` | Presente cuando se cumplen condiciones previas definidas. |
| **Recomendado** | `R` | No obligatorio pero exhortado para calidad del dato. |
| **Opcional** | `O` | Puede estar o no. Información complementaria. |

### Ocurrencia

| Nivel | JSON | Descripción |
|-------|------|-------------|
| **No repetible** | Valor escalar / objeto | Aparece **solo una vez**. |
| **Repetible** | Array `[]` | Puede aparecer **una o más veces**. |

### Regla de representación en JSON

```json
{
  "campo_M_no_repetible":  "valor_requerido",
  "campo_M_repetible":     ["val1", "val2"],
  "campo_O_no_repetible":  "valor_o_null",
  "campo_O_repetible":     []
}
```

---

## 3. Protocolo OAI-PMH

### URL base
```
https://cris.institucion.edu.pe/oai
```

### Sets disponibles (por entidad)

| `setSpec` | Entidad |
|-----------|---------|
| `persons` | Personas |
| `orgunits` | Unidades organizativas |
| `publications` | Publicaciones |
| `projects` | Proyectos |
| `fundings` | Financiamientos |
| `equipments` | Equipamientos |
| `patents` | Patentes |

### Tipos de cosecha

| Tipo | Cuándo | Ejemplo de request |
|------|--------|-------------------|
| **Inicial / completa** | Primera carga o sin checkpoint | `?verb=ListRecords&metadataPrefix=perucris-cerif&set=projects` |
| **Incremental** | Solo registros nuevos/modificados | `?verb=ListRecords&metadataPrefix=perucris-cerif&set=projects&from=2026-02-25T00:00:00Z&until=2026-03-05T23:59:59Z` |
| **Paginada** | Cuando el servidor devuelve `resumptionToken` | `?verb=ListRecords&resumptionToken=eyJwYWdlIjoyfQ==` |

### Regla de paginación con `resumptionToken`

- Si la respuesta trae `resumptionToken` con `#text` no vacío → **hay más páginas** → repetir con ese token.
- Si `#text` viene vacío o no aparece → **fin de la cosecha**.
- Al usar token, continuar **solo con el token** (no agregar `from`/`until`).

```json
"resumptionToken": {
  "@cursor": "100",
  "@completeListSize": "250",
  "#text": "eyJwYWdlIjozfQ=="
}
```

> **Convención JSON:** atributos XML → prefijo `@` | texto del nodo → `#text`

---

## 4. Estructura base de los JSON

Cada entidad mantiene la siguiente estructura consistente:

```json
{
  "id": "EntityType/123",
  "title": [
    { "lang": "es", "value": "..." },
    { "lang": "en", "value": "..." }
  ],
  "identifiers": [
    { "scheme": "URI_del_vocabulario", "value": "valor" }
  ],
  "relations": [
    { "type": "...", "target": { "id": "EntityType/456" } }
  ],
  "lastModified": "2026-02-20T12:00:00Z"
}
```

**Reglas clave:**
- `id` estable con prefijo de entidad: `Persons/…`, `OrgUnits/…`, `Projects/…`, etc.
- Campos multilenguaje: siempre como array `[{ "lang": "es", "value": "..." }]`
- Relaciones: por referencia (`{ "id": "..." }`) o por objeto anidado cuando es necesario
- `lastModified` en ISO 8601 — requerido para cosecha incremental
- El uso de elementos y vocabularios definidos es **obligatorio**; no se pueden usar otros

---

## 5. Entidades y sus campos

### 5.1 Person — Persona

**CERIF:** `https://w3id.org/cerif/model#Person` | **Set OAI-PMH:** `persons`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.4.1 | Id en sistema de origen | `Person/InternalIdentifier` | M | No repetible |
| 7.2.4.2 | Nombre completo | `Person/Name` | M | No repetible |
| 7.2.4.2.1 | ↳ Apellidos | `Person/Name/FamilyNames` | O | No repetible |
| 7.2.4.2.2 | ↳ Nombres | `Person/Name/FirstNames` | O | No repetible |
| 7.2.4.3 | Género | `Person/Gender` | M | No repetible |
| 7.2.4.4 | Afiliación | `Person/Affiliation` | R | Repetible |
| 7.2.4.5 | Datos de contacto (email, web, teléfono) | `Person/ElectronicAddress` | R | Repetible |
| 7.2.4.6 | DNI | `Person/Identifier` (DNI) | MA | No repetible |
| 7.2.4.7 | ORCID | `Person/ORCID` | MA | No repetible |
| 7.2.4.8 | Scopus Author ID | `Person/ScopusAuthorID` | R | No repetible |
| 7.2.4.9 | Scopus Author ID alternativo | `Person/AlternativeScopusAuthorID` | O | Repetible |
| 7.2.4.10 | ResearcherID (WoS) | `Person/ResearcherID` | O | No repetible |

**Schemes de identificadores para Person:**

| Scheme URI | Identificador |
|-----------|--------------|
| `http://purl.org/pe-repo/concytec/terminos#dni` | DNI |
| `https://orcid.org` | ORCID |
| `https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID` | ResearcherID (WoS) |
| `https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID` | Scopus Author ID |

---

### 5.2 OrgUnit — Unidad Organizativa

**CERIF:** `https://w3id.org/cerif/model#OrgUnit` | **Set OAI-PMH:** `orgunits`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.3.1 | Id en sistema de origen | `OrgUnit/InternalIdentifier` | M | No repetible |
| 7.2.3.2 | Nombre | `OrgUnit/Name` | M | Repetible |
| 7.2.3.3 | Acrónimo | `OrgUnit/Acronym` | O | No repetible |
| 7.2.3.4 | Domicilio | `OrgUnit/PostAddress` | O | No repetible |
| 7.2.3.4.1 | ↳ Dirección | `OrgUnit/PostAddress/StreetAddress` | O | No repetible |
| 7.2.3.4.2 | ↳ Distrito | `OrgUnit/PostAddress/AddressLine` | O | No repetible |
| 7.2.3.4.3 | ↳ Provincia | `OrgUnit/PostAddress/AddressLocality` | O | No repetible |
| 7.2.3.4.4 | ↳ Departamento | `OrgUnit/PostAddress/AddressRegion` | O | No repetible |
| 7.2.3.4.5 | ↳ Código postal | `OrgUnit/PostAddress/PostalCode` | O | No repetible |
| 7.2.3.4.6 | ↳ País (ISO 3166) | `OrgUnit/PostAddress/AddressCountry` | O | No repetible |
| 7.2.3.5 | Ubicación UbiGeo (INEI) | `OrgUnit/UbiGeo` | MA | No repetible |
| 7.2.3.6 | RUC | `OrgUnit/Identifier` (RUC) | MA | No repetible |
| 7.2.3.7 | ROR | `OrgUnit/Identifier` (ROR) | MA | No repetible |
| 7.2.3.8 | ISNI | `OrgUnit/Identifier` (ISNI) | MA | No repetible |
| 7.2.3.9 | Scopus Affiliation ID | `OrgUnit/Identifier` (Scopus) | MA | No repetible |
| 7.2.3.10 | Scopus Affiliation ID alternativo | `OrgUnit/Identifier` (ScopusAlt) | MA | No repetible |
| 7.2.3.11 | CrossRef Funder ID | `OrgUnit/Identifier` (CrossRef) | O | No repetible |
| 7.2.3.12 | Sector institucional (OCDE) | `OrgUnit/Type` | MA | No repetible |
| 7.2.3.13 | Tipo de organización | `OrgUnit/OrganizationType` | M | No repetible |
| 7.2.3.14 | Unidad de la que depende | `OrgUnit/PartOf` | MA | Repetible |
| 7.2.3.15 | Tipo de dependencia | `OrgUnit/Type` | MA | No repetible |
| 7.2.3.16 | Tipo institución enseñanza superior (SUNEDU) | `OrgUnit/Type` | MA | No repetible |
| 7.2.3.17 | Clasificación CIIU | `OrgUnit/Type` | O | Repetible |
| 7.2.3.18 | Campo del conocimiento OCDE | `OrgUnit/Type` | MA | Repetible |
| 7.2.3.19 | Naturaleza pública o privada | `OrgUnit/Type` | MA | No repetible |
| 7.2.3.20 | Palabras clave | `OrgUnit/Keyword` | R | Repetible |
| 7.2.3.21 | Página web | `OrgUnit/ElectronicAddress` | R | Repetible |
| 7.2.3.22 | Correo electrónico | `OrgUnit/ElectronicAddress` | R | Repetible |
| 7.2.3.23 | Descripción | `OrgUnit/Description` | R | Repetible |

**Schemes de identificadores para OrgUnit:**

| Scheme URI | Identificador |
|-----------|--------------|
| `https://purl.org/pe-repo/concytec/terminos#ruc` | RUC (SUNAT) |
| `https://ror.org` | ROR |
| `https://www.grid.ac` | GRID |
| `https://isni.org` | ISNI |
| `https://purl.org/pe-repo/concytec/tipoOrganizacion` | Tipo de organización |

---

### 5.3 Funding — Financiamiento

**CERIF:** `https://w3id.org/cerif/model#Funding` | **Set OAI-PMH:** `fundings`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.1.1 | Id en sistema de origen | `Funding/InternalIdentifier` | M | No repetible |
| 7.2.1.2 | Nivel o modalidad (Type) | `Funding/Type` | M | No repetible |
| 7.2.1.3 | Código del financiamiento | `Funding/Identifier` | M | No repetible |
| 7.2.1.4 | Nombre | `Funding/Name` | M | Repetible |
| 7.2.1.5 | Acrónimo | `Funding/Acronym` | O | No repetible |
| 7.2.1.6 | Entidad subvencionadora (Funder) | `Funding/Funder` | M | Repetible |
| 7.2.1.7 | Financiamiento del que forma parte | `Funding/PartOf` | MA | No repetible |
| 7.2.1.8 | Fecha de inicio y fin | `Funding/Duration` | R | No repetible |
| 7.2.1.8.1 | ↳ Fecha inicio | `Funding/Duration/StartDate` | — | — |
| 7.2.1.8.2 | ↳ Fecha fin | `Funding/Duration/EndDate` | — | — |
| 7.2.1.9 | Monto programado | `Funding/Amount` | R | No repetible |
| 7.2.1.10 | Monto ejecutado al cierre | `Funding/ExecutedAmount` | R | No repetible |
| 7.2.1.11 | Descripción | `Funding/Description` | R | Repetible |
| 7.2.1.12 | Palabras clave | `Funding/Keyword` | R | Repetible |
| 7.2.1.13 | Mandato de Acceso Abierto | `Funding/OAMandate` | R | Repetible |
| 7.2.1.13.1 | ↳ Mandato (boolean) | `Funding/OAMandate/mandated` | M | No repetible |
| 7.2.1.13.2 | ↳ URI del mandato | `Funding/OAMandate/uri` | O | Repetible |

**Vocabulario `Funding/Type`:**

| URI | Descripción |
|-----|-------------|
| `#FundingProgramme` | Programa de financiamiento / fondo por encargo |
| `#Call` | Convocatoria (depende de un programa) |
| `#Grant` | Subvención directa |

**Schemes de identificadores para Funding:**

| Scheme URI | Identificador |
|-----------|--------------|
| `https://w3id.org/cerif/vocab/IdentifierTypes#AwardNumber` | Número de contrato/award |
| `https://w3id.org/cerif/vocab/IdentifierTypes#FundRefID` | CrossRef Funder Registry ID |

---

### 5.4 Project — Proyecto

**CERIF:** `https://w3id.org/cerif/model#Project` | **Set OAI-PMH:** `projects`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.2.1 | Id en sistema de origen | `Project/InternalIdentifier` | M | No repetible |
| 7.2.2.2 | Tipo de actividad OCDE | `Project/Type` | MA | Repetible |
| 7.2.2.3 | Otros tipos CTI (CONCYTEC) | `Project/Type` | O | Repetible |
| 7.2.2.4 | Código del proyecto | `Project/Identifier` | M | No repetible |
| 7.2.2.5 | Título | `Project/Title` | M | Repetible |
| 7.2.2.6 | Acrónimo | `Project/Acronym` | O | No repetible |
| 7.2.2.7 | Fecha de inicio | `Project/StartDate` | R | No repetible |
| 7.2.2.8 | Fecha de fin | `Project/EndDate` | R | No repetible |
| 7.2.2.9 | Consorcio (entidades responsables) | `Project/Consortium` | M | No repetible |
| 7.2.2.9.1 | ↳ Entidad ejecutora principal | `Project/Consortium/Contractor` | O | Repetible |
| 7.2.2.9.2 | ↳ Coordinador general | `Project/Consortium/Coordinator` | O | Repetible |
| 7.2.2.9.3 | ↳ Socio con aporte monetario | `Project/Consortium/Partner` | O | Repetible |
| 7.2.2.9.4 | ↳ Socio con aporte no monetario | `Project/Consortium/InKindContributor` | O | Repetible |
| 7.2.2.9.5 | ↳ Miembro del consorcio | `Project/Consortium/Member` | O | Repetible |
| 7.2.2.10 | Equipo investigador | `Project/Team` | M | No repetible |
| 7.2.2.10.1 | ↳ Investigador principal | `Project/Team/PrincipalInvestigator` | O | Repetible |
| 7.2.2.10.2 | ↳ Persona de contacto | `Project/Team/Contact` | O | Repetible |
| 7.2.2.10.3 | ↳ Otros miembros | `Project/Team/Member` | O | Repetible |
| 7.2.2.11 | Financiamiento de origen | `Project/Funded` | MA | Repetible |
| 7.2.2.11.1 | ↳ Entidad financiadora | `Project/Funded/By` | O | No repetible |
| 7.2.2.11.2 | ↳ Nombre y código del financiamiento | `Project/Funded/As` | O | No repetible |
| 7.2.2.12 | Campo del conocimiento OCDE | `Project/Subject` | MA | Repetible |
| 7.2.2.13 | Clasificación CIIU | `Project/Subject` | O | Repetible |
| 7.2.2.14 | Línea de investigación institucional | `Project/ResearchLine` | R | Repetible |
| 7.2.2.15 | Ámbito geográfico | `Project/geoLocations/geoLocation` | MA | Repetible |
| 7.2.2.15.1 | ↳ Punto geográfico | `geoLocation/geoLocationPoint` | O | No repetible |
| 7.2.2.15.1.1 | ↳↳ Latitud | `geoLocationPoint/pointLatitude` | MA | No repetible |
| 7.2.2.15.1.2 | ↳↳ Longitud | `geoLocationPoint/pointLongitude` | MA | No repetible |
| 7.2.2.15.2 | ↳ Caja geográfica | `geoLocation/geoLocationBox` | O | No repetible |
| 7.2.2.15.2.1 | ↳↳ Longitud occidental | `geoLocationBox/westBoundLongitude` | MA | No repetible |
| 7.2.2.15.2.2 | ↳↳ Longitud oriental | `geoLocationBox/eastBoundLongitude` | MA | No repetible |
| 7.2.2.15.2.3 | ↳↳ Latitud sur | `geoLocationBox/southBoundLatitude` | MA | No repetible |
| 7.2.2.15.2.4 | ↳↳ Latitud norte | `geoLocationBox/northBoundLatitude` | MA | No repetible |
| 7.2.2.15.3 | ↳ Nombre del lugar | `geoLocation/geoLocationPlace` | O | No repetible |
| 7.2.2.16 | Palabras clave | `Project/Keyword` | R | Repetible |
| 7.2.2.17 | Resumen | `Project/Abstract` | R | Repetible |
| 7.2.2.18 | Estado | `Project/Status` | R | No repetible |
| 7.2.2.19 | Equipamiento utilizado | `Project/Uses` | R | Repetible |
| 7.2.2.20 | Dirección web | `Project/URL` | R | Repetible |
| 7.2.2.21 | Mandato de Acceso Abierto | `Project/OAMandate` | R | Repetible |
| 7.2.2.21.1 | ↳ Mandato (boolean) | `Project/OAMandate/mandate` | M | No repetible |
| 7.2.2.21.2 | ↳ URI | `Project/OAMandate/uri` | O | Repetible |

**Schemes de identificadores para Project:**

| Scheme URI | Identificador |
|-----------|--------------|
| `https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference` | Código interno del proyecto |
| `https://purl.org/pe-repo/ocde/ford` | Campo OCDE (Ford) |

---

### 5.5 Equipment — Equipamiento

**CERIF:** `https://w3id.org/cerif/model#Equipment` | **Set OAI-PMH:** `equipments`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.5.1 | Id en sistema de origen | `Equipment/InternalIdentifier` | M | No repetible |
| 7.2.5.2 | Código institucional | `Equipment/Identifier` | M | No repetible |
| 7.2.5.3 | Tipo de equipamiento | `Equipment/Type` | M | No repetible |
| 7.2.5.4 | Nombre | `Equipment/Name` | M | Repetible |
| 7.2.5.5 | Acrónimo | `Equipment/Acronym` | O | No repetible |
| 7.2.5.6 | OrgUnit propietaria | `Equipment/Owner` | M | Repetible |
| 7.2.5.7 | Uso del equipamiento en CTI | `Equipment/Type` | R | Repetible |
| 7.2.5.8 | Campo del conocimiento OCDE | `Equipment/Subject` | MA | Repetible |
| 7.2.5.9 | Línea de investigación institucional | `Equipment/ResearchLine` | R | Repetible |
| 7.2.5.10 | Financiamiento de origen | `Equipment/Funded` | MA | Repetible |
| 7.2.5.10.1 | ↳ Entidad financiadora | `Equipment/Funded/By` | O | No repetible |
| 7.2.5.10.2 | ↳ Código del financiamiento | `Equipment/Funded/As` | O | No repetible |
| 7.2.5.11 | Descripción | `Equipment/Description` | R | Repetible |
| 7.2.5.12 | País de fabricación (ISO 3166) | `Equipment/ManufacturingCountry` | R | No repetible |
| 7.2.5.13 | Fecha de fabricación | `Equipment/ManufacturingDate` | R | No repetible |
| 7.2.5.14 | Fecha de adquisición | `Equipment/AcquisitionDate` | R | No repetible |
| 7.2.5.15 | Monto de adquisición | `Equipment/AcquisitionAmount` | R | No repetible |

**Schemes de identificadores para Equipment:**

| Scheme URI | Identificador |
|-----------|--------------|
| `https://w3id.org/cerif/vocab/IdentifierTypes#CRISID` | ID institucional del equipo |
| `https://w3id.org/cerif/vocab/IdentifierTypes#SerialNumber` | Número de serie |

---

### 5.6 Publication — Publicación

**CERIF:** `https://w3id.org/cerif/model#ResultPublication` | **Set OAI-PMH:** `publications`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.6.1 | Id en sistema de origen | `Publication/InternalIdentifier` | M | No repetible |
| 7.2.6.2 | Título | `Publication/Title` | M | Repetible |
| 7.2.6.3 | Tipo de recurso (COAR) | `Publication/Type` | M | No repetible |
| 7.2.6.4 | Nivel de acceso (COAR) | `Publication/Access` | M | No repetible |
| 7.2.6.5 | Handle | `Publication/Handle` | O | No repetible |
| 7.2.6.6 | DOI | `Publication/DOI` | O | No repetible |
| 7.2.6.7 | ISBN | `Publication/ISBN` | O | Repetible |
| 7.2.6.8 | ISSN | `Publication/ISSN` | O | Repetible |
| 7.2.6.9 | PubMed ID (PMCID) | `Publication/PMCID` | O | No repetible |
| 7.2.6.10 | ID Web of Science (ISI-Number) | `Publication/ISI-Number` | O | No repetible |
| 7.2.6.11 | ID Scopus (SCP-Number) | `Publication/SCP-Number` | O | No repetible |
| 7.2.6.12 | URL | `Publication/URL` | O | No repetible |
| 7.2.6.13 | Fuente (revista/libro fuente) | `Publication/PublishedIn` | O | No repetible |
| 7.2.6.14 | Recurso del que forma parte | `Publication/PartOf` | O | No repetible |
| 7.2.6.15 | Autores | `Publication/Authors` | O | No repetible |
| 7.2.6.15.1 | ↳ Autor (con `order`) | `Publication/Authors/Author` | O | Repetible |
| 7.2.6.16 | Editores | `Publication/Editors` | O | No repetible |
| 7.2.6.16.1 | ↳ Editor (con `order`) | `Publication/Editors/Editor` | O | Repetible |
| 7.2.6.17 | Editoriales | `Publication/Publishers` | O | No repetible |
| 7.2.6.17.1 | ↳ Editorial | `Publication/Publishers/Publisher` | O | Repetible |
| 7.2.6.18 | Fecha de publicación | `Publication/PublicationDate` | O | No repetible |
| 7.2.6.19 | Número | `Publication/Number` | O | No repetible |
| 7.2.6.20 | Volumen | `Publication/Volume` | O | No repetible |
| 7.2.6.21 | Fascículo | `Publication/Issue` | O | No repetible |
| 7.2.6.22 | Edición | `Publication/Edition` | O | No repetible |
| 7.2.6.23 | Página de inicio | `Publication/StartPage` | O | No repetible |
| 7.2.6.24 | Página de fin | `Publication/EndPage` | O | No repetible |
| 7.2.6.25 | Idioma (IETF tag) | `Publication/Language` | O | Repetible |
| 7.2.6.26 | Licencia | `Publication/License` | O | Repetible |
| 7.2.6.27 | Originado por (proyecto) | `Publication/OriginatesFrom` | O | Repetible |
| 7.2.6.28 | Resumen | `Publication/Abstract` | O | Repetible |
| 7.2.6.29 | Versión (COAR) | `Publication/Version` | R | No repetible |
| 7.2.6.30 | Palabras clave | `Publication/Keyword` | R | Repetible |
| 7.2.6.31 | Campo del conocimiento OCDE | `Publication/Subject` | R | Repetible |
| 7.2.6.32 | Materia | `Publication/Subject` | R | Repetible |
| 7.2.6.33 | Patrocinador(es) | `Publication/Sponsorship` | R | Repetible |
| 7.2.6.34 | Asesores | `Publication/Advisors` | R | No repetible |
| 7.2.6.34.1 | ↳ Asesor | `Publication/Advisors/Advisor` | R | Repetible |
| 7.2.6.35 | Tipo de trabajo RENATI | `Publication/Type` | R | No repetible |
| 7.2.6.36 | Grado/título otorgado | `Publication/InSupportOf` | R | No repetible |
| 7.2.6.36.1 | ↳ Calificación | `InSupportOf/Qualification` | R | Repetible |
| 7.2.6.36.1.1 | ↳↳ Nombre del grado | `Qualification/Title` | O | No repetible |
| 7.2.6.36.1.2 | ↳↳ Tipo de grado (RENATI) | `Qualification/Type` | O | No repetible |
| 7.2.6.36.1.3 | ↳↳ Programa (INEI CPESUTPT) | `Qualification/Discipline` | O | Repetible |
| 7.2.6.36.1.4 | ↳↳ Institución otorgante | `Qualification/Grantor` | O | No repetible |
| 7.2.6.36.1.5 | ↳↳ Jurados | `Qualification/Jurors` | R | No repetible |
| 7.2.6.36.1.5.1 | ↳↳↳ Jurado | `Qualification/Jurors/Juror` | R | Repetible |

**Schemes de identificadores para Publication:**

| Scheme / Type | Identificador |
|--------------|--------------|
| `"type": "Handle"` | Handle |
| `"type": "DOI"` | DOI |
| `"type": "ISBN"` | ISBN |
| `"type": "ISSN"` | ISSN |
| `"type": "PMCID"` | PubMed Central ID |
| `"type": "ISI-Number"` | Web of Science ID |
| `"type": "SCP-Number"` | Scopus ID |
| `"type": "URL"` | URL de acceso |
| `https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types` | Tipo de recurso |
| `https://purl.org/pe-repo/renati/type` | Tipo de trabajo RENATI |
| `https://purl.org/pe-repo/renati/level` | Nivel académico RENATI |
| `https://purl.org/pe-repo/inei/cpesutpt` | Programa INEI |
| `http://purl.org/coar/version` | Versión (COAR) |
| `https://www.openaire.eu/cerif-profile/vocab/LicenseTypes` | Tipo de licencia |
| `https://purl.org/pe-repo/ocde/ford` | Campo OCDE |
| `http://id.nlm.nih.gov/mesh` | MeSH (NLM) |

---

### 5.7 Patent — Patente

**CERIF:** `https://w3id.org/cerif/model#ResultPatent` | **Set OAI-PMH:** `patents`

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.7.1 | Id en sistema de origen | `Patent/InternalIdentifier` | M | No repetible |
| 7.2.7.2 | Número de patente | `Patent/PatentNumber` | M | No repetible |
| 7.2.7.3 | Título | `Patent/Title` | M | Repetible |
| 7.2.7.4 | Inventores | `Patent/Inventors` | O | No repetible |
| 7.2.7.4.1 | ↳ Inventor | `Patent/Inventors/Inventor` | O | Repetible |
| 7.2.7.5 | Titulares | `Patent/Holders` | O | No repetible |
| 7.2.7.5.1 | ↳ Titular | `Patent/Holders/Holder` | O | Repetible |
| 7.2.7.6 | Entidad otorgante (Issuer) | `Patent/Issuer` | O | Repetible |
| 7.2.7.7 | Fecha de presentación | `Patent/RegistrationDate` | O | No repetible |
| 7.2.7.8 | Fecha de concesión | `Patent/ApprovalDate` | O | No repetible |
| 7.2.7.9 | País otorgante (ISO 3166) | `Patent/CountryCode` | O | No repetible |
| 7.2.7.10 | Idioma | `Patent/Language` | O | Repetible |
| 7.2.7.11 | Resumen | `Patent/Abstract` | R | Repetible |
| 7.2.7.12 | Clasificación CIP (IPC/OMPI) | `Patent/Subject` | M | Repetible |
| 7.2.7.13 | Palabras clave | `Patent/Keyword` | O | Repetible |
| 7.2.7.14 | Campo del conocimiento OCDE | `Patent/Subject` | R | Repetible |
| 7.2.7.15 | Tipo de recurso (COAR) | `Patent/Type` | M | No repetible |
| 7.2.7.16 | URL | `Patent/URL` | O | No repetible |
| 7.2.7.17 | Originado por (proyecto) | `Patent/OriginatesFrom` | O | Repetible |
| 7.2.7.18 | Predecesor | `Patent/Predecessor` | O | Repetible |

**Schemes de identificadores para Patent:**

| Scheme URI | Identificador |
|-----------|--------------|
| `http://data.epo.org/linked-data/def/ipc/` | Clasificación Internacional de Patentes (IPC) |
| `http://purl.org/coar/resource_type/9DKX-KSAF` | Tipo: patente (COAR) |

---

### 5.8 Product — Producto de Investigación

**CERIF:** `https://w3id.org/cerif/model#ResultProduct` | **Set OAI-PMH:** *(no tiene set propio; se expone a través de publicaciones o proyectos)*

| ID | Campo | Metadato CERIF | Persist. | Ocurrencia |
|----|-------|----------------|----------|------------|
| 7.2.8.1 | Id en sistema de origen | `Product/InternalIdentifier` | M | No repetible |
| 7.2.8.2 | Tipo de recurso (COAR) | `Product/Type` | M | No repetible |
| 7.2.8.3 | Idioma | `Product/Language` | O | Repetible |
| 7.2.8.4 | Nombre | `Product/Name` | M | Repetible |
| 7.2.8.5 | Versión | `Product/VersionInfo` | O | Repetible |
| 7.2.8.6 | ARK | `Product/ARK` | O | No repetible |
| 7.2.8.7 | DOI | `Product/DOI` | O | No repetible |
| 7.2.8.8 | Handle | `Product/Handle` | O | No repetible |
| 7.2.8.9 | URL | `Product/URL` | O | No repetible |
| 7.2.8.10 | Creadores | `Product/Creators` | O | No repetible |
| 7.2.8.10.1 | ↳ Creador | `Product/Creators/Creator` | O | Repetible |
| 7.2.8.11 | Editores | `Product/Publishers` | O | No repetible |
| 7.2.8.11.1 | ↳ Editor | `Product/Publishers/Publisher` | O | Repetible |
| 7.2.8.12 | Licencia | `Product/License` | O | Repetible |
| 7.2.8.13 | Descripción | `Product/Description` | R | Repetible |
| 7.2.8.14 | Palabras clave | `Product/Keyword` | O | Repetible |
| 7.2.8.15 | Campo del conocimiento OCDE | `Product/Subject` | R | Repetible |
| 7.2.8.16 | Materia | `Product/Subject` | R | Repetible |
| 7.2.8.17 | Recurso del que forma parte | `Product/PartOf` | O | No repetible |
| 7.2.8.18 | Originado por (proyecto) | `Product/OriginatesFrom` | O | Repetible |
| 7.2.8.19 | Equipamiento utilizado | `Product/GeneratedBy` | O | Repetible |
| 7.2.8.20 | Nivel de acceso (COAR) | `Product/Access` | M | No repetible |

---

## 6. Ejemplos JSON oficiales por entidad

### 6.1 Person

```json
{
  "id": "Persons/28521427",
  "personName": {
    "familyNames": "Cabrera Sánchez",
    "firstNames": "Paolo Edgar",
    "fullName": "Paolo Edgar Cabrera Sánchez"
  },
  "identifiers": [
    { "scheme": "http://purl.org/pe-repo/concytec/terminos#dni", "value": "08755499" },
    { "scheme": "https://orcid.org", "value": "https://orcid.org/0000-0001-8247-8975" },
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID", "value": "HRC-7754-2023" },
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID", "value": "57123456789" }
  ],
  "emails": ["paolo.cabrera@unica.edu.pe"],
  "affiliations": [
    {
      "orgUnit": { "id": "OrgUnits/38498322", "name": "Universidad Nacional San Luis Gonzaga" },
      "role": "Autor",
      "startDate": "2020-01-01"
    }
  ],
  "keywords": [{ "value": "Ciencias veterinarias" }],
  "lastModified": "2026-02-20T12:00:00Z"
}
```

---

### 6.2 OrgUnit

```json
{
  "id": "OrgUnits/38498322",
  "acronym": "UNSLG",
  "name": [
    { "value": "Universidad Nacional San Luis Gonzaga" },
    { "value": "National University San Luis Gonzaga" }
  ],
  "type": "Institución principal",
  "identifiers": [
    { "scheme": "https://purl.org/pe-repo/concytec/terminos#ruc", "value": "20148421014" },
    { "scheme": "https://ror.org", "value": "https://ror.org/012345678" },
    { "scheme": "https://www.grid.ac", "value": "grid.12345.6" },
    { "scheme": "https://isni.org", "value": "0000000123456789" }
  ],
  "countryCode": "PE",
  "address": {
    "street": "Av. Universidad 123",
    "city": "Ica",
    "region": "Ica",
    "postalCode": "11001"
  },
  "parentOrgUnit": { "id": "OrgUnits/00000001" },
  "websites": [
    { "type": "homepage", "url": "https://www.unica.edu.pe" },
    { "type": "cris",     "url": "https://cris.unica.edu.pe" }
  ],
  "classifications": [
    { "scheme": "https://purl.org/pe-repo/concytec/tipoOrganizacion", "value": "Institución principal" }
  ],
  "lastModified": "2026-02-20T12:00:00Z"
}
```

---

### 6.3 Funding

```json
{
  "id": "Fundings/187597",
  "title": [{ "value": "Contrato No. 08-2019-FONDECYT" }],
  "identifiers": [
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#AwardNumber", "value": "08-2019-FON-DECYT" },
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#FundRefID", "value": "http://dx.doi.org/10.13039/501100010751" }
  ],
  "fundedBy": {
    "orgUnit": {
      "id": "OrgUnits/854622",
      "acronym": "FONDECYT",
      "name": "Fondo Nacional de Desarrollo Científico, Tecnológico y de Innovación Tecnológica"
    }
  },
  "amount": { "value": 250000.0, "currency": "PEN" },
  "startDate": "2019-01-01",
  "endDate": "2020-12-31",
  "relatedProjects": ["Projects/358478"],
  "url": "https://funder.example.pe/awards/08-2019-FON-DECYT",
  "lastModified": "2026-02-22T09:10:00Z"
}
```

---

### 6.4 Project

```json
{
  "id": "Projects/358478",
  "title": [{ "lang": "es", "value": "Sarna en vicuñas: epidemiología y estrategias para su prevención y control" }],
  "acronym": "SARNAVIC",
  "identifiers": [
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference", "value": "160-2017" }
  ],
  "startDate": "2017-01-01",
  "endDate": "2020-10-31",
  "status": "completed",
  "abstract": [{ "lang": "es", "value": "Proyecto de ejemplo para interoperabilidad." }],
  "keywords": [
    { "lang": "es", "value": "Vicuñas" },
    { "lang": "es", "value": "Epidemiología" }
  ],
  "subjects": [
    { "scheme": "https://purl.org/pe-repo/ocde/ford", "value": "https://purl.org/pe-repo/ocde/ford#1.06.05" }
  ],
  "participants": [
    {
      "person": { "id": "Persons/28521427", "name": "Paolo Edgar Cabrera Sánchez" },
      "role": "Investigador"
    },
    {
      "orgUnit": { "id": "OrgUnits/38498322", "name": "Universidad Nacional San Luis Gonzaga" },
      "role": "Institución ejecutora"
    }
  ],
  "fundings": [{ "id": "Fundings/187597" }],
  "outputs": {
    "publications": ["Publications/894518"],
    "patents": [],
    "products": []
  },
  "url": "https://cris.institucion.edu.pe/projects/358478",
  "lastModified": "2026-02-22T09:10:00Z"
}
```

---

### 6.5 Equipment

```json
{
  "id": "Equipments/82394874",
  "name": [{ "value": "Cromatógrafo de gases con detector de flama o llama" }],
  "identifiers": [
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#CRISID", "value": "F.5618" },
    { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#SerialNumber", "value": "SN-CHROM-000123" }
  ],
  "type": "http://purl.org/coar/resource_type/c_2f33",
  "description": [{ "value": "Equipo utilizado para análisis químico." }],
  "owner": {
    "orgUnit": { "id": "OrgUnits/38498322", "name": "Universidad Nacional San Luis Gonzaga" }
  },
  "location": {
    "campus": "Sede Central",
    "lab": "Laboratorio de Química Analítica"
  },
  "generatedOutputs": ["Products/258746"],
  "url": "https://cris.institucion.edu.pe/equipment/82394874",
  "lastModified": "2026-02-18T11:00:00Z"
}
```

---

### 6.6 Publication (simplificado — campos principales)

```json
{
  "id": "Publications/894518",
  "type": {
    "scheme": "https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types",
    "value": "http://purl.org/coar/resource_type/c_0640"
  },
  "title": [
    { "value": "Revista de Investigaciones Veterinarias del Perú" },
    { "value": "Peruvian Journal of Veterinary Research" }
  ],
  "identifiers": [
    { "type": "Handle",     "value": "https://hdl.handle.net/20.500.12345/9876" },
    { "type": "DOI",        "value": "10.15381/pc.v24i1.16559" },
    { "type": "ISSN",       "value": "1609-9117" },
    { "type": "ISI-Number", "value": "000245099300013" },
    { "type": "SCP-Number", "value": "2-s2.0-85045579729" }
  ],
  "authors": [
    {
      "person": {
        "id": "Persons/28521427",
        "personName": { "familyNames": "Cabrera Sánchez", "firstNames": "Paolo Edgar", "fullName": "Paolo Edgar Cabrera Sánchez" },
        "identifiers": [
          { "scheme": "http://purl.org/pe-repo/concytec/terminos#dni", "value": "08755499" },
          { "scheme": "https://orcid.org", "value": "https://orcid.org/0000-0001-8247-8975" }
        ]
      },
      "affiliations": [{ "orgUnit": { "id": "OrgUnits/38498322", "name": "Universidad Nacional San Luis Gonzaga" } }],
      "order": 1
    }
  ],
  "publishers": [{ "orgUnit": { "id": "OrgUnits/3082885", "name": [{ "lang": "es", "value": "Universidad Nacional Agraria La Molina" }] } }],
  "publicationDate": "2013-08-25",
  "volume": "8",
  "issue": "2",
  "startPage": "285",
  "endPage": "309",
  "language": ["es", "en"],
  "license": [{ "url": "https://creativecommons.org/licenses/by/4.0/" }],
  "originatesFrom": [
    { "project": { "id": "Projects/358478" } },
    { "funding": { "id": "Fundings/187597" } }
  ],
  "abstract": [{ "value": "Este proyecto multidisciplinar e interinstitucional..." }],
  "version": { "scheme": "http://purl.org/coar/version", "value": "http://purl.org/coar/version/c_970fb48d4fbd8a85" },
  "keywords": [{ "value": "Silvicultura" }],
  "subjects": [{ "scheme": "https://purl.org/pe-repo/ocde/ford", "value": "https://purl.org/pe-repo/ocde/ford#3.03.05" }],
  "renatiType": { "scheme": "https://purl.org/pe-repo/renati/type", "value": "https://purl.org/pe-repo/renati/type#tesis" },
  "inSupportOf": {
    "qualification": {
      "title": "Maestro en Banca y Finanzas",
      "type": { "scheme": "https://purl.org/pe-repo/renati/level", "value": "https://purl.org/pe-repo/renati/level#maestro" },
      "discipline": { "scheme": "https://purl.org/pe-repo/inei/cpesutpt", "value": "412077" },
      "grantor": {
        "orgUnit": {
          "id": "OrgUnits/587498",
          "name": [{ "value": "Facultad de Ingeniería" }],
          "partOf": {
            "orgUnit": {
              "id": "OrgUnits/128753",
              "acronym": "UPC",
              "name": [{ "value": "Universidad Peruana de Ciencias Aplicadas" }],
              "identifiers": [{ "scheme": "ruc", "value": "20211614545" }]
            }
          }
        }
      },
      "jurors": [
        { "person": { "id": "Persons/288725", "personName": { "fullName": "Miriam Josefina Mariátegui Suarez" }, "identifiers": [{ "scheme": "dni", "value": "10274587" }] } },
        { "person": { "id": "Persons/288726", "personName": { "fullName": "Rubén Jesús Lozada Martin" }, "identifiers": [{ "scheme": "dni", "value": "08974125" }] } }
      ]
    }
  },
  "lastModified": "2026-02-20T12:00:00Z"
}
```

---

### 6.7 Patent

```json
{
  "id": "Patents/284788",
  "type": "http://purl.org/coar/resource_type/9DKX-KSAF",
  "patentNumber": "000056-2010",
  "title": [{ "value": "Válvula check para un circuito cerrado de bombeo de aire para un envase dispensador" }],
  "inventors": [
    { "person": { "id": "Persons/2016875", "name": "Lizeth María Zárate Aguilar", "identifiers": [{ "scheme": "dni", "value": "07928457" }] } },
    { "person": { "id": "Persons/2875998", "name": "Marco Antonio Chaco Gómez", "identifiers": [{ "scheme": "orcid", "value": "https://orcid.org/0000-0001-7291-6401" }] } }
  ],
  "holders": [
    { "orgUnit": { "id": "OrgUnits/385244", "name": "Industrias Arguelles y Servicios Generales", "identifiers": [{ "scheme": "ruc", "value": "20173136499" }] } }
  ],
  "issuer": {
    "orgUnit": { "id": "OrgUnits/355471", "acronym": "INDECOPI", "name": "Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual" }
  },
  "registrationDate": "2010-01-25",
  "approvalDate": "2012-01-16",
  "countryCode": "PE",
  "language": ["es"],
  "abstract": [{ "value": "Resumen técnico de la patente." }],
  "subjects": [{ "scheme": "http://data.epo.org/linked-data/def/ipc/", "value": "http://data.epo.org/linked-data/def/ipc/A47K5-12" }],
  "keywords": [{ "value": "Dispensadores para jabón" }],
  "url": "https://servicio.indecopi.gob.pe/portalSAE/...",
  "originatesFrom": [
    { "project": { "id": "Projects/358478" } },
    { "funding": { "id": "Fundings/187597" } }
  ],
  "lastModified": "2026-02-19T08:00:00Z"
}
```

---

## 7. Verbos OAI-PMH y respuestas JSON

### Identify — `?verb=Identify`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:20:00Z",
    "request": { "@verb": "Identify", "#text": "https://cris.institucion.edu.pe/oai" },
    "Identify": {
      "repositoryName": "CRIS Institucional - Universidad Ejemplo",
      "baseURL": "https://cris.institucion.edu.pe/oai",
      "protocolVersion": "2.0",
      "adminEmail": "admin@institucion.edu.pe",
      "earliestDatestamp": "2018-01-01T00:00:00Z",
      "deletedRecord": "persistent",
      "granularity": "YYYY-MM-DDThh:mm:ssZ"
    }
  }
}
```

---

### ListMetadataFormats — `?verb=ListMetadataFormats`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:20:05Z",
    "request": { "@verb": "ListMetadataFormats", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListMetadataFormats": {
      "metadataFormat": [
        { "metadataPrefix": "oai_dc", "schema": "http://www.openarchives.org/OAI/2.0/oai_dc.xsd", "metadataNamespace": "http://www.openarchives.org/OAI/2.0/oai_dc/" },
        { "metadataPrefix": "perucris-cerif", "schema": "https://purl.org/pe-repo/perucris/cerif.xsd", "metadataNamespace": "https://purl.org/pe-repo/perucris/cerif" }
      ]
    }
  }
}
```

---

### ListSets — `?verb=ListSets`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:20:10Z",
    "request": { "@verb": "ListSets", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListSets": {
      "set": [
        { "setSpec": "persons",      "setName": "Personas" },
        { "setSpec": "orgunits",     "setName": "Unidades organizativas" },
        { "setSpec": "publications", "setName": "Publicaciones" },
        { "setSpec": "projects",     "setName": "Proyectos" },
        { "setSpec": "fundings",     "setName": "Financiamientos" },
        { "setSpec": "equipments",   "setName": "Equipamientos" },
        { "setSpec": "patents",      "setName": "Patentes" }
      ]
    }
  }
}
```

---

### ListIdentifiers — `?verb=ListIdentifiers&metadataPrefix=perucris-cerif&set=publications`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:21:20Z",
    "request": { "@verb": "ListIdentifiers", "@metadataPrefix": "perucris-cerif", "@set": "publications", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListIdentifiers": {
      "header": [
        { "identifier": "oai:cris.institucion.edu.pe:Publications/894518", "datestamp": "2026-02-20T12:00:00Z", "setSpec": "publications" },
        { "identifier": "oai:cris.institucion.edu.pe:Publications/894519", "datestamp": "2026-02-21T10:30:00Z", "setSpec": "publications" }
      ],
      "resumptionToken": { "@cursor": "0", "@completeListSize": "250", "#text": "eyJwYWdlIjoyfQ==" }
    }
  }
}
```

---

### ListRecords — cosecha completa

```
?verb=ListRecords&metadataPrefix=perucris-cerif&set=publications
```

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:21:00Z",
    "request": { "@verb": "ListRecords", "@metadataPrefix": "perucris-cerif", "@set": "publications", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListRecords": {
      "record": [
        {
          "header": { "identifier": "oai:cris.institucion.edu.pe:Publications/894518", "datestamp": "2026-02-20T12:00:00Z", "setSpec": "publications" },
          "metadata": {
            "Publication": {
              "@id": "Publications/894518",
              "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
              "Type": { "@xmlns": "https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types", "#text": "http://purl.org/coar/resource_type/c_6501" },
              "Title": [{ "#text": "Efecto de la altitud en la variabilidad climática" }, { "#text": "Effect of altitude on climate variability" }],
              "DOI": "10.1234/abcd.2026.0001",
              "Handle": "https://hdl.handle.net/20.500.12345/9876",
              "PublicationDate": "2026-01-15",
              "Language": "es",
              "Abstract": { "#text": "Resumen de ejemplo." },
              "Keyword": { "#text": "Clima" },
              "Subject": { "@scheme": "https://purl.org/pe-repo/ocde/ford", "#text": "https://purl.org/pe-repo/ocde/ford#1.05.01" }
            }
          }
        }
      ],
      "resumptionToken": { "@cursor": "0", "@completeListSize": "250", "#text": "eyJwYWdlIjoyfQ==" }
    }
  }
}
```

---

### ListRecords — cosecha incremental

```
?verb=ListRecords&metadataPrefix=perucris-cerif&set=projects
&from=2026-02-20T00:00:00Z&until=2026-03-05T23:59:59Z
```

```json
{
  "OAI-PMH": {
    "request": { "@verb": "ListRecords", "@metadataPrefix": "perucris-cerif", "@set": "projects", "@from": "2026-02-20T00:00:00Z", "@until": "2026-03-05T23:59:59Z", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListRecords": {
      "record": [{ "header": { "identifier": "oai:cris.institucion.edu.pe:Projects/1001", "datestamp": "2026-02-20T12:00:00Z", "setSpec": "projects" }, "metadata": { "Project": { "@id": "Projects/1001" } } }],
      "resumptionToken": { "@cursor": "0", "@completeListSize": "80", "#text": "eyJwYWdlIjoyfQ==" }
    }
  }
}
```

---

### ListRecords — paginación con token ✅

```
?verb=ListRecords&resumptionToken=eyJwYWdlIjoyfQ==
```

```json
{
  "OAI-PMH": {
    "request": { "@verb": "ListRecords", "@resumptionToken": "eyJwYWdlIjoyfQ==", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListRecords": {
      "_comment": "siguientes records...",
      "resumptionToken": { "@cursor": "100", "@completeListSize": "250", "#text": "eyJwYWdlIjozfQ==" }
    }
  }
}
```

---

### GetRecord — `?verb=GetRecord&metadataPrefix=perucris-cerif&identifier=oai:...`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:21:30Z",
    "request": { "@verb": "GetRecord", "@metadataPrefix": "perucris-cerif", "@identifier": "oai:cris.institucion.edu.pe:Publications/894518", "#text": "https://cris.institucion.edu.pe/oai" },
    "GetRecord": {
      "record": {
        "header": { "identifier": "oai:cris.institucion.edu.pe:Publications/894518", "datestamp": "2026-02-20T12:00:00Z", "setSpec": "publications" },
        "metadata": {
          "Publication": {
            "@id": "Publications/894518",
            "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
            "Type": { "@xmlns": "https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types", "#text": "http://purl.org/coar/resource_type/c_6501" },
            "Title": [{ "#text": "Efecto de la altitud en la variabilidad climática" }],
            "DOI": "10.1234/abcd.2026.0001",
            "PublicationDate": "2026-01-15",
            "Language": "es",
            "Abstract": { "#text": "Resumen de ejemplo." }
          }
        }
      }
    }
  }
}
```

---

### Error OAI-PMH

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "responseDate": "2026-03-05T15:21:40Z",
    "request": { "@verb": "ListRecords", "@metadataPrefix": "perucris-cerif", "@set": "unknown", "#text": "https://cris.institucion.edu.pe/oai" },
    "error": { "@code": "noSetHierarchy", "#text": "El set solicitado no existe o no está habilitado." }
  }
}
```

---

## 8. URIs y vocabularios controlados

### Por entidad

| Entidad | URI / Scheme | Identificador |
|---------|-------------|---------------|
| **Person** | `http://purl.org/pe-repo/concytec/terminos#dni` | DNI |
| **Person** | `https://orcid.org` | ORCID |
| **Person** | `https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID` | ResearcherID (WoS) |
| **Person** | `https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID` | Scopus Author ID |
| **OrgUnit** | `https://purl.org/pe-repo/concytec/terminos#ruc` | RUC |
| **OrgUnit** | `https://ror.org` | ROR |
| **OrgUnit** | `https://www.grid.ac` | GRID |
| **OrgUnit** | `https://isni.org` | ISNI |
| **OrgUnit** | `https://purl.org/pe-repo/concytec/tipoOrganizacion` | Tipo de organización |
| **Funding** | `https://w3id.org/cerif/vocab/IdentifierTypes#AwardNumber` | N.° de contrato |
| **Funding** | `https://w3id.org/cerif/vocab/IdentifierTypes#FundRefID` | CrossRef Funder |
| **Project** | `https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference` | Código del proyecto |
| **Equipment** | `https://w3id.org/cerif/vocab/IdentifierTypes#CRISID` | ID institucional |
| **Equipment** | `https://w3id.org/cerif/vocab/IdentifierTypes#SerialNumber` | Número de serie |
| **Patent** | `http://data.epo.org/linked-data/def/ipc/` | Clasificación CIP |

### Vocabularios de clasificación (comunes)

| Scheme URI | Vocabulario |
|-----------|-------------|
| `https://purl.org/pe-repo/ocde/ford` | Campos de I+D OCDE (Frascati) |
| `https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types` | Tipos de publicación COAR |
| `http://purl.org/coar/version` | Versiones COAR |
| `https://www.openaire.eu/cerif-profile/vocab/LicenseTypes` | Tipos de licencia |
| `https://purl.org/pe-repo/renati/type` | Tipo de trabajo RENATI |
| `https://purl.org/pe-repo/renati/level` | Nivel académico RENATI |
| `https://purl.org/pe-repo/inei/cpesutpt` | Programas universitarios INEI |
| `http://id.nlm.nih.gov/mesh` | MeSH (NLM) |

### Namespace CERIF PerúCRIS

| Parámetro | Valor |
|-----------|-------|
| `metadataPrefix` | `perucris-cerif` |
| `metadataNamespace` | `https://purl.org/pe-repo/perucris/cerif` |
| `schema XSD` | `https://purl.org/pe-repo/perucris/cerif.xsd` |
| Formato OAI-PMH base | `http://www.openarchives.org/OAI/2.0/` |

### Formato de identificadores OAI

```
oai:{dominio_cris}:{NombreEntidad}/{InternalIdentifier}
```

**Ejemplos:**
```
oai:cris.unmsm.edu.pe:Publications/894518
oai:cris.unmsm.edu.pe:Persons/28521427
oai:cris.unmsm.edu.pe:Projects/358478
```

---

> **Fuentes oficiales:**
> • Directrices #PerúCRIS v1.1 — CONCYTEC, Junio 2024
> • Guía para creación de APIs JSON para Integración PerúCRIS — Oficina de TI CONCYTEC, Marzo 2026
> **Compatibilidad:** OpenAIRE Guidelines for CRIS Managers v1.1.1 · CERIF 1.5 · OAI-PMH 2.0
