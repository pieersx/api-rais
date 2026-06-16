import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  formatInstitutionInternalId,
  parseInstitutionInternalId,
  toInstitutionCerifId,
  toInstitutionOAIIdentifier,
  toISO8601,
  filterEmpty,
  buildDateFilter,
  createSchemeValueEntry,
  createTextValueEntry,
  normalizeDisplayText,
  toProjectCerifId,
} from '../utils/formatters.js';
import {
  FUNDING_TYPE_VALUES,
  IDENTIFIER_SCHEMES,
  NAMESPACES,
  VOCABULARIES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Fundings';
const PROJECT_FUNDING_PREFIX = 'P';
const CONVOCATORIA_FUNDING_PREFIX = 'C';
const ROOT_ORGUNIT = {
  id: toInstitutionCerifId('OrgUnits', '1'),
  acronym: 'UNMSM',
  name: 'Universidad Nacional Mayor de San Marcos',
};
const EXTERNAL_FUNDING_TOTAL = `
  (
    COALESCE(p.aporte_no_unmsm, 0)
    + COALESCE(p.financiamiento_fuente_externa, 0)
    + COALESCE(p.entidad_asociada, 0)
  )
`;
const FUNDING_APORTE_TOTAL = `
  (
    COALESCE(p.aporte_unmsm, 0)
    + COALESCE(p.aporte_no_unmsm, 0)
    + COALESCE(p.financiamiento_fuente_externa, 0)
    + COALESCE(p.entidad_asociada, 0)
  )
`;
const FUNDING_ELIGIBILITY = `
  (
    (p.codigo_proyecto IS NOT NULL AND p.codigo_proyecto <> '')
    OR ${FUNDING_APORTE_TOTAL} > 0
    OR EXISTS (
      SELECT 1
      FROM Proyecto_presupuesto pp
      WHERE pp.proyecto_id = p.id
        AND IFNULL(pp.estado, 1) = 1
        AND COALESCE(pp.monto, 0) > 0
    )
    OR p.convocatoria IS NOT NULL
  )
`;
const REAL_EXTERNAL_PROJECT = `
  (
    LOWER(TRIM(COALESCE(p.tipo_proyecto, ''))) = 'pfex'
    OR ${EXTERNAL_FUNDING_TOTAL} > 0
  )
`;
const STRICT_FUNDING_ELIGIBILITY = `
  (
    ${FUNDING_ELIGIBILITY}
    AND (NOT ${REAL_EXTERNAL_PROJECT} OR ef.external_funder_count = 1)
  )
`;

function parseFundingProjectId(id) {
  const value = String(id || '').trim();
  if (!value) return null;

  const normalized = value.startsWith(PROJECT_FUNDING_PREFIX) ? value.slice(1) : value;
  if (!/^\d+$/.test(normalized)) return null;

  return Number(normalized);
}

function parseFundingInternalId(id) {
  const value = String(id || '').trim();
  if (!value) return null;
  const internalId = parseInstitutionInternalId(value);
  if (!internalId) return null;

  if (internalId.startsWith(CONVOCATORIA_FUNDING_PREFIX)) {
    const normalized = internalId.slice(1);
    if (!/^\d+$/.test(normalized)) return null;
    return {
      kind: 'convocatoria',
      id: Number(normalized),
    };
  }

  const projectId = parseFundingProjectId(internalId);
  if (!projectId) return null;

  return {
    kind: 'project',
    id: projectId,
  };
}

function buildFundingType(row) {
  if (row.is_external_project) return FUNDING_TYPE_VALUES.GRANT;
  return FUNDING_TYPE_VALUES.INTERNAL;
}

function buildFundingTypeEntry(value) {
  if (!value) return null;

  return {
    Scheme: VOCABULARIES.OPENAIRE_FUNDING_TYPES,
    Value: value,
  };
}

function buildFundingAmount(row) {
  const presupuestoTotal = Number(row.monto_presupuesto_total || 0);
  const totalFromAportes =
    Number(row.aporte_unmsm || 0)
    + Number(row.aporte_no_unmsm || 0)
    + Number(row.financiamiento_fuente_externa || 0)
    + Number(row.entidad_asociada || 0);

  const total = presupuestoTotal > 0 ? presupuestoTotal : totalFromAportes;

  if (total <= 0) return null;

  return {
    value: Math.round(total),
    currency: 'PEN',
  };
}

function buildBudgetBreakdown(row) {
  const breakdown = [];

  const bienes = Math.round(Number(row.monto_bienes || 0));
  const servicios = Math.round(Number(row.monto_servicios || 0));
  const otros = Math.round(Number(row.monto_otros || 0));

  if (bienes > 0) breakdown.push(`Bienes: ${bienes}`);
  if (servicios > 0) breakdown.push(`Servicios: ${servicios}`);
  if (otros > 0) breakdown.push(`Otros: ${otros}`);

  return breakdown;
}

function buildFundingName(row) {
  const explicitTitle = String(row.titulo || '').trim();
  if (explicitTitle) return explicitTitle;

  const awardNumber = String(row.codigo_proyecto || '').trim();
  if (awardNumber) return `Financiamiento ${awardNumber}`;

  return `Financiamiento del proyecto ${row.id}`;
}

function normalizeHumanText(value) {
  if (!value) return null;

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized || normalized === '-' || normalized === '--' || normalized === '---') {
    return null;
  }

  return normalized;
}

