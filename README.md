# RAIS API

[![Node.js](https://img.shields.io/badge/node.js-v24+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![OAI-PMH 2.0](https://img.shields.io/badge/OAI--PMH-2.0-purple.svg)](https://www.openarchives.org/pmh/)

API OAI-PMH 2.0 para exposición de metadatos académicos RAIS en formato CERIF/PerúCRIS. Solo lectura, sin modificación de datos.

## Quick Start

```bash
# Instalar y ejecutar
pnpm install
pnpm dev

# Endpoint (default)
curl http://localhost:3000/oai?verb=Identify
```

## Requisitos

- **Node.js** `>=24`
- **pnpm** `10.27.0`
- **MySQL** `8.0+`

## Configuración

Copiar `.env.example` a `.env`:

```env
DB_USER=root
DB_PASSWORD=demo
DB_NAME=rais
BASE_URL=http://localhost:3000/oai
ADMIN_EMAIL=admin@unmsm.edu.pe
```

## Documentación

- **[Directrices PerúCRIS](docs/Directrices-perucris.md)** — Normativa CERIF y vocabularios
- **[Guía JSON](docs/Guia-para-creacion-apis-json.md)** — Ejemplos de respuestas
- **[AGENTS.md](AGENTS.md)** — Notas técnicas de implementación y correcciones CONCYTEC

## Features

- ✅ **Verbos OAI-PMH**: Identify, ListMetadataFormats, ListSets, ListIdentifiers, ListRecords, GetRecord
- ✅ **7 conjuntos de metadatos**: Persons, OrgUnits, Publications, Projects, Fundings, Equipments, Patents
- ✅ **Formato JSON CERIF** con esquema PerúCRIS v1.1
- ✅ **Paginación con resumptionToken**
- ✅ **Cosecha incremental** (from/until)
- ✅ **CONCYTEC compliance** (correcciones May 2026)

## API Endpoints

```
GET /oai?verb=ListRecords&metadataPrefix=perucris-cerif&set=publications
GET /oai?verb=GetRecord&metadataPrefix=perucris-cerif&identifier=oai:rais.unmsm.edu.pe:Patents/548
```

Ver `api.http` para más ejemplos.

## Testing

No hay suite de tests automatizados. Validación manual:

```bash
pnpm dev          # Inicia servidor
# En otro terminal:
curl http://localhost:3000/oai?verb=Identify | jq
```

O usa la extensión **REST Client** en VS Code con `api.http`.

## Desarrollar

```bash
pnpm dev       # Watch mode
pnpm start     # Production

# No existen lint/typecheck
```

## Cambios Recientes

**May 24, 2026** — CONCYTEC Compliance:
- ✅ Patents: estructura CERIF corregida (Inventors, Holders, Issuer)
- ✅ Projects: removido mapeo ECI inválido

Ver [AGENTS.md](AGENTS.md#correcciones-concytec-implementadas-may-24-2026) para detalles.

## Despliegue

### Docker

```bash
docker build -t rais-api .
docker run -e DB_USER=root -e DB_PASSWORD=demo -e BASE_URL=https://api.example.com/oai -p 3000:3000 rais-api
```

### AWS / Terraform

Ver `infra/terraform/` para configuración en ECS/Fargate.

## Contribuir

Las contribuciones respetan:
- Cambios de estructura CERIF requieren aprobación CONCYTEC
- Solo lectura: no modificar datos
- Documentar cambios en [AGENTS.md](AGENTS.md)

## Licencia

MIT. Datos: RAIS (UNMSM) bajo políticas institucionales.

---

**Preguntas?** Contacta al responsable del repositorio o abre una issue.
