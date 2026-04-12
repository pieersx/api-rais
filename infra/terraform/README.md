# AWS Deploy (RDS Publico Temporal + App Runner)

Este Terraform crea infraestructura de pruebas para la API:

- RDS MySQL 8 publico (temporal para importar el dump)
- ECR para la imagen Docker
- App Runner opcional (se activa luego de subir la primera imagen a ECR)
- Roles IAM para App Runner y GitHub Actions (OIDC)

## 1) Requisitos

- Terraform >= 1.6
- AWS CLI autenticado (`aws sts get-caller-identity`)
- Cuenta AWS con VPC default activa
- GitHub OIDC provider ya creado en IAM o habilitar `create_github_oidc_provider = true`
- Docker disponible (build/push de imagen y opcion para import SQL)

## 2) Configurar variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Editar `terraform.tfvars` y definir al menos:

- `db_password`
- `github_oidc_provider_arn` (si no creas el provider desde Terraform)
- `db_allowed_cidrs` (ideal: tu IP publica en CIDR)

## 3) Crear infraestructura

```bash
terraform init
terraform plan
terraform apply
```

En el primer apply, deja `create_apprunner_service = false`.

Outputs importantes:

- `rds_endpoint`
- `ecr_repository_name`
- `github_actions_role_arn`

## 4) Subir primera imagen a ECR

Desde la raiz del repo:

```bash
AWS_REGION=<region> \
ECR_REPOSITORY=<ecr_repository_name> \
bash scripts/deploy/bootstrap-ecr.sh
```

## 5) Crear App Runner y ajustar BASE_URL

1. Cambia `create_apprunner_service = true` en `terraform.tfvars`.
2. Ejecuta `terraform apply`.
3. Con el output `apprunner_service_url`, actualiza `base_url` en `terraform.tfvars` con:

```text
https://<apprunner_service_url>/oai
```

4. Ejecuta nuevamente:

```bash
terraform apply
```

Outputs nuevos cuando `create_apprunner_service = true`:

- `apprunner_service_arn`
- `apprunner_service_url`

## 6) Importar dump en RDS

1. Preparar dump para RDS (si llega un dump nuevo):

```bash
python ../../scripts/db/prepare-rds-dump.py
```

2. Importar:

```bash
RDS_HOST=<rds-endpoint> \
RDS_PORT=3306 \
RDS_USER=<db-username> \
RDS_PASSWORD=<db-password> \
RDS_DB_NAME=rais \
DUMP_PATH=../../database/dumps/aws-rds/rais-full-backup-2026.rds.sql \
USE_DOCKER_MYSQL=true \
bash ../../scripts/db/import-rds.sh
```

`USE_DOCKER_MYSQL` acepta `auto|true|false`. En `auto`, usa cliente local `mysql` si existe; de lo contrario importa con Docker (`mysql:8`).

## 7) Configurar GitHub Actions

En GitHub repo (`Settings > Secrets and variables > Actions`):

- Secret: `AWS_ROLE_TO_ASSUME` = output `github_actions_role_arn`
- Variable: `AWS_REGION` = mismo region Terraform
- Variable: `ECR_REPOSITORY` = output `ecr_repository_name`
- Variable: `APPRUNNER_SERVICE_ARN` = output `apprunner_service_arn`

Con eso, cada push a `main` despliega la API.

## Seguridad (importante)

Este setup deja RDS publico para pruebas rapidas. Cuando termines validacion:

1. Restringe `db_allowed_cidrs` a IPs concretas.
2. Migra a RDS privado + App Runner con VPC Connector.