function buildFundingDisplayName(parts) {
  const uniqueParts = [...new Set(filterEmpty(parts.map(normalizeHumanText)))];
  if (uniqueParts.length === 0) return null;
  return uniqueParts.join(' - ');
}

function getRelevantConvocatoria(row) {
  const current = row.convocatoria_id
    ? {
        id: row.convocatoria_id,
        tipo: row.convocatoria_tipo,
        evento: row.convocatoria_evento,
        descripcion: row.convocatoria_descripcion,
        periodo: row.convocatoria_periodo,
        parentId: row.convocatoria_parent_id,
      }
    : null;
  const parent = row.convocatoria_parent_real_id
    ? {
        id: row.convocatoria_parent_real_id,
        tipo: row.convocatoria_parent_real_tipo,
        evento: row.convocatoria_parent_real_evento,
        descripcion: row.convocatoria_parent_real_descripcion,
        periodo: row.convocatoria_parent_real_periodo,
        parentId: row.convocatoria_parent_real_parent_id,
      }
    : null;
  const grandparent = row.convocatoria_grandparent_id
    ? {
        id: row.convocatoria_grandparent_id,
        tipo: row.convocatoria_grandparent_tipo,
        evento: row.convocatoria_grandparent_evento,
        descripcion: row.convocatoria_grandparent_descripcion,
        periodo: row.convocatoria_grandparent_periodo,
        parentId: null,
      }
    : null;

  if (!current) return null;

  const currentEvent = normalizeHumanText(current.evento)?.toLowerCase();
  if ((currentEvent === 'calendario' || currentEvent === 'evaluacion') && parent) {
    const parentEvent = normalizeHumanText(parent.evento)?.toLowerCase();
    if ((parentEvent === 'calendario' || parentEvent === 'evaluacion') && grandparent) {
      return grandparent;
    }
    return parent;
  }

  return current;
}

function buildParentFunding(row) {
  const convocatoria = getRelevantConvocatoria(row);
  if (!convocatoria) return null;

  const name = buildFundingDisplayName([
    convocatoria.descripcion,
    convocatoria.tipo,
    convocatoria.periodo,
  ]);

  return {
    Funding: {
      id: toInstitutionCerifId(ENTITY_TYPE, `${CONVOCATORIA_FUNDING_PREFIX}${convocatoria.id}`),
      Type: buildFundingTypeEntry(FUNDING_TYPE_VALUES.CALL),
      ...(name
        ? {
            Name: filterEmpty([createTextValueEntry(name, 'es')]),
          }
        : {}),
    },
  };
}

function formatDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value);
}

function getFundingLastModifiedValue(row) {
  return row.updated_at || row.created_at || row.fecha_final || row.fecha_inicial || null;
}

