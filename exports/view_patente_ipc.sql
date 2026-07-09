USE rais;

CREATE OR REPLACE
ALGORITHM = UNDEFINED
DEFINER = `rais`@`%`
SQL SECURITY DEFINER
VIEW `view_patente_ipc` AS
SELECT
  m.patente_id,
  p.nro_registro,
  m.nro_expediente,
  p.tipo,
  p.titulo,
  m.ipc_codigo,
  m.ipc_scheme,
  m.ipc_value,
  m.fuente,
  m.fuente_url,
  p.updated_at AS last_modified
FROM (
  SELECT 164 AS patente_id,
         '000735-2001/DIN' AS nro_expediente,
         'A23L 1/305' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/A23L1-305' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 522 AS patente_id,
         '000635-2004/DIN' AS nro_expediente,
         'B65D 5/46' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/B65D5-46' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 1 AS patente_id,
         '000354-2009/DIN' AS nro_expediente,
         'C04B 35/00' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/C04B35-00' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 6 AS patente_id,
         '001648-2011/DIN' AS nro_expediente,
         'B82B 3/00' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/B82B3-00' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 6 AS patente_id,
         '001648-2011/DIN' AS nro_expediente,
         'C06B 45/02' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/C06B45-02' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 37 AS patente_id,
         '001617-2017/DIN' AS nro_expediente,
         'A61N 2/08' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/A61N2-08' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 8 AS patente_id,
         '002484-2012/DIN' AS nro_expediente,
         'B22F 9/16' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/B22F9-16' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 8 AS patente_id,
         '002484-2012/DIN' AS nro_expediente,
         'B22F 9/20' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/B22F9-20' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
  UNION ALL
  SELECT 13 AS patente_id,
         '002339-2013/DIN' AS nro_expediente,
         'A61K 33/38' AS ipc_codigo,
         'http://data.epo.org/linked-data/def/ipc/' AS ipc_scheme,
         'http://data.epo.org/linked-data/def/ipc/A61K33-38' AS ipc_value,
         'INDECOPI' AS fuente,
         'https://enlinea.indecopi.gob.pe/appConsultasPublicas/#/procedimientos/propiedad-intelectual/invensiones-tecnologia?form=expediente' AS fuente_url
) m
JOIN Patente p ON p.id = m.patente_id
WHERE p.estado = 1
  AND LENGTH(TRIM(p.nro_registro)) > 0
  AND LENGTH(TRIM(p.titulo)) > 0
  AND LENGTH(TRIM(m.ipc_codigo)) > 0;

SELECT COUNT(*) AS ipc_rows FROM view_patente_ipc;
SELECT * FROM view_patente_ipc ORDER BY patente_id, ipc_codigo LIMIT 20;
