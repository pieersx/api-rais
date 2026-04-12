# Database Dumps

- Raw backup source: `database/dumps/raw/Publicacion_backup_2026.sql`
- Cleaned dump for AWS RDS import: `database/dumps/aws-rds/rais-full-backup-2026.rds.sql`

Regenerar dump limpio:

```bash
python scripts/db/prepare-rds-dump.py
```

Importar en RDS:

```bash
RDS_HOST=<endpoint> \
RDS_USER=<user> \
RDS_PASSWORD=<password> \
RDS_DB_NAME=rais \
USE_DOCKER_MYSQL=true \
bash scripts/db/import-rds.sh
```

Notas:

- `USE_DOCKER_MYSQL=true` fuerza importacion con `docker run mysql:8`.
- `USE_DOCKER_MYSQL=auto` (default) usa `mysql` local si existe; si no, usa Docker.
