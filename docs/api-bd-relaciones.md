# Persons desde cero

Este documento explica solo el set `persons`.

## 1. Que es `persons`

`persons` es el set que exporta personas investigadoras de RAIS en formato OAI-PMH + CERIF PeruCRIS.

## 2. Resumen rapido

| Campo | Valor |
| --- | --- |
| Set | `persons` |
| EntityType | `Persons` |
| Repositorio | `src/repositories/person.repository.js` |
| Tabla principal | `Usuario_investigador` |
| Tablas auxiliares | `Facultad`, `Instituto` |
| Verbos OAI que lo usan | `ListIdentifiers`, `ListRecords`, `GetRecord` |
| MetadataPrefix | `perucris-cerif` |

## 3. Flujo real de este set

```text
GET /oai?verb=ListRecords&metadataPrefix=perucris-cerif&set=persons
-> src/routes/oai.routes.js
-> src/services/oai/listRecords.js
-> src/repositories/person.repository.js
-> Usuario_investigador + Facultad + Instituto
-> JSON final Person
```

## 4. Que devuelve este set

`persons` devuelve objetos `Person`.

Ejemplo de campos que puede devolver:

- `@id`
- `PersonName`
- `Gender`
- `LastModified`
- `Identifier`
- `ScopusAuthorID`
- `ResearcherID`
- `ORCID`
- `ElectronicAddress`
- `Affiliation`
- `Keywords`

## 5. Como trabaja `persons` en la API

| Operacion | Que hace | Que consulta |
| --- | --- | --- |
| `ListIdentifiers` | devuelve headers | `Usuario_investigador` |
| `ListRecords` | devuelve personas completas paginadas | `Usuario_investigador` + `Facultad` + `Instituto` |
| `GetRecord` | devuelve una persona por ID | `Usuario_investigador` + `Facultad` + `Instituto` |

## 6. Tablas que usa `persons`

| Tabla | Tipo | Rol en el set |
| --- | --- | --- |
| `Usuario_investigador` | BASE TABLE | tabla principal de personas |
| `Facultad` | BASE TABLE | afiliacion a facultad |
| `Instituto` | BASE TABLE | afiliacion a instituto |

## 7. Relaciones entre tablas

| Origen | Destino | Join | Para que sirve |
| --- | --- | --- | --- |
| `Usuario_investigador` | `Facultad` | `ui.facultad_id = f.id` | armar afiliacion de facultad |
| `Usuario_investigador` | `Instituto` | `ui.instituto_id = i.id` | armar afiliacion de instituto |
| `Instituto` | `Facultad` | `i.facultad_id = f.id` | jerarquia del instituto |

## 8. SQL real simplificado

### 8.1 `ListIdentifiers`

Esta operacion trae solo `id` y `updated_at` para construir headers OAI.

```sql
SELECT ui.id, ui.updated_at
FROM Usuario_investigador ui
WHERE ui.estado = 1
  AND ui.sexo IN ('M', 'F')
ORDER BY id
LIMIT ? OFFSET ?;
```

### 8.2 `ListRecords`

Esta operacion trae la fila completa de persona y la enriquece con facultad e instituto.

```sql
SELECT
  ui.*,
  f.id AS facultad_id,
  f.nombre AS facultad_nombre,
  i.id AS instituto_id,
  i.instituto AS instituto_nombre
FROM Usuario_investigador ui
LEFT JOIN Facultad f ON ui.facultad_id = f.id
LEFT JOIN Instituto i ON ui.instituto_id = i.id AND i.estado = 1
WHERE ui.estado = 1
  AND ui.sexo IN ('M', 'F')
ORDER BY ui.id
LIMIT ? OFFSET ?;
```

### 8.3 `GetRecord`

Es casi igual a `ListRecords`, pero agrega `WHERE ui.id = ?`.

```sql
SELECT
  ui.*,
  f.id AS facultad_id,
  f.nombre AS facultad_nombre,
  i.id AS instituto_id,
  i.instituto AS instituto_nombre
FROM Usuario_investigador ui
LEFT JOIN Facultad f ON ui.facultad_id = f.id
LEFT JOIN Instituto i ON ui.instituto_id = i.id AND i.estado = 1
WHERE ui.id = ?
  AND ui.estado = 1
  AND ui.sexo IN ('M', 'F');
```

