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
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Equipments';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';
const CTI_TERMS_SCHEME = 'https://purl.org/pe-repo/concytec/terminos';

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getEquipmentType(row) {
  const slug = toSlug(row.categoria);
  if (!slug) {
    return `${CTI_TERMS_SCHEME}#equipamiento-cientifico`;
  }
  return `${CTI_TERMS_SCHEME}#${slug}`;
}

function mapToCerif(row) {
  const equipmentId = toCerifId(ENTITY_TYPE, row.id);
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;

  const equipment = {
    id: equipmentId,
    '@id': equipmentId,
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    identifiers: filterEmpty([
      createIdentifier(IDENTIFIER_SCHEMES.CRIS_ID, row.codigo || `GI-${row.id}`),
    ]),
    type: getEquipmentType(row),
    name: filterEmpty([
      createTitle(row.nombre || `Equipamiento ${row.id}`, 'es'),
    ]),
    owner: {
      orgUnit: {
        id: row.grupo_id ? toCerifId('OrgUnits', `G${row.grupo_id}`) : toCerifId('OrgUnits', '1'),
        name: row.grupo_nombre || 'Universidad Nacional Mayor de San Marcos',
      },
    },
    lastModified,
  };

  if (row.descripcion) {
    equipment.description = [{
      lang: 'es',
      value: row.descripcion,
    }];
  }

  if (row.ubicacion) {
    equipment.location = {
      campus: row.ubicacion,
    };
  }

  if (row.valor_estimado && Number(row.valor_estimado) > 0) {
    equipment.acquisitionAmount = {
      value: Math.round(Number(row.valor_estimado)),
      currency: 'PEN',
    };
  }

  if (row.contacto) {
    equipment.contact = {
      value: row.contacto,
    };
  }

  if (row.area_mt2 && Number(row.area_mt2) > 0) {
    equipment.area = {
      value: Number(row.area_mt2),
      unit: 'm2',
    };
  }

  return equipment;
}

/**
 * Obtiene el conteo total de equipamientos
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countEquipment(from, until) {
  const dateFilter = buildDateFilter(from, until, 'gi.updated_at');
  let query = 'SELECT COUNT(*) as total FROM Grupo_infraestructura gi WHERE gi.id IS NOT NULL';

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

/**
 * Obtiene equipamientos con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getEquipment({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'gi.updated_at');

  let query = `
    SELECT
      gi.id,
      gi.codigo,
      gi.nombre,
      gi.descripcion,
      gi.grupo_id,
      g.grupo_nombre,
      gi.categoria,
      gi.ubicacion,
      gi.valor_estimado,
      gi.area_mt2,
      gi.contacto,
      gi.updated_at
    FROM Grupo_infraestructura gi
    LEFT JOIN Grupo g ON gi.grupo_id = g.id
    WHERE gi.id IS NOT NULL
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY gi.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'equipments',
    },
    metadata: {
      Equipment: mapToCerif(row),
    },
  }));
}

/**
 * Obtiene solo headers de equipamientos (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getEquipmentHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'gi.updated_at');

  let query = 'SELECT gi.id, gi.updated_at FROM Grupo_infraestructura gi WHERE gi.id IS NOT NULL';

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY gi.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
    setSpec: 'equipments',
  }));
}

/**
 * Obtiene un equipamiento por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getEquipmentById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        gi.id,
        gi.codigo,
        gi.nombre,
        gi.descripcion,
        gi.grupo_id,
        g.grupo_nombre,
        gi.categoria,
        gi.ubicacion,
        gi.valor_estimado,
        gi.area_mt2,
        gi.contacto,
        gi.updated_at
      FROM Grupo_infraestructura gi
      LEFT JOIN Grupo g ON gi.grupo_id = g.id
      WHERE gi.id = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'equipments',
    },
    metadata: {
      Equipment: mapToCerif(row),
    },
  };
}