function buildConvocatoriaName(row) {
  const name = buildFundingDisplayName([
    row.descripcion,
    row.tipo,
    row.periodo,
  ]);

  if (name) return name;
  return `Convocatoria ${row.id}`;
}

function buildConvocatoriaType(row) {
  if (row.parent_exportable_id) return FUNDING_TYPE_VALUES.CALL;
  if (Number(row.exportable_child_count || 0) > 0) return FUNDING_TYPE_VALUES.PROGRAMME;
  return FUNDING_TYPE_VALUES.CALL;
}

function buildConvocatoriaParentFunding(row) {
  if (!row.parent_exportable_id) return null;

  const parentName = buildFundingDisplayName([
    row.parent_exportable_descripcion,
    row.parent_exportable_tipo,
    row.parent_exportable_periodo,
  ]);

  return {
    Funding: {
      id: toInstitutionCerifId(ENTITY_TYPE, `${CONVOCATORIA_FUNDING_PREFIX}${row.parent_exportable_id}`),
      Type: buildFundingTypeEntry(FUNDING_TYPE_VALUES.PROGRAMME),
      ...(parentName
        ? {
            Name: filterEmpty([createTextValueEntry(parentName, 'es')]),
          }
        : {}),
    },
  };
}

function mapConvocatoriaToCerif(row) {
  const fundingId = `${CONVOCATORIA_FUNDING_PREFIX}${row.id}`;
  const fundingName = buildConvocatoriaName(row);
  const parentFunding = buildConvocatoriaParentFunding(row);

  const funding = {
    '@id': toInstitutionCerifId(ENTITY_TYPE, fundingId),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Type: buildFundingTypeEntry(buildConvocatoriaType(row)),
    Name: filterEmpty([createTextValueEntry(fundingName, 'es')]),
    Identifier: filterEmpty([
      createSchemeValueEntry(IDENTIFIER_SCHEMES.AWARD_NUMBER, formatInstitutionInternalId(fundingId)),
    ]),
    Funder: [{
      OrgUnit: {
        id: ROOT_ORGUNIT.id,
        acronym: ROOT_ORGUNIT.acronym,
        name: ROOT_ORGUNIT.name,
      },
    }],
    OAMandate: {
      mandated: false,
    },
  };

  const lastModified = toISO8601(getFundingLastModifiedValue(row));
  if (lastModified) {
    funding.LastModified = lastModified;
  }

  const startDate = formatDateOnly(row.fecha_inicial);
  if (startDate) {
    funding.StartDate = startDate;
  }

  const endDate = formatDateOnly(row.fecha_final);
  if (endDate) {
    funding.EndDate = endDate;
  }

  if (parentFunding) {
    funding.PartOf = parentFunding;
  }

  if (row.descripcion) {
    funding.Description = filterEmpty([createTextValueEntry(row.descripcion, 'es')]);
  }

  return funding;
}

function createProjectFundingRecord(row) {
  return {
    header: {
      identifier: toInstitutionOAIIdentifier(ENTITY_TYPE, `${PROJECT_FUNDING_PREFIX}${row.id}`),
      datestamp: toISO8601(row.updated_at),
      setSpec: 'fundings',
    },
    metadata: {
      Funding: mapToCerif(row),
    },
  };
}

function createConvocatoriaFundingRecord(row) {
  return {
    header: {
      identifier: toInstitutionOAIIdentifier(ENTITY_TYPE, `${CONVOCATORIA_FUNDING_PREFIX}${row.id}`),
      datestamp: toISO8601(getFundingLastModifiedValue(row)),
      setSpec: 'fundings',
    },
    metadata: {
      Funding: mapConvocatoriaToCerif(row),
    },
  };
}

function buildFunders(row) {
  const funders = [];
  const internalAmount = Number(row.aporte_unmsm || 0);

  if (internalAmount > 0 || !row.is_external_project) {
    funders.push({
      OrgUnit: {
        id: ROOT_ORGUNIT.id,
        acronym: ROOT_ORGUNIT.acronym,
        name: ROOT_ORGUNIT.name,
      },
    });
  }

  if (row.external_funder_name) {
    funders.push({
      OrgUnit: {
        name: normalizeDisplayText(row.external_funder_name),
      },
    });
  }

  return funders;
}