## 9. Filtros reales de `persons`

| Regla | Donde aplica | Que significa |
| --- | --- | --- |
| `ui.estado = 1` | conteo, headers, records, get by id | solo personas activas |
| `ui.sexo IN ('M', 'F')` | conteo, headers, records, get by id | solo personas exportables segun regla PeruCRIS actual |
| filtro por `ui.updated_at` | `ListIdentifiers`, `ListRecords` | harvesting incremental por fecha |
| `i.estado = 1` en el join | `ListRecords`, `GetRecord` | solo instituto activo se exporta en afiliacion |

## 10. Columnas consumidas por la API

## 10.1 Tabla `Usuario_investigador`

| Columna | Uso en la API | Sale en JSON como |
| --- | --- | --- |
| `id` | ID interno de la persona | `header.identifier`, `Person.@id` |
| `facultad_id` | relacion con facultad | `Affiliation` |
| `instituto_id` | relacion con instituto | `Affiliation` |
| `codigo_orcid` | ORCID real | `ORCID` |
| `apellido1` | apellido | `PersonName.FamilyNames`, `PersonName.FullName` |
| `apellido2` | apellido | `PersonName.FamilyNames`, `PersonName.FullName` |
| `nombres` | nombres | `PersonName.FirstNames`, `PersonName.FullName` |
| `doc_tipo` | tipo de documento | decide si se exporta DNI en `Identifier` |
| `doc_numero` | numero de documento | `Identifier[].Value` |
| `sexo` | genero | `Gender` |
| `email1` | correo | `ElectronicAddress` |
| `email2` | correo | `ElectronicAddress` |
| `email3` | correo | `ElectronicAddress` |
| `researcher_id` | identificador investigador | `ResearcherID` |
| `scopus_id` | identificador Scopus | `ScopusAuthorID` |
| `palabras_clave` | keywords separadas por coma | `Keywords` |
| `estado` | filtro de exportacion | no sale directo, pero controla inclusion |
| `updated_at` | fecha de actualizacion | `header.datestamp`, `LastModified` |

## 10.2 Tabla `Facultad`

| Columna | Uso en la API | Sale en JSON como |
| --- | --- | --- |
| `id` | clave de facultad | `Affiliation.OrgUnit.id` como `OrgUnits/F{id}` |
| `nombre` | nombre de facultad | `Affiliation.OrgUnit.name` |

## 10.3 Tabla `Instituto`

| Columna | Uso en la API | Sale en JSON como |
| --- | --- | --- |
| `id` | clave de instituto | `Affiliation.OrgUnit.id` como `OrgUnits/I{id}` |
| `facultad_id` | jerarquia con facultad | contexto de relacion |
| `instituto` | nombre de instituto | `Affiliation.OrgUnit.name` |
| `estado` | filtro de instituto activo | no sale directo, pero controla inclusion |

## 11. Como se transforma la BD en JSON

La API hace esta transformacion mental:

```text
Usuario_investigador
-> nombre, genero, ids, correos, keywords

Facultad
-> afiliacion facultad

Instituto
-> afiliacion instituto

Todo eso
-> Person CERIF
```

## 12. Mapeo directo columna -> JSON

| Fuente | Campo final JSON |
| --- | --- |
| `ui.id` | `oai:...:Persons/{id}` y `Persons/{id}` |
| `ui.updated_at` | `header.datestamp`, `LastModified` |
| `ui.nombres` + `ui.apellido1` + `ui.apellido2` | `PersonName` |
| `ui.sexo` | `Gender` |
| `ui.doc_tipo` + `ui.doc_numero` | `Identifier` |
| `ui.scopus_id` | `ScopusAuthorID` |
| `ui.researcher_id` | `ResearcherID` |
| `ui.codigo_orcid` | `ORCID` |
| `ui.email1`, `ui.email2`, `ui.email3` | `ElectronicAddress` |
| `f.id`, `f.nombre` | afiliacion a facultad |
| `i.id`, `i.instituto` | afiliacion a instituto |
| `ui.palabras_clave` | `Keywords` |

## 13. Ejemplos JSON reales

## 13.1 Ejemplo real de `ListIdentifiers`

