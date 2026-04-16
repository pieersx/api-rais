# 🇵🇪 Guía para Creación de APIs con Formato JSON — Integración PerúCRIS
> **Fuente oficial:** Oficina de Tecnologías de Información — Software PERUCRIS — CONCYTEC
> **Fecha:** Marzo 2026
> **Protocolo:** OAI-PMH 2.0 + CERIF 1.5
> **metadataPrefix (guía JSON):** `perucris-cerif`
> **Namespace (guía JSON):** `https://purl.org/pe-repo/perucris/cerif`
> **metadataPrefix (XML oficial v1.1 - canónico):** `cerif_perucris`
> **Namespace (XML oficial v1.1 - canónico):** `https://purl.org/pe-repo/cerif-profile/1.0/`
> **Schema XSD (XML oficial v1.1 - canónico):** `https://purl.org/pe-repo/cerif-profile/1.0/perucris-cerif-profile.xsd`

---

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al servicio OAI-PMH](#2-acceso-al-servicio-oai-pmh)
   - [2.1 Identify](#21-identify)
   - [2.2 ListMetadataFormats](#22-listmetadataformats)
   - [2.3 ListSets](#23-listsets)
   - [2.4 ListRecords](#24-listrecords)
3. [Tipos de cosecha](#3-tipos-de-cosecha)
4. [Uso de ResumptionToken](#4-uso-de-resumptiontoken)
5. [Perfil de aplicación PerúCRIS (CERIF)](#5-perfil-de-aplicación-perúcris-cerif)
6. [Estructura general de los JSON](#6-estructura-general-de-los-json)
7. [JSON de Personas](#7-json-de-personas)
8. [JSON de OrgUnits](#8-json-de-orgunits)
9. [JSON de Publicaciones](#9-json-de-publicaciones)
10. [JSON de Equipamientos](#10-json-de-equipamientos)
11. [JSON de Patentes](#11-json-de-patentes)
12. [JSON de Financiamientos](#12-json-de-financiamientos)
13. [JSON de Proyectos](#13-json-de-proyectos)
14. [Respuestas de todos los verbos OAI-PMH](#14-respuestas-de-todos-los-verbos-oai-pmh)

---

## 1. Introducción

El objetivo principal de este documento es describir la forma en que las instituciones deben exponer la información de sus sistemas CRIS institucionales para permitir su interoperabilidad con la **Plataforma PerúCRIS**.

La interoperabilidad se realiza mediante el protocolo **OAI-PMH** (Open Archives Initiative - Protocol for Metadata Harvesting), el cual permite que la plataforma PerúCRIS coseche información estructurada desde sistemas externos.

Las instituciones deben implementar un **endpoint OAI-PMH** que permita consultar los metadatos de sus registros utilizando los verbos definidos por el protocolo. Estos metadatos deben seguir el **perfil de aplicación CERIF** adoptado por PerúCRIS.

> **Nota:** OAI-PMH es un protocolo basado en XML. Los ejemplos de este documento se presentan en formato **JSON** para facilitar integraciones y pruebas, manteniendo la misma información y jerarquía. La convención usada para mapear XML a JSON es: **atributos con prefijo `@`** y el **texto del nodo en `#text`**.

> **Nota técnica:** El XML oficial de PerúCRIS v1.1 es la fuente de verdad. Cuando esta guía JSON muestre valores adaptados para API - por ejemplo `metadataPrefix=perucris-cerif`, `metadataNamespace=https://purl.org/pe-repo/perucris/cerif` o sets abreviados como `persons` - debe prevalecer el equivalente canónico del perfil XML si se busca conformidad formal con PerúCRIS.

---

## 2. Acceso al servicio OAI-PMH

**URL base de ejemplo:** `https://cris.institucion.edu.pe/oai`

El endpoint OAI-PMH debe responder a los verbos principales del protocolo:

| Verbo | Uso principal | Ejemplo de request |
|-------|--------------|-------------------|
| `Identify` | Información del repositorio | `?verb=Identify` |
| `ListMetadataFormats` | Formatos disponibles (incluye `perucris-cerif` en esta guía JSON) | `?verb=ListMetadataFormats` |
| `ListSets` | Sets por entidad (persons, orgunits, ..., products) | `?verb=ListSets` |
| `ListIdentifiers` | Solo cabeceras (sin metadata) | `?verb=ListIdentifiers&metadataPrefix=perucris-cerif&set=publications` |
| `ListRecords` | Registros completos (cabecera + metadata) | `?verb=ListRecords&metadataPrefix=perucris-cerif&set=publications` |
| `GetRecord` | Un registro específico por identifier | `?verb=GetRecord&metadataPrefix=perucris-cerif&identifier=oai:...` |

> **Nota técnica:** Los `identifier` OAI deben seguir la forma `oai:{dominio}:{EntidadPlural}/{InternalIdentifier}`. El segmento de entidad es sensible a mayúsculas/minúsculas y debe mantenerse como `Persons`, `OrgUnits`, `Publications`, `Projects`, `Fundings`, `Equipments`, `Patents` o `Products`.

> **Nota técnica:** El segmento `{InternalIdentifier}` depende del sistema de origen. En implementaciones donde `Funding` se deriva de proyectos, el identificador interno puede ser project-backed, por ejemplo `Fundings/P13892`, sin alterar el contenedor canónico `Fundings/{id}`.

---

### 2.1 Identify

Permite obtener información general del repositorio o sistema CRIS institucional.

**Request:** `?verb=Identify`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:20:00Z",
    "request": {
      "@verb": "Identify",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
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

### 2.2 ListMetadataFormats

Permite identificar los formatos de metadatos soportados por el servicio. **En esta guía JSON debe incluir `perucris-cerif`.**

**Request:** `?verb=ListMetadataFormats`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:20:05Z",
    "request": {
      "@verb": "ListMetadataFormats",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListMetadataFormats": {
      "metadataFormat": [
        {
          "metadataPrefix": "oai_dc",
          "schema": "http://www.openarchives.org/OAI/2.0/oai_dc.xsd",
          "metadataNamespace": "http://www.openarchives.org/OAI/2.0/oai_dc/"
        },
        {
          "metadataPrefix": "perucris-cerif",
          "schema": "https://purl.org/pe-repo/perucris/cerif.xsd",
          "metadataNamespace": "https://purl.org/pe-repo/perucris/cerif"
        }
      ]
    }
  }
}
```

> **Nota técnica:** Si la interoperabilidad se valida estrictamente contra el perfil XML oficial, el formato canónico es `cerif_perucris` con `metadataNamespace=https://purl.org/pe-repo/cerif-profile/1.0/` y `schema=https://purl.org/pe-repo/cerif-profile/1.0/perucris-cerif-profile.xsd`. Los valores `perucris-cerif` y `https://purl.org/pe-repo/perucris/cerif` se conservan en esta guía como adaptación JSON para API.

---

### 2.3 ListSets

Permite conocer los conjuntos de registros disponibles para cosecha (por entidad).

**Request:** `?verb=ListSets`

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:20:10Z",
    "request": {
      "@verb": "ListSets",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListSets": {
      "set": [
        { "setSpec": "persons",      "setName": "Personas" },
        { "setSpec": "orgunits",     "setName": "Unidades organizativas" },
        { "setSpec": "publications", "setName": "Publicaciones" },
        { "setSpec": "projects",     "setName": "Proyectos" },
        { "setSpec": "fundings",     "setName": "Financiamientos" },
        { "setSpec": "equipments",   "setName": "Equipamientos" },
        { "setSpec": "patents",      "setName": "Patentes" },
        { "setSpec": "products",     "setName": "Productos de investigación" }
      ]
    }
  }
}
```

> **Nota técnica:** Los nombres cortos `persons`, `orgunits`, `publications`, `projects`, `fundings`, `equipments`, `patents` y `products` corresponden a la adaptación JSON de esta guía. En el XML oficial v1.1 los `setSpec` canónicos se documentan con prefijo `perucris_`.

---

### 2.4 ListRecords

Obtiene registros completos en formato CERIF.

**Parámetros clave:** `metadataPrefix`, `set`, `from`, `until`, `resumptionToken`

**Regla general de paginación:**
- Si la respuesta trae `resumptionToken` con texto (`#text` no vacío) → hay más páginas → repetir llamada usando ese token.
- Si no viene token o viene vacío → fin.

#### 2.4.1 Cosecha completa (sin `from` ni `until`)

```
?verb=ListRecords&metadataPrefix=perucris-cerif&set=projects
```

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:00Z",
    "request": {
      "@verb": "ListRecords",
      "@metadataPrefix": "perucris-cerif",
      "@set": "projects",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListRecords": {
      "record": [
        {
          "header": {
            "identifier": "oai:cris.institucion.edu.pe:Projects/1001",
            "datestamp": "2026-02-20T12:00:00Z",
            "setSpec": "projects"
          },
          "metadata": {
            "Project": {
              "@id": "Projects/1001",
              "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
              "Title": [
                { "@xml:lang": "es", "#text": "Proyecto ejemplo" }
              ]
            }
          }
        }
      ],
      "resumptionToken": {
        "@cursor": "0",
        "@completeListSize": "250",
        "#text": "eyJwYWdlIjoyfQ=="
      }
    }
  }
}
```

> **Cuándo usarlo:** primera carga total, o si no tienes checkpoint.

#### 2.4.2 Cosecha incremental (con `from` y `until`)

```
?verb=ListRecords&metadataPrefix=perucris-cerif&set=projects
&from=2026-02-20T00:00:00Z&until=2026-03-05T23:59:59Z
```

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:00Z",
    "request": {
      "@verb": "ListRecords",
      "@metadataPrefix": "perucris-cerif",
      "@set": "projects",
      "@from": "2026-02-20T00:00:00Z",
      "@until": "2026-03-05T23:59:59Z",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListRecords": {
      "record": [
        {
          "header": {
            "identifier": "oai:cris.institucion.edu.pe:Projects/1001",
            "datestamp": "2026-02-20T12:00:00Z",
            "setSpec": "projects"
          },
          "metadata": { "Project": { "@id": "Projects/1001" } }
        }
      ],
      "resumptionToken": {
        "@cursor": "0",
        "@completeListSize": "80",
        "#text": "eyJwYWdlIjoyfQ=="
      }
    }
  }
}
```

> **Cuándo usarlo:** cuando ya tienes un "checkpoint" (`lastDatestamp`) y quieres traer solo lo nuevo/modificado.

#### 2.4.3 Continuación con `resumptionToken` ✅ (forma correcta OAI-PMH)

```
?verb=ListRecords&resumptionToken=eyJwYWdlIjoyfQ==
```

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:10Z",
    "request": {
      "@verb": "ListRecords",
      "@resumptionToken": "eyJwYWdlIjoyfQ==",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListRecords": {
      "resumptionToken": {
        "@cursor": "100",
        "@completeListSize": "250",
        "#text": "eyJwYWdlIjozfQ=="
      }
    }
  }
}
```

> **Cuándo usarlo:** siempre que el servidor devuelva token (paginación).

#### 2.4.4 `resumptionToken` + `from`/`until` ❌ (inválido en OAI-PMH)

```
?verb=ListRecords&resumptionToken=eyJwYWdlIjoyfQ==
&from=2026-02-20T00:00:00Z&until=2026-03-05T23:59:59Z
```

> **Cuándo usarlo:** no debe usarse. Una vez emitido `resumptionToken`, la continuación debe enviarse solo con ese token.

> **Nota técnica:** No se deben reenviar `metadataPrefix`, `set`, `from` ni `until` cuando ya existe `resumptionToken`. Si esos parámetros se mezclan, la implementación debería responder `badArgument`.

---

## 3. Tipos de cosecha

### 3.1 Cosecha inicial

Es la primera recolección de información que realiza la plataforma PerúCRIS.

- Se recuperan **todos** los registros disponibles.
- **No** se especifica una fecha `from`.
- El sistema devuelve el conjunto completo de datos.

```
?verb=ListRecords
&metadataPrefix=perucris-cerif
&set=projects
```

### 3.2 Cosecha iterativa o incremental

Se utiliza cuando ya existe una cosecha previa.

- Se recuperan solo los registros **modificados o creados** dentro de un rango de fechas.
- Se utilizan los parámetros `from` y `until`.

```
?verb=ListRecords
&metadataPrefix=perucris-cerif
&set=projects
&from=2026-02-25T08:25:39Z
&until=2027-01-07T23:05:48Z
```

> **Nota técnica:** Si una respuesta incremental devuelve `resumptionToken`, las llamadas siguientes continúan exclusivamente con `?verb=ListRecords&resumptionToken=...` hasta agotar la cosecha.

---

## 4. Uso de ResumptionToken

Cuando hay muchos registros, el servidor puede devolver resultados por bloques. En ese caso retorna `resumptionToken` para continuar.

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:10Z",
    "request": {
      "@verb": "ListRecords",
      "@resumptionToken": "eyJwYWdlIjoyfQ==",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListRecords": {
      "resumptionToken": {
        "@cursor": "100",
        "@completeListSize": "250",
        "#text": "eyJwYWdlIjozfQ=="
      }
    }
  }
}
```

| Campo | Descripción |
|-------|-------------|
| `@cursor` | Posición actual en el conjunto completo |
| `@completeListSize` | Total de registros en el conjunto |
| `#text` | Token opaco devuelto por el servidor para solicitar la siguiente página |

> **Nota técnica:** El `resumptionToken` no debe interpretarse ni reconstruirse en cliente. Puede expirar, cambiar de formato o no estar codificado en Base64.

---

## 5. Perfil de aplicación PerúCRIS (CERIF)

Las principales entidades definidas en el perfil de aplicación son:

| Entidad | Set OAI-PMH |
|---------|-------------|
| `Person` | `persons` |
| `OrgUnit` | `orgunits` |
| `Publication` | `publications` |
| `Patent` | `patents` |
| `Equipment` | `equipments` |
| `Funding` | `fundings` |
| `Project` | `projects` |
| `Product` | `products` |

**Reglas clave:**
- El uso de los elementos definidos es **obligatorio**.
- No se deben utilizar elementos o vocabularios **diferentes** a los establecidos en el perfil.
- La estructura semántica se basa preferentemente en **CERIF 1.5**.

> **Nota técnica:** `Product` forma parte del perfil XML oficial de PerúCRIS v1.1. Esta guía lo menciona por referencia en sets y relaciones, aunque no incluya una sección independiente con ejemplo completo.

---

## 6. Estructura general de los JSON

Cada entidad mantiene:
- `id` estable (ej. `Persons/…`, `OrgUnits/…`)
- `identifiers` como lista con `scheme` + `value` por defecto; en `Publication` esta guía usa `type` + `value` para reflejar elementos XML dedicados como `DOI`, `ISSN` o `Handle`
- Campos multilenguaje como lista (`lang`/`value`)
- Relaciones por referencia (`id`) o por objeto anidado según necesidad
- `lastModified` para soporte de cosecha incremental

> **Nota técnica:** No se debe mezclar `scheme` y `type` dentro de un mismo arreglo `identifiers`. Cuando se serializa una proyección XML fiel, también deben preservarse atributos como `@xml:lang` y cardinalidades repetibles.

```json
{
  "id": "EntityType/123",
  "title": [
    { "lang": "es", "value": "..." },
    { "lang": "en", "value": "..." }
  ],
  "identifiers": [
    { "scheme": "...", "value": "..." }
  ],
  "relations": [
    {
      "type": "...",
      "target": { "id": "..." }
    }
  ],
  "lastModified": "2026-02-20T12:00:00Z"
}
```

---

## 7. JSON de Personas

Ejemplo completo con identificadores (DNI, ORCID, ResearcherID, Scopus Author ID) y afiliaciones a OrgUnits.

```json
{
  "id": "Persons/28521427",
  "personName": {
    "familyNames": "Cabrera Sánchez",
    "firstNames": "Paolo Edgar",
    "fullName": "Paolo Edgar Cabrera Sánchez"
  },
  "identifiers": [
    {
      "scheme": "http://purl.org/pe-repo/concytec/terminos#dni",
      "value": "08755499"
    },
    {
      "scheme": "https://orcid.org",
      "value": "https://orcid.org/0000-0001-8247-8975"
    },
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID",
      "value": "HRC-7754-2023"
    },
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID",
      "value": "57123456789"
    }
  ],
  "emails": [
    "mailto:paolo.cabrera@unica.edu.pe"
  ],
  "affiliations": [
    {
      "orgUnit": {
        "id": "OrgUnits/38498322",
        "name": "Universidad Nacional San Luis Gonzaga"
      },
      "role": "Autor",
      "startDate": "2020-01-01"
    }
  ],
  "keywords": [
    { "value": "Ciencias veterinarias" }
  ],
  "lastModified": "2026-02-20T12:00:00Z"
}
```

### Campos de Person

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador interno `Persons/{id}` |
| `personName.familyNames` | string | Apellidos |
| `personName.firstNames` | string | Nombres |
| `personName.fullName` | string | Nombre completo |
| `identifiers` | array | Lista de identificadores con `scheme` + `value` |
| `emails` | array | Lista de correos electrónicos en formato URI (`mailto:`) |
| `affiliations` | array | Afiliaciones a OrgUnits con `role` y `startDate` |
| `keywords` | array | Palabras clave |
| `lastModified` | datetime (ISO 8601) | Fecha de última modificación |

### Schemes de identificadores para Person

| Scheme URI | Identificador |
|-----------|--------------|
| `http://purl.org/pe-repo/concytec/terminos#dni` | DNI |
| `https://orcid.org` | ORCID |
| `https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID` | ResearcherID (WoS) |
| `https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID` | Scopus Author ID |

---

## 8. JSON de OrgUnits

Ejemplo completo con identificadores institucionales (RUC, ROR, GRID, ISNI), jerarquía (`partOf`) y datos de ubicación.

```json
{
  "id": "OrgUnits/38498322",
  "acronym": "UNSLG",
  "name": [
    { "lang": "es", "value": "Universidad Nacional San Luis Gonzaga" },
    { "lang": "en", "value": "National University San Luis Gonzaga" }
  ],
  "type": "Institución principal",
  "identifiers": [
    {
      "scheme": "https://purl.org/pe-repo/concytec/terminos#ruc",
      "value": "20148421014"
    },
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#RORID",
      "value": "012345678"
    },
    {
      "scheme": "https://www.grid.ac",
      "value": "grid.12345.6"
    },
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ISNI",
      "value": "0000000123456789"
    }
  ],
  "countryCode": "PE",
  "address": {
    "street": "Av. Universidad 123",
    "city": "Ica",
    "region": "Ica",
    "postalCode": "11001"
  },
  "partOf": {
    "orgUnit": {
      "id": "OrgUnits/00000001"
    }
  },
  "websites": [
    { "type": "homepage", "url": "https://www.unica.edu.pe" },
    { "type": "cris",     "url": "https://cris.unica.edu.pe" }
  ],
  "classifications": [
    {
      "scheme": "https://purl.org/pe-repo/concytec/tipoOrganizacion",
      "value": "Institución principal"
    }
  ],
  "lastModified": "2026-02-20T12:00:00Z"
}
```

> **Nota técnica:** En la jerarquía XML oficial la relación padre-hijo se expresa con `partOf`, no con `parentOrgUnit`. Además, `ROR` e `ISNI` deben tiparse con sus URIs CERIF (`#RORID`, `#ISNI`) y no con los resolvers públicos. Si la unidad organizativa es la raíz institucional, el campo `partOf` debe omitirse.

### Campos de OrgUnit

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador interno `OrgUnits/{id}` |
| `acronym` | string | Acrónimo institucional |
| `name` | array | Nombre(s) en diferentes idiomas |
| `type` | string | Tipo de organización (`Institución principal` / `Dependencia`); no sustituye clasificaciones URI |
| `identifiers` | array | RUC, ROR, GRID, ISNI, etc. |
| `countryCode` | string | ISO 3166 (ej. `"PE"`) |
| `address` | object | Dirección postal |
| `partOf` | object | Referencia a la unidad padre |
| `websites` | array | URLs (`homepage`, `cris`, etc.) |
| `classifications` | array | Clasificaciones con `scheme` + `value` |
| `lastModified` | datetime | Fecha de última modificación |

### Schemes de identificadores para OrgUnit

| Scheme URI | Identificador |
|-----------|--------------|
| `https://purl.org/pe-repo/concytec/terminos#ruc` | RUC (SUNAT) |
| `https://w3id.org/cerif/vocab/IdentifierTypes#RORID` | ROR |
| `https://www.grid.ac` | GRID |
| `https://w3id.org/cerif/vocab/IdentifierTypes#ISNI` | ISNI |

> **Nota técnica:** `GRID` puede transportarse como identificador suplementario cuando exista en el sistema de origen, pero no reemplaza los tipos canónicos CERIF usados para `ROR`, `ISNI` o `ScopusAffiliationID`.

---

## 9. JSON de Publicaciones

Ejemplo completo con identificadores (Handle, DOI, ISBN, ISSN, PMCID, ISI, SCP, URL), autores, editores, publicador, fechas, idioma, licencia, relaciones (`publishedIn`/`partOf`), origen (proyecto/financiamiento) y metadatos RENATI.

```json
{
  "id": "Publications/894518",
  "type": {
    "scheme": "https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types",
    "value": "http://purl.org/coar/resource_type/c_0640"
  },
  "title": [
    { "lang": "es", "value": "Epidemiología de la sarna sarcóptica en vicuñas silvestres del Perú" },
    { "lang": "en", "value": "Epidemiology of sarcoptic mange in wild vicuñas of Peru" }
  ],
  "identifiers": [
    { "type": "Handle",     "value": "https://hdl.handle.net/20.500.12345/9876" },
    { "type": "DOI",        "value": "10.15381/pc.v24i1.16559" },
    { "type": "ISBN",       "value": "978-9972-674-04-4" },
    { "type": "ISSN",       "value": "1609-9117" },
    { "type": "PMCID",      "value": "PMC7425445" },
    { "type": "ISI-Number", "value": "000245099300013" },
    { "type": "SCP-Number", "value": "2-s2.0-85045579729" },
    { "type": "URL",        "value": "http://www.revistas.uni.edu.pe/index.php/devenir/article/view/757/1288" }
  ],
  "publishedIn": {
    "publication": {
      "id": "Publications/REV001",
      "type": "http://purl.org/coar/resource_type/c_0640",
      "title": [{ "lang": "es", "value": "Revista de Investigaciones Veterinarias del Perú" }],
      "issn": ["1609-9117"]
    }
  },
  "partOf": {
    "publication": {
      "id": "Publications/756818",
      "type": "http://purl.org/coar/resource_type/c_2f33",
      "title": [{ "lang": "es", "value": "Salud, interculturalidad y comportamiento de riesgo" }],
      "isbn": ["978-9972-615-58-0"]
    }
  },
  "authors": [
    {
      "person": {
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
        "emails": ["mailto:paolo.cabrera@unica.edu.pe"],
        "affiliations": [
          {
            "orgUnit": {
              "id": "OrgUnits/38498322",
              "name": "Universidad Nacional San Luis Gonzaga"
            },
            "role": "Autor",
            "startDate": "2020-01-01"
          }
        ],
        "keywords": [{ "value": "Ciencias veterinarias" }],
        "lastModified": "2026-02-20T12:00:00Z"
      },
      "affiliations": [
        {
          "orgUnit": {
            "id": "OrgUnits/38498322",
            "acronym": "UNSLG",
            "name": [
              { "lang": "es", "value": "Universidad Nacional San Luis Gonzaga" },
              { "lang": "en", "value": "National University San Luis Gonzaga" }
            ],
            "type": "Institución principal",
            "identifiers": [
              { "scheme": "https://purl.org/pe-repo/concytec/terminos#ruc", "value": "20148421014" },
              { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#RORID", "value": "012345678" },
              { "scheme": "https://www.grid.ac", "value": "grid.12345.6" },
              { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ISNI", "value": "0000000123456789" }
            ],
            "countryCode": "PE",
            "address": { "street": "Av. Universidad 123", "city": "Ica", "region": "Ica", "postalCode": "11001" },
            "partOf": { "orgUnit": { "id": "OrgUnits/00000001" } },
            "websites": [
              { "type": "homepage", "url": "https://www.unica.edu.pe" },
              { "type": "cris", "url": "https://cris.unica.edu.pe" }
            ],
            "classifications": [
              { "scheme": "https://purl.org/pe-repo/concytec/tipoOrganizacion", "value": "Institución principal" }
            ],
            "lastModified": "2026-02-20T12:00:00Z"
          }
        }
      ],
      "order": 1
    },
    {
      "person": {
        "id": "Persons/28579219",
        "personName": {
          "familyNames": "Malpartida Morales",
          "firstNames": "María Luisa",
          "fullName": "María Luisa Malpartida Morales"
        },
        "identifiers": [
          { "scheme": "https://orcid.org", "value": "https://orcid.org/0000-0005-8754-877X" }
        ]
      },
      "affiliations": [
        {
          "orgUnit": {
            "id": "OrgUnits/39314778544",
            "name": [{ "lang": "es", "value": "Universidad Peruana Cayetano Heredia" }],
            "identifiers": [{ "scheme": "https://purl.org/pe-repo/concytec/terminos#ruc", "value": "20110768151" }]
          }
        }
      ],
      "order": 2
    }
  ],
  "editors": [
    {
      "person": {
        "id": "Persons/21258497",
        "personName": {
          "familyNames": "Manrique Olivera",
          "firstNames": "Paola Judith",
          "fullName": "Paola Judith Manrique Olivera"
        },
        "identifiers": [
          { "scheme": "https://orcid.org", "value": "https://orcid.org/0000-0001-2874-9888" }
        ]
      },
      "order": 1
    }
  ],
  "publishers": [
    {
      "orgUnit": {
        "id": "OrgUnits/3082885",
        "name": [{ "lang": "es", "value": "Universidad Nacional Agraria La Molina" }]
      }
    }
  ],
  "publicationDate": "2013-08-25",
  "number": "5",
  "volume": "8",
  "issue": "2",
  "edition": "2a ed.",
  "startPage": "285",
  "endPage": "309",
  "language": ["es", "en"],
  "license": [
    {
      "scheme": "https://www.openaire.eu/cerif-profile/vocab/LicenseTypes",
      "value": "CCAttribution(CCBY)"
    },
    { "url": "https://creativecommons.org/licenses/by/4.0/" }
  ],
  "originatesFrom": [
    {
      "project": {
        "id": "Projects/358478",
        "title": [{ "lang": "es", "value": "Sarna en vicuñas: epidemiología y estrategias para su prevención y control" }],
        "acronym": "SARNAVIC",
        "identifiers": [
          { "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference", "value": "160-2017" }
        ],
        "startDate": "2017-01-01",
        "endDate": "2020-10-31",
        "status": "https://purl.org/pe-repo/concytec/estadoProyecto#concluido",
        "abstract": [{ "lang": "es", "value": "Proyecto de ejemplo para interoperabilidad." }],
        "keywords": [{ "lang": "es", "value": "Vicuñas" }, { "lang": "es", "value": "Epidemiología" }],
        "subjects": [
          { "scheme": "https://purl.org/pe-repo/ocde/ford", "value": "https://purl.org/pe-repo/ocde/ford#1.06.05" }
        ],
        "participants": [
          { "person": { "id": "Persons/28521427", "name": "Paolo Edgar Cabrera Sánchez" }, "role": "Investigador" },
          { "orgUnit": { "id": "OrgUnits/38498322", "name": "Universidad Nacional San Luis Gonzaga" }, "role": "Institución ejecutora" }
        ],
        "fundings": [{ "id": "Fundings/187597" }],
        "outputs": { "publications": ["Publications/894518"], "patents": [], "products": [] },
        "url": "https://cris.institucion.edu.pe/projects/358478",
        "lastModified": "2026-02-22T09:10:00Z"
      }
    },
    {
      "funding": {
        "id": "Fundings/187597",
        "title": [{ "lang": "es", "value": "Contrato No. 08-2019-FONDECYT" }],
        "type": {
          "scheme": "https://www.openaire.eu/cerif-profile/vocab/OpenAIRE_Funding_Types",
          "value": "https://www.openaire.eu/cerif-profile/vocab/OpenAIRE_Funding_Types#Grant"
        },
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
        "amount": { "value": 250000, "currency": "PEN" },
        "startDate": "2019-01-01",
        "endDate": "2020-12-31",
        "relatedProjects": ["Projects/358478"],
        "url": "https://funder.example.pe/awards/08-2019-FON-DECYT",
        "lastModified": "2026-02-22T09:10:00Z"
      }
    }
  ],
  "abstract": [
    { "lang": "es", "value": "Este proyecto multidisciplinar e interinstitucional..." },
    { "lang": "en", "value": "This multidisciplinary and inter-institutional project..." }
  ],
  "version": {
    "scheme": "http://purl.org/coar/version",
    "value": "http://purl.org/coar/version/c_970fb48d4fbd8a85"
  },
  "keywords": [
    { "lang": "es", "value": "Silvicultura" },
    { "lang": "en", "value": "Forestry" }
  ],
  "subjects": [
    { "scheme": "https://purl.org/pe-repo/ocde/ford", "value": "https://purl.org/pe-repo/ocde/ford#3.03.05" },
    { "scheme": "http://id.nlm.nih.gov/mesh", "value": "Epidemiological Surveillance" }
  ],
  "sponsorship": [
    { "value": "Esta investigación se llevó a cabo en el marco de..." }
  ],
  "advisors": [
    {
      "person": {
        "id": "Persons/2185655",
        "personName": {
          "familyNames": "Gutiérrez González",
          "firstNames": "Martín Eduardo",
          "fullName": "Martín Eduardo Gutiérrez González"
        },
        "identifiers": [{ "scheme": "http://purl.org/pe-repo/concytec/terminos#dni", "value": "08755499" }]
      }
    }
  ],
  "renatiType": {
    "scheme": "https://purl.org/pe-repo/renati/type",
    "value": "https://purl.org/pe-repo/renati/type#tesis"
  },
  "inSupportOf": {
    "qualification": {
      "title": "Maestro en Banca y Finanzas",
      "type": {
        "scheme": "https://purl.org/pe-repo/renati/level",
        "value": "https://purl.org/pe-repo/renati/level#maestro"
      },
      "discipline": {
        "scheme": "https://purl.org/pe-repo/inei/cpesutpt",
        "value": "412077"
      },
      "grantor": {
        "orgUnit": {
          "id": "OrgUnits/587498",
          "name": [{ "lang": "es", "value": "Facultad de Ingeniería" }],
          "partOf": {
            "orgUnit": {
              "id": "OrgUnits/128753",
              "acronym": "UPC",
              "name": [{ "lang": "es", "value": "Universidad Peruana de Ciencias Aplicadas" }],
              "identifiers": [{ "scheme": "https://purl.org/pe-repo/concytec/terminos#ruc", "value": "20211614545" }]
            }
          }
        }
      },
      "jurors": [
        {
          "person": {
            "id": "Persons/288725",
            "personName": {
              "familyNames": "Mariátegui Suarez",
              "firstNames": "Miriam Josefina",
              "fullName": "Miriam Josefina Mariátegui Suarez"
            },
            "identifiers": [{ "scheme": "http://purl.org/pe-repo/concytec/terminos#dni", "value": "10274587" }]
          }
        },
        {
          "person": {
            "id": "Persons/288726",
            "personName": {
              "familyNames": "Lozada Martin",
              "firstNames": "Rubén Jesús",
              "fullName": "Rubén Jesús Lozada Martin"
            },
            "identifiers": [{ "scheme": "http://purl.org/pe-repo/concytec/terminos#dni", "value": "08974125" }]
          }
        }
      ]
    }
  },
  "lastModified": "2026-02-20T12:00:00Z"
}
```

> **Nota técnica:** En `Publication`, esta guía usa `identifiers[]` con `type` para reflejar elementos XML dedicados (`DOI`, `ISSN`, `Handle`, etc.). No debe mezclarse `type` con `scheme` dentro del mismo arreglo. Además, `publishedIn` y `partOf` deben apuntar a recursos relacionados distintos del registro actual.

> **Nota técnica:** La relación interoperable canónica de `originatesFrom` se satisface con referencias por `id`. Si se embeben atributos adicionales de `Project` o `Funding`, deben entenderse como expansión local de conveniencia y no como sustituto del vínculo CERIF canónico.

---

## 10. JSON de Equipamientos

Ejemplo completo con identificadores (CRISID, serial), propietario (OrgUnit), ubicación y relación con productos/resultados.

```json
{
  "id": "Equipments/82394874",
  "name": [
    { "lang": "es", "value": "Cromatógrafo de gases con detector de flama o llama" }
  ],
  "identifiers": [
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#CRISID",
      "value": "F.5618"
    },
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#SerialNumber",
      "value": "SN-CHROM-000123"
    }
  ],
  "type": "https://purl.org/pe-repo/concytec/equipamiento#cromatografos",
  "description": [
    { "lang": "es", "value": "Equipo utilizado para análisis químico." }
  ],
  "owner": {
    "orgUnit": {
      "id": "OrgUnits/38498322",
      "name": "Universidad Nacional San Luis Gonzaga"
    }
  },
  "location": {
    "campus": "Sede Central",
    "lab": "Laboratorio de Química Analítica"
  },
  "generatedOutputs": [
    "Products/258746"
  ],
  "url": "https://cris.institucion.edu.pe/equipment/82394874",
  "lastModified": "2026-02-18T11:00:00Z"
}
```

> **Nota técnica:** `type` en `Equipment` debe usar el vocabulario oficial de tipos de equipamiento definido para PerúCRIS, no un tipo COAR de resultado. El campo `generatedOutputs` se conserva aquí solo como vista inversa/local; la relación canónica del perfil XML se expresa desde `Product` mediante `generatedBy`.

---

## 11. JSON de Patentes

Ejemplo completo con número, inventores, titulares, emisor, fechas, país, materias (IPC) y relación con proyectos/financiamientos.

```json
{
  "id": "Patents/284788",
  "type": "http://purl.org/coar/resource_type/9DKX-KSAF",
  "patentNumber": "000056-2010",
  "title": [
    { "lang": "es", "value": "Válvula check para un circuito cerrado de bombeo de aire para un envase dispensador" }
  ],
  "inventors": [
    {
      "person": {
        "id": "Persons/2016875",
        "name": "Lizeth María Zárate Aguilar",
        "identifiers": [{ "scheme": "http://purl.org/pe-repo/concytec/terminos#dni", "value": "07928457" }]
      }
    },
    {
      "person": {
        "id": "Persons/2875998",
        "name": "Marco Antonio Chaco Gómez",
        "identifiers": [{ "scheme": "https://orcid.org", "value": "https://orcid.org/0000-0001-7291-6401" }]
      }
    }
  ],
  "holders": [
    {
      "orgUnit": {
        "id": "OrgUnits/385244",
        "name": "Industrias Arguelles y Servicios Generales",
        "identifiers": [{ "scheme": "https://purl.org/pe-repo/concytec/terminos#ruc", "value": "20173136499" }]
      }
    }
  ],
  "issuer": {
    "orgUnit": {
      "id": "OrgUnits/355471",
      "acronym": "INDECOPI",
      "name": "Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual"
    }
  },
  "registrationDate": "2010-01-25",
  "approvalDate": "2012-01-16",
  "countryCode": "PE",
  "language": ["es"],
  "abstract": [
    { "lang": "es", "value": "Resumen técnico de la patente (ejemplo)." }
  ],
  "subjects": [
    {
      "scheme": "http://data.epo.org/linked-data/def/ipc/",
      "value": "http://data.epo.org/linked-data/def/ipc/A47K5-12"
    }
  ],
  "keywords": [
    { "value": "Dispensadores para jabón" }
  ],
  "url": "https://servicio.indecopi.gob.pe/portalSAE/Expedientes/consultaOIN.jsp?...",
  "originatesFrom": [
    { "project": { "id": "Projects/358478" } },
    { "funding": { "id": "Fundings/187597" } }
  ],
  "lastModified": "2026-02-19T08:00:00Z"
}
```

---

## 12. JSON de Financiamientos

Ejemplo completo con award number, funder, monto, fechas y relación a proyectos.

> **Nota técnica:** El contenedor normativo sigue siendo `Fundings/{id}`. El valor concreto de `{id}` depende del sistema de origen; en implementaciones project-backed puede usar formas como `Fundings/P13892`, siempre que se mantenga consistencia en relaciones e identificadores OAI.

```json
{
  "id": "Fundings/187597",
  "title": [
    { "lang": "es", "value": "Contrato No. 08-2019-FONDECYT" }
  ],
  "type": {
    "scheme": "https://www.openaire.eu/cerif-profile/vocab/OpenAIRE_Funding_Types",
    "value": "https://www.openaire.eu/cerif-profile/vocab/OpenAIRE_Funding_Types#Grant"
  },
  "identifiers": [
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#AwardNumber",
      "value": "08-2019-FON-DECYT"
    },
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#FundRefID",
      "value": "http://dx.doi.org/10.13039/501100010751"
    }
  ],
  "fundedBy": {
    "orgUnit": {
      "id": "OrgUnits/854622",
      "acronym": "FONDECYT",
      "name": "Fondo Nacional de Desarrollo Científico, Tecnológico y de Innovación Tecnológica"
    }
  },
  "amount": {
    "value": 250000,
    "currency": "PEN"
  },
  "startDate": "2019-01-01",
  "endDate": "2020-12-31",
  "relatedProjects": [
    "Projects/358478"
  ],
  "url": "https://funder.example.pe/awards/08-2019-FON-DECYT",
  "lastModified": "2026-02-22T09:10:00Z"
}
```

> **Nota técnica:** `Funding.type` es obligatorio y debe tiparse con `OpenAIRE_Funding_Types`. Los montos se representan como enteros sin decimales en los ejemplos alineados con PerúCRIS v1.1.

---

## 13. JSON de Proyectos

Ejemplo completo con participantes (personas y OrgUnits), estado, fechas, palabras clave, áreas OCDE y salidas vinculadas.

```json
{
  "id": "Projects/358478",
  "title": [
    {
      "lang": "es",
      "value": "Sarna en vicuñas: epidemiología y estrategias para su prevención y control"
    }
  ],
  "acronym": "SARNAVIC",
  "identifiers": [
    {
      "scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference",
      "value": "160-2017"
    }
  ],
  "startDate": "2017-01-01",
  "endDate": "2020-10-31",
  "status": "https://purl.org/pe-repo/concytec/estadoProyecto#concluido",
  "abstract": [
    { "lang": "es", "value": "Proyecto de ejemplo para interoperabilidad." }
  ],
  "keywords": [
    { "lang": "es", "value": "Vicuñas" },
    { "lang": "es", "value": "Epidemiología" }
  ],
  "subjects": [
    {
      "scheme": "https://purl.org/pe-repo/ocde/ford",
      "value": "https://purl.org/pe-repo/ocde/ford#1.06.05"
    }
  ],
  "participants": [
    {
      "person": {
        "id": "Persons/28521427",
        "name": "Paolo Edgar Cabrera Sánchez"
      },
      "role": "Investigador"
    },
    {
      "orgUnit": {
        "id": "OrgUnits/38498322",
        "name": "Universidad Nacional San Luis Gonzaga"
      },
      "role": "Institución ejecutora"
    }
  ],
  "fundings": [
    { "id": "Fundings/187597" }
  ],
  "outputs": {
    "publications": ["Publications/894518"],
    "patents": [],
    "products": []
  },
  "url": "https://cris.institucion.edu.pe/projects/358478",
  "lastModified": "2026-02-22T09:10:00Z"
}
```

> **Nota técnica:** `status` en `Project` debe usar la URI controlada del vocabulario `estadoProyecto`; literales libres como `completed` no son canónicos para interoperabilidad PerúCRIS.

> **Nota técnica:** El bloque `outputs` se conserva como vista inversa/local para facilitar consumo de API, pero no sustituye el intercambio canónico del perfil XML. Las relaciones oficiales se expresan desde `Publication`, `Patent` o `Product` hacia `Project`/`Funding` mediante `originatesFrom`.

---

## 14. Respuestas de todos los verbos OAI-PMH

> **Nota técnica:** Los bloques de esta sección son proyecciones JSON de envelopes XML OAI-PMH. Cuando se requiera conformidad estricta con el XML oficial de PerúCRIS v1.1, los valores canónicos son `metadataPrefix=cerif_perucris`, `metadataNamespace=https://purl.org/pe-repo/cerif-profile/1.0/` y `schema=https://purl.org/pe-repo/cerif-profile/1.0/perucris-cerif-profile.xsd`. En los ejemplos se conserva `perucris-cerif` como adaptación JSON de esta guía.

> **Referencia cruzada:** Para el marco normativo, la semántica de errores OAI-PMH y las equivalencias canónicas XML/JSON, ver `docs/Directrices-perucris.md`. La sección 2 de esta guía mantiene el resumen operativo por verbo.

### 14.1 Identify

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
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

### 14.2 ListMetadataFormats

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:20:05Z",
    "request": { "@verb": "ListMetadataFormats", "#text": "https://cris.institucion.edu.pe/oai" },
    "ListMetadataFormats": {
      "metadataFormat": [
        {
          "metadataPrefix": "oai_dc",
          "schema": "http://www.openarchives.org/OAI/2.0/oai_dc.xsd",
          "metadataNamespace": "http://www.openarchives.org/OAI/2.0/oai_dc/"
        },
        {
          "metadataPrefix": "perucris-cerif",
          "schema": "https://purl.org/pe-repo/perucris/cerif.xsd",
          "metadataNamespace": "https://purl.org/pe-repo/perucris/cerif"
        }
      ]
    }
  }
}
```

### 14.3 ListSets

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
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
        { "setSpec": "patents",      "setName": "Patentes" },
        { "setSpec": "products",     "setName": "Productos de investigación" }
      ]
    }
  }
}
```

### 14.4 ListIdentifiers

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:20Z",
    "request": {
      "@verb": "ListIdentifiers",
      "@metadataPrefix": "perucris-cerif",
      "@set": "publications",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListIdentifiers": {
      "header": [
        {
          "identifier": "oai:cris.institucion.edu.pe:Publications/894518",
          "datestamp": "2026-02-20T12:00:00Z",
          "setSpec": "publications"
        },
        {
          "identifier": "oai:cris.institucion.edu.pe:Publications/894519",
          "datestamp": "2026-02-21T10:30:00Z",
          "setSpec": "publications"
        }
      ],
      "resumptionToken": {
        "@cursor": "0",
        "@completeListSize": "250",
        "#text": "eyJwYWdlIjoyfQ=="
      }
    }
  }
}
```

### 14.5 ListRecords (primera página)

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:00Z",
    "request": {
      "@verb": "ListRecords",
      "@metadataPrefix": "perucris-cerif",
      "@set": "publications",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListRecords": {
      "record": [
        {
          "header": {
            "identifier": "oai:cris.institucion.edu.pe:Publications/894518",
            "datestamp": "2026-02-20T12:00:00Z",
            "setSpec": "publications"
          },
          "metadata": {
            "Publication": {
              "@id": "Publications/894518",
              "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
              "Type": {
                "@xmlns": "https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types",
                "#text": "http://purl.org/coar/resource_type/c_6501"
              },
              "Title": [
                { "@xml:lang": "es", "#text": "Efecto de la altitud en la variabilidad climática" },
                { "@xml:lang": "en", "#text": "Effect of altitude on climate variability" }
              ],
              "DOI": "10.1234/abcd.2026.0001",
              "Handle": "https://hdl.handle.net/20.500.12345/9876",
              "PublicationDate": "2026-01-15",
              "Language": ["es"],
              "Abstract": [
                { "@xml:lang": "es", "#text": "Resumen de ejemplo." }
              ],
              "Keyword": [
                { "@xml:lang": "es", "#text": "Clima" }
              ],
              "Subject": [
                {
                  "@scheme": "https://purl.org/pe-repo/ocde/ford",
                  "#text": "https://purl.org/pe-repo/ocde/ford#1.05.01"
                }
              ]
            }
          }
        }
      ],
      "resumptionToken": {
        "@cursor": "0",
        "@completeListSize": "250",
        "#text": "eyJwYWdlIjoyfQ=="
      }
    }
  }
}
```

### 14.6 ListRecords (continuación con token)

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:10Z",
    "request": {
      "@verb": "ListRecords",
      "@resumptionToken": "eyJwYWdlIjoyfQ==",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "ListRecords": {
      "resumptionToken": {
        "@cursor": "100",
        "@completeListSize": "250",
        "#text": "eyJwYWdlIjozfQ=="
      }
    }
  }
}
```

### 14.7 GetRecord

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:30Z",
    "request": {
      "@verb": "GetRecord",
      "@metadataPrefix": "perucris-cerif",
      "@identifier": "oai:cris.institucion.edu.pe:Publications/894518",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "GetRecord": {
      "record": {
        "header": {
          "identifier": "oai:cris.institucion.edu.pe:Publications/894518",
          "datestamp": "2026-02-20T12:00:00Z",
          "setSpec": "publications"
        },
        "metadata": {
          "Publication": {
            "@id": "Publications/894518",
            "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
            "Type": {
              "@xmlns": "https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types",
              "#text": "http://purl.org/coar/resource_type/c_6501"
            },
            "Title": [
              { "@xml:lang": "es", "#text": "Efecto de la altitud en la variabilidad climática" },
              { "@xml:lang": "en", "#text": "Effect of altitude on climate variability" }
            ],
            "DOI": "10.1234/abcd.2026.0001",
            "Handle": "https://hdl.handle.net/20.500.12345/9876",
            "PublicationDate": "2026-01-15",
            "Language": ["es"],
            "Abstract": [
              { "@xml:lang": "es", "#text": "Resumen de ejemplo." }
            ],
            "Keyword": [
              { "@xml:lang": "es", "#text": "Clima" }
            ],
            "Subject": [
              {
                "@scheme": "https://purl.org/pe-repo/ocde/ford",
                "#text": "https://purl.org/pe-repo/ocde/ford#1.05.01"
              }
            ]
          }
        }
      }
    }
  }
}
```

### 14.8 Error OAI-PMH

```json
{
  "OAI-PMH": {
    "@xmlns": "http://www.openarchives.org/OAI/2.0/",
    "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "@xsi:schemaLocation": "http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd",
    "responseDate": "2026-03-05T15:21:40Z",
    "request": {
      "@verb": "ListRecords",
      "@metadataPrefix": "perucris-cerif",
      "@set": "unknown",
      "#text": "https://cris.institucion.edu.pe/oai"
    },
    "error": {
      "@code": "badArgument",
      "#text": "El valor del parámetro set no corresponde a un set expuesto por el repositorio."
    }
  }
}
```

> **Nota técnica:** Use `badArgument` para combinaciones inválidas de parámetros - por ejemplo `resumptionToken` junto con `from`/`until` - o para un `set` no expuesto por el repositorio. Reserve `noSetHierarchy` para implementaciones que no soportan sets en absoluto.

---

## Resumen de URIs y vocabularios oficiales

> **Nota técnica:** La siguiente tabla resume solo los identificadores y vocabularios citados en esta guía. Para el detalle normativo completo y los valores canónicos del perfil XML debe consultarse `Directrices-perucris.md`.

| Ámbito | URI / Scheme |
|--------|-------------|
| `metadataPrefix` (guía JSON) | `perucris-cerif` |
| `metadataPrefix` (XML oficial v1.1 - canónico) | `cerif_perucris` |
| Namespace CERIF PerúCRIS | guía JSON: `https://purl.org/pe-repo/perucris/cerif` · XML canónico: `https://purl.org/pe-repo/cerif-profile/1.0/` |
| Schema XSD | guía JSON: `https://purl.org/pe-repo/perucris/cerif.xsd` · XML canónico: `https://purl.org/pe-repo/cerif-profile/1.0/perucris-cerif-profile.xsd` |
| Tipos de publicación (COAR) | `https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types` |
| Versiones (COAR) | `http://purl.org/coar/version` |
| Licencias OpenAIRE | `https://www.openaire.eu/cerif-profile/vocab/LicenseTypes` |
| Campos OCDE (Ford) | `https://purl.org/pe-repo/ocde/ford` |
| Tipo de trabajo RENATI | `https://purl.org/pe-repo/renati/type` |
| Nivel académico RENATI | `https://purl.org/pe-repo/renati/level` |
| Programa INEI CPESUTPT | `https://purl.org/pe-repo/inei/cpesutpt` |
| Tipo de organización | `https://purl.org/pe-repo/concytec/tipoOrganizacion` |
| DNI | `http://purl.org/pe-repo/concytec/terminos#dni` |
| RUC | `https://purl.org/pe-repo/concytec/terminos#ruc` |
| ORCID | `https://orcid.org` |
| ROR | `https://w3id.org/cerif/vocab/IdentifierTypes#RORID` |
| GRID | `https://www.grid.ac` |
| ISNI | `https://w3id.org/cerif/vocab/IdentifierTypes#ISNI` |
| ResearcherID (WoS) | `https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID` |
| Scopus Author ID | `https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID` |
| Award Number | `https://w3id.org/cerif/vocab/IdentifierTypes#AwardNumber` |
| FundRef ID | `https://w3id.org/cerif/vocab/IdentifierTypes#FundRefID` |
| Project Reference | `https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference` |
| CRISID (Equipamiento) | `https://w3id.org/cerif/vocab/IdentifierTypes#CRISID` |
| Serial Number | `https://w3id.org/cerif/vocab/IdentifierTypes#SerialNumber` |
| IPC (Patentes) | `http://data.epo.org/linked-data/def/ipc/` |
| MeSH (NLM) | `http://id.nlm.nih.gov/mesh` |

---

> **Referencia oficial:** Oficina de Tecnologías de Información — Software PERUCRIS — CONCYTEC, Marzo 2026
> **Firmado digitalmente por:** VASQUEZ MACHICAO Percy FAU — 06.03.2026