function buildDescription(row) {
  const descriptionParts = [];
  descriptionParts.push(...buildBudgetBreakdown(row));
  if (row.tipo_proyecto) descriptionParts.push(`Tipo de proyecto: ${row.tipo_proyecto}`);
  if (row.facultad_nombre) descriptionParts.push(`Facultad: ${row.facultad_nombre}`);

  return descriptionParts.length > 0
    ? filterEmpty([createTextValueEntry(descriptionParts.join('. '), 'es')])
    : null;
}

function mapToCerif(row) {
  const fundingId = `${PROJECT_FUNDING_PREFIX}${row.id}`;
  const lastModified = toISO8601(row.updated_at);
  const fundingName = buildFundingName(row);
  const awardNumber = String(row.codigo_proyecto || '').trim();
  const fundingType = buildFundingType(row);
  const funders = buildFunders(row);
  const parentFunding = buildParentFunding(row);
  const description = buildDescription(row);

  const funding = {
    '@id': toInstitutionCerifId(ENTITY_TYPE, fundingId),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Type: buildFundingTypeEntry(fundingType),
    Name: filterEmpty([createTextValueEntry(fundingName, 'es')]),
    Funder: funders,
    OAMandate: {
      mandated: false,
    },
    RelatedProjects: [toProjectCerifId(row.id)],
  };

  if (lastModified) {
    funding.LastModified = lastModified;
  }

  if (awardNumber) {
    funding.Identifier = filterEmpty([
      createSchemeValueEntry(IDENTIFIER_SCHEMES.AWARD_NUMBER, formatInstitutionInternalId(fundingId)),
    ]);
  }

  if (parentFunding) {
    funding.PartOf = parentFunding;
  }

  if (row.fecha_inicio) {
    funding.StartDate = row.fecha_inicio instanceof Date
      ? row.fecha_inicio.toISOString().split('T')[0]
      : row.fecha_inicio;
  } else if (row.periodo) {
    funding.StartDate = String(row.periodo);
  }

  if (row.fecha_fin) {
    funding.EndDate = row.fecha_fin instanceof Date
      ? row.fecha_fin.toISOString().split('T')[0]
      : row.fecha_fin;
  }

  const amount = buildFundingAmount(row);
  if (amount) {
    funding.Amount = amount;
  }

  if (row.monto_subvencion && Number(row.monto_subvencion) > 0) {
    funding.ExecutedAmount = {
      value: Math.round(Number(row.monto_subvencion)),
      currency: 'PEN',
    };
  }

  if (description) {
    funding.Description = description;
  }

  if (row.tipo_proyecto) {
    funding.Keywords = filterEmpty([
      createTextValueEntry(row.tipo_proyecto, null),
    ]);
  }

  return funding;
}

function getBaseConvocatoriaFundingSelect() {
  return `
    SELECT
      c.id,
      c.tipo,
      c.descripcion,
      c.evento,
      c.fecha_inicial,
      c.fecha_final,
      c.fecha_corte,
      c.periodo,
      c.convocatoria,
      c.estado,
      c.parent_id,
      c.created_at,
      c.updated_at,
      cp.id AS parent_exportable_id,
      cp.tipo AS parent_exportable_tipo,
      cp.descripcion AS parent_exportable_descripcion,
      cp.periodo AS parent_exportable_periodo,
      child.exportable_child_count
    FROM Convocatoria c
    LEFT JOIN Convocatoria cp
      ON cp.id = c.parent_id
      AND cp.estado = 1
      AND LOWER(TRIM(COALESCE(cp.evento, ''))) NOT IN ('calendario', 'evaluacion')
    LEFT JOIN (
      SELECT
        parent_id,
        COUNT(*) AS exportable_child_count
      FROM Convocatoria
      WHERE parent_id IS NOT NULL
        AND estado = 1
        AND LOWER(TRIM(COALESCE(evento, ''))) NOT IN ('calendario', 'evaluacion')
      GROUP BY parent_id
    ) child ON child.parent_id = c.id
    WHERE c.estado = 1
      AND LOWER(TRIM(COALESCE(c.evento, ''))) NOT IN ('calendario', 'evaluacion')
  `;
}

