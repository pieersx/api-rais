import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  createTitle,
  createIdentifier,
  buildDateFilter,
} from '../utils/formatters.js';
import {
  IDENTIFIER_SCHEMES,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Fundings';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';
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

function parseFundingProjectId(id) {
  const value = String(id || '').trim();
  if (!value) return null;

  const normalized = value.startsWith('P') ? value.slice(1) : value;
  if (!/^\d+$/.test(normalized)) return null;

  return Number(normalized);
}

function buildFundingType(row) {
  const externalTotal =
    Number(row.aporte_no_unmsm || 0)
    + Number(row.financiamiento_fuente_externa || 0)
    + Number(row.entidad_asociada || 0);

  const value = externalTotal > 0
    ? `${VOCABULARIES.OPENAIRE_FUNDING_TYPES}#Grant`
    : `${VOCABULARIES.OPENAIRE_FUNDING_TYPES}#InternalFunding`;

  return {
    scheme: VOCABULARIES.OPENAIRE_FUNDING_TYPES,
    value,
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

function mapToCerif(row) {
  const fundingId = `P${row.id}`;
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;

  const funding = {
    '@id': toCerifId(ENTITY_TYPE, fundingId),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    type: buildFundingType(row),
    title: filterEmpty([
      createTitle(`Financiamiento de proyecto ${row.codigo_proyecto || row.id}`, 'es'),
      row.titulo ? createTitle(row.titulo, 'es') : null,
    ]),
    identifiers: filterEmpty([
      createIdentifier(
        IDENTIFIER_SCHEMES.AWARD_NUMBER,
        row.codigo_proyecto || `P-${row.id}`
      ),
    ]),
    fundedBy: {
      orgUnit: {
        id: toCerifId('OrgUnits', '1'),
        acronym: 'UNMSM',
        name: 'Universidad Nacional Mayor de San Marcos',
      },
    },
    relatedProjects: [toCerifId('Projects', row.id)],
    lastModified,
  };

  if (row.convocatoria) {
    funding.partOf = {
      id: toCerifId(ENTITY_TYPE, `C${row.convocatoria}`),
    };
  }

  if (row.fecha_inicio) {
    funding.startDate = row.fecha_inicio instanceof Date
      ? row.fecha_inicio.toISOString().split('T')[0]
      : row.fecha_inicio;
  } else if (row.periodo) {
    funding.startDate = String(row.periodo);
  }

  if (row.fecha_fin) {
    funding.endDate = row.fecha_fin instanceof Date
      ? row.fecha_fin.toISOString().split('T')[0]
      : row.fecha_fin;
  }

  const amount = buildFundingAmount(row);
  if (amount) {
    funding.amount = amount;
  }

  if (row.monto_subvencion && Number(row.monto_subvencion) > 0) {
    funding.executedAmount = {
      value: Math.round(Number(row.monto_subvencion)),
      currency: 'PEN',
    };
  }

  const descriptionParts = [];
  descriptionParts.push(...buildBudgetBreakdown(row));
  if (row.tipo_proyecto) descriptionParts.push(`Tipo de proyecto: ${row.tipo_proyecto}`);
  if (row.facultad_nombre) descriptionParts.push(`Facultad: ${row.facultad_nombre}`);

  if (descriptionParts.length > 0) {
    funding.description = [{
      lang: 'es',
      value: descriptionParts.join('. '),
    }];
  }

  if (row.tipo_proyecto) {
    funding.keywords = [{ value: row.tipo_proyecto }];
  }

  return funding;
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
      pb.monto_presupuesto_total,
      pb.monto_bienes,
      pb.monto_servicios,
      pb.monto_otros,
      sv.monto_subvencion
    FROM Proyecto p
    LEFT JOIN Facultad f ON f.id = p.facultad_id
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
      AND ${FUNDING_ELIGIBILITY}
  `;
}

/**
 * Obtiene el conteo total de financiamientos
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countFunding(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT COUNT(*) as total
    FROM Proyecto p
    WHERE p.estado >= 1
      AND ${FUNDING_ELIGIBILITY}
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
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = getBaseFundingSelect();
  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }
  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, `P${row.id}`),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'fundings',
    },
    metadata: {
      Funding: mapToCerif(row),
    },
  }));
}

/**
 * Obtiene solo headers de financiamientos (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getFundingHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT p.id, p.updated_at
    FROM Proyecto p
    WHERE p.estado >= 1
      AND ${FUNDING_ELIGIBILITY}
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, `P${row.id}`),
    datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
    setSpec: 'fundings',
  }));
}

/**
 * Obtiene un financiamiento por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getFundingById(id) {
  const projectId = parseFundingProjectId(id);
  if (!projectId) return null;

  const [rows] = await pool.query(
    `${getBaseFundingSelect()} AND p.id = ? LIMIT 1`,
    [projectId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, `P${row.id}`),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'fundings',
    },
    metadata: {
      Funding: mapToCerif(row),
    },
  };
}
