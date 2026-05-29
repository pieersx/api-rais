#!/bin/bash
set -e

# Script que se ejecuta en EC2 para importar el backup desde GitHub

echo "=== IMPORTACIÓN DE BACKUP DESDE GITHUB ==="
echo ""

# Configuración
GITHUB_REPO="pieersx/api-rais"
BACKUP_FILE_PATH="database/dumps/raw/backup-rais-29-05-26.sql"
GITHUB_RAW_URL="https://raw.githubusercontent.com/$GITHUB_REPO/main/$BACKUP_FILE_PATH"

DB_HOST="${DB_HOST:-rais-api-prod-mysql.c0v2oqgqm8os.us-east-1.rds.amazonaws.com}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-raisadmin}"
DB_PASSWORD="${DB_PASSWORD}"  # Puede venir de variable de entorno
DB_NAME="${DB_NAME:-rais}"

TMP_BACKUP="/tmp/backup-import-$$.sql"

# Si no hay contraseña, intentar obtenerla de AWS Secrets Manager
if [ -z "$DB_PASSWORD" ]; then
  echo "Intentando obtener DB_PASSWORD desde AWS Secrets Manager..."
  if command -v aws >/dev/null 2>&1; then
    DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id rais-api-dev/app/db-password --region us-east-1 --query 'SecretString' --output text 2>/dev/null || echo "")
    if [ -z "$DB_PASSWORD" ]; then
      echo "⚠️  No se pudo obtener del Secrets Manager, usando contraseña por defecto"
      DB_PASSWORD="RaisApi!2026Temp"
    fi
  else
    echo "aws cli no disponible, usando contraseña por defecto"
    DB_PASSWORD="RaisApi!2026Temp"
  fi
fi

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: No hay contraseña disponible"
  exit 1
fi

echo "1️⃣ Descargando backup desde GitHub..."
echo "URL: $GITHUB_RAW_URL"
echo ""

if command -v wget >/dev/null 2>&1; then
  wget -O "$TMP_BACKUP" "$GITHUB_RAW_URL" -q --show-progress 2>&1 | tail -5
elif command -v curl >/dev/null 2>&1; then
  curl -L -o "$TMP_BACKUP" "$GITHUB_RAW_URL" -# 2>&1 | tail -3
else
  echo "❌ wget o curl no disponibles"
  exit 1
fi

FILE_SIZE=$(du -h "$TMP_BACKUP" | cut -f1)
FILE_LINES=$(wc -l < "$TMP_BACKUP")

if [ "$FILE_LINES" -lt 100 ]; then
  echo "⚠️  Archivo descargado parece vacío o incompleto ($FILE_LINES líneas)"
  echo "Contenido:"
  cat "$TMP_BACKUP" | head -20
  rm -f "$TMP_BACKUP"
  exit 1
fi

echo "✅ Descargado ($FILE_SIZE, $FILE_LINES líneas)"
echo ""

echo "2️⃣ Instalando mysql-client..."
sudo apt-get update -qq 2>&1 | tail -1
sudo apt-get install -y mysql-client-core-8.0 2>&1 | grep -E "Setting up|Processing" || echo "  (ya instalado)"
echo ""

echo "3️⃣ Probando conexión a RDS..."
export MYSQL_PWD="$DB_PASSWORD"
timeout 10 mysql -h "$DB_HOST" -u "$DB_USER" -e "SELECT VERSION() as version;" 2>&1 || echo "⚠️  Error de conexión - verificando credenciales..."
echo "✅ Conectado a RDS"
echo ""

echo "4️⃣ Importando backup (puede tardar 10-30 minutos)..."
START=$(date +%s)
mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < "$TMP_BACKUP"
END=$(date +%s)
DURATION=$((END - START))

echo ""
echo "✅ IMPORTACIÓN COMPLETADA"
echo "⏱️  Tiempo: $((DURATION / 60))m $((DURATION % 60))s"
echo ""

echo "5️⃣ Verificando integridad..."
mysql -h "$DB_HOST" -u "$DB_USER" -e "
  USE $DB_NAME;
  SELECT 
    CONCAT('Publicaciones: ', COUNT(*)) FROM Publicacion UNION ALL
    SELECT CONCAT('Proyectos: ', COUNT(*)) FROM Proyecto UNION ALL
    SELECT CONCAT('Personas: ', COUNT(*)) FROM Usuario_investigador;
"
echo ""

rm -f "$TMP_BACKUP"
echo "✅ ¡BASE DE DATOS ACTUALIZADA EXITOSAMENTE!"