async function countConvocatoriaFunding(from, until) {
  const dateFilter = buildDateFilter(from, until, 'c.updated_at');
  let query = `
    SELECT COUNT(*) AS total
    FROM Convocatoria c
    WHERE c.estado = 1
      AND LOWER(TRIM(COALESCE(c.evento, ''))) NOT IN ('calendario', 'evaluacion')
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

async function getProjectFundingIndex(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');
  let query = `
    SELECT p.id, p.updated_at
    FROM Proyecto p
    LEFT JOIN Convocatoria c ON c.id = p.convocatoria
    LEFT JOIN Convocatoria cp ON cp.id = c.parent_id
    LEFT JOIN Convocatoria cgp ON cgp.id = cp.parent_id
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count
      FROM Publicacion_proyecto pp
      WHERE IFNULL(pp.estado, 1) = 1
        AND pp.proyecto_id IS NOT NULL
        AND pp.entidad_financiadora IS NOT NULL
        AND TRIM(pp.entidad_financiadora) <> ''
        AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
      GROUP BY pp.proyecto_id
    ) ef ON ef.proyecto_id = p.id
    WHERE p.estado >= 1
      AND ${STRICT_FUNDING_ELIGIBILITY}
      AND p.codigo_proyecto IS NOT NULL
      AND p.codigo_proyecto <> ''
      AND (
        (c.id IS NOT NULL AND LOWER(TRIM(COALESCE(c.evento, ''))) NOT IN ('calendario', 'evaluacion'))
        OR (cp.id IS NOT NULL AND LOWER(TRIM(COALESCE(cp.evento, ''))) NOT IN ('calendario', 'evaluacion'))
        OR (cgp.id IS NOT NULL AND LOWER(TRIM(COALESCE(cgp.evento, ''))) NOT IN ('calendario', 'evaluacion'))
      )
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id';

  const [rows] = await pool.query(query, dateFilter.params);
  return rows.map(row => ({
    kind: 'project',
    id: row.id,
    sortOrder: 1,
    datestamp: toISO8601(row.updated_at),
  }));
}

