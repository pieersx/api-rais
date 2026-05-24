import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  buildDateFilter,
  createSchemeValueEntry,
  createTextValueEntry,
} from '../utils/formatters.js';
import {
  EQUIPMENT_TYPE_KEYWORDS,
  IDENTIFIER_SCHEMES,
  NAMESPACES,
  VOCABULARIES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Equipments';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';
const ROOT_ORGUNIT_ID = toCerifId('OrgUnits', '1');
const ROOT_ORGUNIT_NAME = 'Universidad Nacional Mayor de San Marcos';
const EQUIPMENT_TYPE_SCHEME = VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES;

function normalizeText(value) {
  return String(value || '')
    .trim()
    || null;
}

function normalizeCategoryKey(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  return normalized
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function getEquipmentType(row) {
  const categoria = normalizeText(row.categoria);
  const searchableText = [row.categoria, row.nombre, row.descripcion, row.ubicacion]
    .map(normalizeCategoryKey)
    .filter(Boolean)
    .join(' ');

  if (categoria?.startsWith(`${EQUIPMENT_TYPE_SCHEME}#`)) {
    return categoria;
  }

  for (const [keyword, uri] of EQUIPMENT_TYPE_KEYWORDS) {
    if (searchableText.includes(keyword)) {
      return uri;
    }
  }

  return `${EQUIPMENT_TYPE_SCHEME}#otrosEquipamientos`;
}

function buildOwner(row) {
  const ownerGroupId = normalizeText(row.owner_group_id);
  const ownerGroupName = normalizeText(row.owner_group_name);

  if (ownerGroupId) {
    const owner = {
      OrgUnit: {
        id: toCerifId('OrgUnits', `G${ownerGroupId}`),
      },
    };

    if (ownerGroupName) {
      owner.OrgUnit.name = ownerGroupName;
    }

    return owner;
  }

  return {
    OrgUnit: {
      id: ROOT_ORGUNIT_ID,
      name: ROOT_ORGUNIT_NAME,
    },
  };
}

function mapToCerif(row) {
  const equipmentId = toCerifId(ENTITY_TYPE, row.id);
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;
  const codigo = normalizeText(row.codigo);
  const nombre = normalizeText(row.nombre);
  const descripcion = normalizeText(row.descripcion);
  const ubicacion = normalizeText(row.ubicacion);
  const contacto = normalizeText(row.contacto);
  const type = getEquipmentType(row);

  const equipment = {
    '@id': equipmentId,
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Owner: buildOwner(row),
    LastModified: lastModified,
  };

  const identifiers = filterEmpty([
    createSchemeValueEntry(IDENTIFIER_SCHEMES.CRIS_ID, codigo || row.id),
  ]);
  if (identifiers.length > 0) {
    equipment.Identifier = identifiers;
  }

  if (type) {
    equipment.Type = {
      Scheme: EQUIPMENT_TYPE_SCHEME,
      Value: type,
    };
  }

  const names = filterEmpty([
    createTextValueEntry(nombre || `Equipamiento ${row.id}`, 'es'),
  ]);
  if (names.length > 0) {
    equipment.Name = names;
  }

  const descriptionParts = [];
  if (descripcion) descriptionParts.push(descripcion);
  if (ubicacion) descriptionParts.push(`Ubicación: ${ubicacion}`);
  if (contacto) descriptionParts.push(`Contacto: ${contacto}`);

  if (descriptionParts.length > 0) {
    equipment.Description = filterEmpty([
      createTextValueEntry(descriptionParts.join('. '), 'es'),
    ]);
  }

  if (contacto) {
    equipment.Contact = {
      value: contacto,
    };
  }

  if (row.area_mt2 && Number(row.area_mt2) > 0) {
    equipment.Area = {
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
  let query = `
    SELECT COUNT(*) as total
    FROM Grupo_infraestructura gi
    WHERE LOWER(TRIM(gi.categoria)) = 'equipo'
  `;

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
      CASE WHEN g.estado = 4 THEN g.id ELSE NULL END AS owner_group_id,
      CASE WHEN g.estado = 4 THEN g.grupo_nombre ELSE NULL END AS owner_group_name,
      gi.categoria,
      gi.ubicacion,
      gi.valor_estimado,
      gi.area_mt2,
      gi.contacto,
      gi.updated_at
    FROM Grupo_infraestructura gi
    LEFT JOIN Grupo g ON gi.grupo_id = g.id
    WHERE LOWER(TRIM(gi.categoria)) = 'equipo'
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

  let query = `
    SELECT gi.id, gi.updated_at
    FROM Grupo_infraestructura gi
    WHERE LOWER(TRIM(gi.categoria)) = 'equipo'
  `;

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
        CASE WHEN g.estado = 4 THEN g.id ELSE NULL END AS owner_group_id,
        CASE WHEN g.estado = 4 THEN g.grupo_nombre ELSE NULL END AS owner_group_name,
        gi.categoria,
        gi.ubicacion,
        gi.valor_estimado,
        gi.area_mt2,
        gi.contacto,
        gi.updated_at
      FROM Grupo_infraestructura gi
      LEFT JOIN Grupo g ON gi.grupo_id = g.id
      WHERE gi.id = ?
        AND LOWER(TRIM(gi.categoria)) = 'equipo'
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
