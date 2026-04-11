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
bash scripts/db/import-rds.sh
```