```json
[
  {
    "identifier": "oai:rais.unmsm.edu.pe:Persons/2",
    "setSpec": "persons",
    "datestamp": "2014-01-09T05:49:22Z"
  },
  {
    "identifier": "oai:rais.unmsm.edu.pe:Persons/4",
    "setSpec": "persons",
    "datestamp": "2014-01-09T05:49:22Z"
  }
]
```

## 13.2 Ejemplo real de `ListRecords`

```json
{
  "header": {
    "identifier": "oai:rais.unmsm.edu.pe:Persons/2",
    "setSpec": "persons",
    "datestamp": "2014-01-09T05:49:22Z"
  },
  "metadata": {
    "Person": {
      "@id": "Persons/2",
      "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
      "PersonName": {
        "FamilyNames": "ABAD PACHECO",
        "FirstNames": "MARCIAL",
        "FullName": "MARCIAL ABAD PACHECO"
      },
      "Gender": "m",
      "LastModified": "2014-01-09T05:49:22Z",
      "Identifier": [
        {
          "Scheme": "http://purl.org/pe-repo/concytec/terminos#dni",
          "Value": "10336826"
        }
      ],
      "Affiliation": [
        {
          "OrgUnit": {
            "id": "OrgUnits/1",
            "name": "Universidad Nacional Mayor de San Marcos"
          }
        },
        {
          "OrgUnit": {
            "id": "OrgUnits/F12",
            "name": "Ciencias Económicas"
          }
        },
        {
          "OrgUnit": {
            "id": "OrgUnits/I1201",
            "name": "Instituto de Investigaciones Económicas"
          }
        }
      ]
    }
  }
}
```

## 13.3 Ejemplo real de `GetRecord`

```json
{
  "header": {
    "identifier": "oai:rais.unmsm.edu.pe:Persons/166",
    "setSpec": "persons",
    "datestamp": "2022-01-29T17:11:21Z"
  },
  "metadata": {
    "Person": {
      "@id": "Persons/166",
      "@xmlns": "https://purl.org/pe-repo/perucris/cerif",
      "PersonName": {
        "FamilyNames": "ALIAGA TOVAR",
        "FirstNames": "JAIME RAMIRO",
        "FullName": "JAIME RAMIRO ALIAGA TOVAR"
      },
      "Gender": "m",
      "LastModified": "2022-01-29T17:11:21Z",
      "Identifier": [
        {
          "Scheme": "http://purl.org/pe-repo/concytec/terminos#dni",
          "Value": "06699947"
        }
      ],
      "ScopusAuthorID": {
        "Scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID",
        "Value": "57931137000"
      },
      "ResearcherID": {
        "Scheme": "https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID",
        "Value": "GGF-4924-2022"
      },
      "ORCID": "0000-0002-4091-3205",
      "ElectronicAddress": [
        "mailto:jaliagat@unmsm.edu.pe"
      ],
      "Affiliation": [
        {
          "OrgUnit": {
            "id": "OrgUnits/1",
            "name": "Universidad Nacional Mayor de San Marcos"
          }
        },
        {
          "OrgUnit": {
            "id": "OrgUnits/F18",
            "name": "Psicología"
          }
        },
        {
          "OrgUnit": {
            "id": "OrgUnits/I1801",
            "name": "Instituto de Investigaciones Psicológicas"
          }
        }
      ],
      "Keywords": [
        {
          "Value": "psicometría"
        },
        {
          "Value": "metodología de investigación"
        },
        {
          "Value": "psicología educativa"
        }
      ]
    }
  }
}
```

## 14. Lo mas importante que debes quedarte de `persons`

1. la tabla principal es `Usuario_investigador`
2. `Facultad` e `Instituto` solo enriquecen la afiliacion
3. `ListIdentifiers` usa casi solo `id` y `updated_at`
4. `ListRecords` y `GetRecord` usan la fila completa y la convierten a `Person`
5. los filtros mas importantes son `estado = 1` y `sexo IN ('M', 'F')`
6. `updated_at` controla el `datestamp`
7. la API siempre agrega la afiliacion raiz `OrgUnits/1` de UNMSM

## 15. Cierre

Este archivo queda centrado solo en `persons`.