async function getConvocatoriaFundingIndex(from, until) {
  const dateFilter = buildDateFilter(from, until, 'c.updated_at');
  let query = `
    SELECT c.id, c.fecha_inicial, c.fecha_final, c.created_at, c.updated_at
    FROM Convocatoria c
    WHERE c.estado = 1
      AND LOWER(TRIM(COALESCE(c.evento, ''))) NOT IN ('calendario', 'evaluacion')
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY c.id';

  const [rows] = await pool.query(query, dateFilter.params);
  return rows.map(row => ({
    kind: 'convocatoria',
    id: row.id,
    sortOrder: 0,
    datestamp: toISO8601(getFundingLastModifiedValue(row)),
  }));
}

function compareFundingIndex(a, b) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id - b.id;
}

async function getFundingIndex(from, until) {
  const [convocatorias, projects] = await Promise.all([
    getConvocatoriaFundingIndex(from, until),
    getProjectFundingIndex(from, until),
  ]);

  return [...convocatorias, ...projects].sort(compareFundingIndex);
}

async function getProjectFundingRecordsByIds(ids) {
  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `${getBaseFundingSelect()} AND p.id IN (${placeholders})`,
    ids
  );

  return new Map(rows.map(row => [row.id, createProjectFundingRecord(row)]));
}

async function getConvocatoriaFundingRecordsByIds(ids) {
  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `${getBaseConvocatoriaFundingSelect()} AND c.id IN (${placeholders})`,
    ids
  );

  return new Map(rows.map(row => [row.id, createConvocatoriaFundingRecord(row)]));
}

function getBaseFundingSelect() {
  return `
    SELECT
      p.id,
      p.codigo_proyecto,
      p.titulo,
      p.tipo_proyecto,
      p.fecha_inicio,
      p.fecha_fin,
      p.periodo,
      p.convocatoria,
      p.aporte_unmsm,
      p.aporte_no_unmsm,
      p.financiamiento_fuente_externa,
      p.entidad_asociada,
      p.updated_at,
      f.nombre as facultad_nombre,
      c.id AS convocatoria_id,
      c.tipo AS convocatoria_tipo,
      c.evento AS convocatoria_evento,
      c.descripcion AS convocatoria_descripcion,
      c.periodo AS convocatoria_periodo,
      c.parent_id AS convocatoria_parent_id,
      cp.id AS convocatoria_parent_real_id,
      cp.tipo AS convocatoria_parent_real_tipo,
      cp.evento AS convocatoria_parent_real_evento,
      cp.descripcion AS convocatoria_parent_real_descripcion,
      cp.periodo AS convocatoria_parent_real_periodo,
      cp.parent_id AS convocatoria_parent_real_parent_id,
      cgp.id AS convocatoria_grandparent_id,
      cgp.tipo AS convocatoria_grandparent_tipo,
      cgp.evento AS convocatoria_grandparent_evento,
      cgp.descripcion AS convocatoria_grandparent_descripcion,
      cgp.periodo AS convocatoria_grandparent_periodo,
      ef.external_funder_count,
      ef.external_funder_name,
      CASE
        WHEN LOWER(TRIM(COALESCE(p.tipo_proyecto, ''))) = 'pfex' OR ${EXTERNAL_FUNDING_TOTAL} > 0 THEN 1
        ELSE 0
      END AS is_external_project,
      pb.monto_presupuesto_total,
      pb.monto_bienes,
      pb.monto_servicios,
      pb.monto_otros,
      sv.monto_subvencion
    FROM Proyecto p
    LEFT JOIN Facultad f ON f.id = p.facultad_id
    LEFT JOIN Convocatoria c ON c.id = p.convocatoria
    LEFT JOIN Convocatoria cp ON cp.id = c.parent_id
    LEFT JOIN Convocatoria cgp ON cgp.id = cp.parent_id
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count,
        MIN(TRIM(pp.entidad_financiadora)) AS external_funder_name
      FROM Publicacion_proyecto pp
      WHERE IFNULL(pp.estado, 1) = 1
        AND pp.proyecto_id IS NOT NULL
        AND pp.entidad_financiadora IS NOT NULL
        AND TRIM(pp.entidad_financiadora) <> ''
        AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
      GROUP BY pp.proyecto_id
    ) ef ON ef.proyecto_id = p.id
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        SUM(COALESCE(pp.monto, 0)) AS monto_presupuesto_total,
        SUM(CASE WHEN LOWER(TRIM(pa.tipo)) = 'bienes' THEN COALESCE(pp.monto, 0) ELSE 0 END) AS monto_bienes,
        SUM(CASE WHEN LOWER(TRIM(pa.tipo)) = 'servicios' THEN COALESCE(pp.monto, 0) ELSE 0 END) AS monto_servicios,
        SUM(CASE
          WHEN pa.tipo IS NULL OR LOWER(TRIM(pa.tipo)) NOT IN ('bienes', 'servicios')
          THEN COALESCE(pp.monto, 0)
          ELSE 0
        END) AS monto_otros
      FROM Proyecto_presupuesto pp
      LEFT JOIN Partida pa ON pa.id = pp.partida_id
      WHERE IFNULL(pp.estado, 1) = 1
      GROUP BY pp.proyecto_id
    ) pb ON pb.proyecto_id = p.id
    LEFT JOIN (
      SELECT
        proyecto_id,
        SUM(monto_subvencion) as monto_subvencion
      FROM view_subvencion_investigadores
      GROUP BY proyecto_id
    ) sv ON sv.proyecto_id = p.id
    WHERE p.estado >= 1
      AND ${STRICT_FUNDING_ELIGIBILITY}
      AND p.codigo_proyecto IS NOT NULL
      AND p.codigo_proyecto <> ''
      AND (
        (c.id IS NOT NULL AND LOWER(TRIM(COALESCE(c.evento, ''))) NOT IN ('calendario', 'evaluacion'))
        OR (cp.id IS NOT NULL AND LOWER(TRIM(COALESCE(cp.evento, ''))) NOT IN ('calendario', 'evaluacion'))
        OR (cgp.id IS NOT NULL AND LOWER(TRIM(COALESCE(cgp.evento, ''))) NOT IN ('calendario', 'evaluacion'))
      )
  `;
}

/**
 * Obtiene el conteo total de financiamientos
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countFunding(from, until) {
  const [convocatoriaTotal, projectTotal] = await Promise.all([
    countConvocatoriaFunding(from, until),
    countProjectFunding(from, until),
  ]);

  return convocatoriaTotal + projectTotal;
}

async function countProjectFunding(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT COUNT(*) as total
    FROM Proyecto p
    LEFT JOIN Convocatoria c ON c.id = p.convocatoria
    LEFT JOIN Convocatoria cp ON cp.id = c.parent_id
    LEFT JOIN Convocatoria cgp ON cgp.id = cp.parent_id
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count
      FROM Publicacion_proyecto pp
      WHERE IFNULL(pp.estado, 1) = 1
        AND pp.proyecto_id IS NOT NULL
        AND pp.entidad_financiadora IS NOT NULL
        AND TRIM(pp.entidad_financiadora) <> ''
        AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
      GROUP BY pp.proyecto_id
    ) ef ON ef.proyecto_id = p.id
    WHERE p.estado >= 1
      AND ${STRICT_FUNDING_ELIGIBILITY}
      AND p.codigo_proyecto IS NOT NULL
      AND p.codigo_proyecto <> ''
      AND (
        (c.id IS NOT NULL AND LOWER(TRIM(COALESCE(c.evento, ''))) NOT IN ('calendario', 'evaluacion'))
        OR (cp.id IS NOT NULL AND LOWER(TRIM(COALESCE(cp.evento, ''))) NOT IN ('calendario', 'evaluacion'))
        OR (cgp.id IS NOT NULL AND LOWER(TRIM(COALESCE(cgp.evento, ''))) NOT IN ('calendario', 'evaluacion'))
      )
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

/**
 * Obtiene financiamientos con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getFunding({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const indexRows = await getFundingIndex(from, until);
  const page = indexRows.slice(offset, offset + limit);

  const projectIds = page.filter(row => row.kind === 'project').map(row => row.id);
  const convocatoriaIds = page.filter(row => row.kind === 'convocatoria').map(row => row.id);

  const [projectRecords, convocatoriaRecords] = await Promise.all([
    getProjectFundingRecordsByIds(projectIds),
    getConvocatoriaFundingRecordsByIds(convocatoriaIds),
  ]);

  return page.map(row => (
    row.kind === 'project'
      ? projectRecords.get(row.id)
      : convocatoriaRecords.get(row.id)
  )).filter(Boolean);
}

/**
 * Obtiene solo headers de financiamientos (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getFundingHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const page = (await getFundingIndex(from, until)).slice(offset, offset + limit);

  return page.map(row => ({
    identifier: toInstitutionOAIIdentifier(
      ENTITY_TYPE,
      `${row.kind === 'project' ? PROJECT_FUNDING_PREFIX : CONVOCATORIA_FUNDING_PREFIX}${row.id}`
    ),
    datestamp: row.datestamp,
    setSpec: 'fundings',
  }));
}

/**
 * Obtiene un financiamiento por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getFundingById(id) {
  const parsedId = parseFundingInternalId(id);
  if (!parsedId) return null;

  if (parsedId.kind === 'convocatoria') {
    const [rows] = await pool.query(
      `${getBaseConvocatoriaFundingSelect()} AND c.id = ? LIMIT 1`,
      [parsedId.id]
    );

    if (rows.length === 0) return null;
    return createConvocatoriaFundingRecord(rows[0]);
  }

  const [rows] = await pool.query(
    `${getBaseFundingSelect()} AND p.id = ? LIMIT 1`,
    [parsedId.id]
  );

  if (rows.length === 0) {
    return null;
  }

  return createProjectFundingRecord(rows[0]);
}
