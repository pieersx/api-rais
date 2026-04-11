# Despliegue AWS para pruebas

Este repositorio usa:

- `infra/terraform/` para infraestructura (RDS + ECR + App Runner + IAM)
- `.github/workflows/deploy.yml` para CI/CD (build, push, deploy)
- `scripts/db/` para preparar e importar dump SQL en RDS

## Flujo recomendado

1. Provisionar RDS + ECR + IAM con Terraform.
2. Subir primera imagen Docker a ECR.
3. Crear App Runner con Terraform.
4. Cargar dump en RDS.
5. Configurar variables/secrets en GitHub Actions.
6. Hacer push a `main` para desplegar.

## 1) Infraestructura

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Primera corrida recomendada: `create_apprunner_service = false`.

## 2) Subir primera imagen a ECR

```bash
AWS_REGION=<region> \
ECR_REPOSITORY=<ecr_repository_name> \
bash scripts/deploy/bootstrap-ecr.sh
```

## 3) Crear App Runner

1. Cambia `create_apprunner_service = true` en `infra/terraform/terraform.tfvars`.
2. Ejecuta `terraform apply`.
3. Actualiza `base_url` con `https://<apprunner_service_url>/oai`.
4. Ejecuta `terraform apply` nuevamente.

Usa outputs de Terraform para completar GitHub Actions.

## 4) Dump SQL en RDS

El dump original queda en:

- `database/dumps/raw/Publicacion_backup_2026.sql`

El dump listo para RDS queda en:

- `database/dumps/aws-rds/rais-full-backup-2026.rds.sql`

Si llega un dump nuevo, regenéralo:

```bash
python scripts/db/prepare-rds-dump.py
```

Importa en RDS:

```bash
RDS_HOST=<rds-endpoint> \
RDS_USER=<db-user> \
RDS_PASSWORD=<db-password> \
RDS_DB_NAME=rais \
bash scripts/db/import-rds.sh
```

## 5) Variables de GitHub Actions

En el repo de GitHub, configura:

- Secret `AWS_ROLE_TO_ASSUME`
- Variable `AWS_REGION`
- Variable `ECR_REPOSITORY`
- Variable `APPRUNNER_SERVICE_ARN`

## 6) Despliegue continuo

Cada push a `main`:

1. Build de imagen Docker
2. Push a ECR
3. `start-deployment` en App Runner

## Validaciones

- `GET /health`
- `GET /oai?verb=Identify`
- `GET /oai?verb=ListMetadataFormats`
