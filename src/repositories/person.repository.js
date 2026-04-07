import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  formatFullName,
  formatFamilyNames,
  filterEmpty,
  createIdentifier,
  buildDateFilter,
} from '../utils/formatters.js';
import {
  IDENTIFIER_SCHEMES,
  GENDER_MAP,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Persons';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';

function normalizeOrcid(orcid) {
  if (!orcid) return null;
  const value = String(orcid).trim();
  if (!value) return null;
  return value.startsWith('http') ? value : `https://orcid.org/${value}`;
}

function normalizeContact(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://')) {
    return trimmed.replace('http://', 'https://');
  }

  if (/^\+?[0-9\s\-()]{6,}$/.test(trimmed)) {
    const compact = trimmed.replace(/\s+/g, '');
    return `tel:${compact}`;
  }

  if (trimmed.includes('@')) {
    return `mailto:${trimmed.toLowerCase()}`;
  }

  return `https://${trimmed}`;
}

/**
 * Mapea una fila de BD a formato CERIF Person
 * @param {object} row
 * @param {object} affiliation - Datos de afiliacion (facultad)
 * @returns {object}
 */
function mapToCerif(row, affiliation = null) {
  const fullName = formatFullName(row.nombres, row.apellido1, row.apellido2) || `Investigador ${row.id}`;

  const identifiers = filterEmpty([
    row.doc_tipo === 'DNI' && /^\d{8}$/.test(String(row.doc_numero || '').trim())
      ? createIdentifier(IDENTIFIER_SCHEMES.DNI, row.doc_numero)
      : null,
    row.codigo_orcid
      ? createIdentifier(IDENTIFIER_SCHEMES.ORCID, normalizeOrcid(row.codigo_orcid))
      : null,
    row.scopus_id && row.scopus_id !== '0'
      ? createIdentifier(IDENTIFIER_SCHEMES.SCOPUS_AUTHOR_ID, row.scopus_id)
      : null,
    row.researcher_id && row.researcher_id !== '0'
      ? createIdentifier(IDENTIFIER_SCHEMES.RESEARCHER_ID, row.researcher_id)
      : null,
  ]);

  const emails = filterEmpty([row.email1, row.email2, row.email3].map(normalizeContact));

  const affiliations = [];
  if (affiliation) {
    affiliations.push({
      orgUnit: {
        id: toCerifId('OrgUnits', `F${affiliation.id}`),
        name: affiliation.nombre,
      },
      role: 'Investigador',
    });

    if (affiliation.instituto_id && affiliation.instituto_nombre) {
      affiliations.push({
        orgUnit: {
          id: toCerifId('OrgUnits', `I${affiliation.instituto_id}`),
          name: affiliation.instituto_nombre,
        },
        role: 'Investigador',
      });
    }
  }

  const person = {
    id: toCerifId(ENTITY_TYPE, row.id),
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    personName: {
      familyNames: formatFamilyNames(row.apellido1, row.apellido2),
      firstNames: row.nombres || fullName,
      fullName,
    },
    lastModified: toISO8601(row.updated_at) || FALLBACK_DATE,
  };

  // Solo agregar campos con valores
  if (row.sexo && GENDER_MAP[row.sexo]) {
    person.gender = GENDER_MAP[row.sexo];
  }

  if (identifiers.length > 0) {
    person.identifiers = identifiers;
  }

  if (emails.length > 0) {
    person.emails = emails;
  }

  if (affiliations.length > 0) {
    person.affiliations = affiliations;
  }

  if (row.palabras_clave) {
    person.keywords = row.palabras_clave
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean)
      .map(value => ({ value }));
  }

  return person;
}

/**
 * Obtiene el conteo total de personas activas
 * @param {string} from - Fecha desde
 * @param {string} until - Fecha hasta
 * @returns {Promise<number>}
 */
export async function countPersons(from, until) {
  const dateFilter = buildDateFilter(from, until, 'ui.updated_at');
  let query = 'SELECT COUNT(*) as total FROM Usuario_investigador ui WHERE ui.estado = 1';

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

/**
 * Obtiene personas con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPersons({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'ui.updated_at');

  let query = `
    SELECT 
      ui.*,
      f.id as facultad_id,
      f.nombre as facultad_nombre,
      i.id as instituto_id,
      i.instituto as instituto_nombre
    FROM Usuario_investigador ui
    LEFT JOIN Facultad f ON ui.facultad_id = f.id
    LEFT JOIN Instituto i ON ui.instituto_id = i.id
    WHERE ui.estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY ui.id LIMIT ? OFFSET ?`;

  const params = [...dateFilter.params, limit, offset];
  const [rows] = await pool.query(query, params);

  return rows.map(row => ({
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'persons',
    },
    metadata: {
      Person: mapToCerif(
        row,
        row.facultad_id
          ? {
              id: row.facultad_id,
              nombre: row.facultad_nombre,
              instituto_id: row.instituto_id,
              instituto_nombre: row.instituto_nombre,
            }
          : null
      ),
    },
  }));
}

/**
 * Obtiene solo headers de personas (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPersonHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'ui.updated_at');

  let query = `
    SELECT ui.id, ui.updated_at
    FROM Usuario_investigador ui
    WHERE ui.estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const params = [...dateFilter.params, limit, offset];
  const [rows] = await pool.query(query, params);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
    setSpec: 'persons',
  }));
}

/**
 * Obtiene una persona por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getPersonById(id) {
  const query = `
    SELECT 
      ui.*,
      f.id as facultad_id,
      f.nombre as facultad_nombre,
      i.id as instituto_id,
      i.instituto as instituto_nombre
    FROM Usuario_investigador ui
    LEFT JOIN Facultad f ON ui.facultad_id = f.id
    LEFT JOIN Instituto i ON ui.instituto_id = i.id
    WHERE ui.id = ? AND ui.estado = 1
  `;

  const [rows] = await pool.query(query, [id]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'persons',
    },
    metadata: {
      Person: mapToCerif(
        row,
        row.facultad_id
          ? {
              id: row.facultad_id,
              nombre: row.facultad_nombre,
              instituto_id: row.instituto_id,
              instituto_nombre: row.instituto_nombre,
            }
          : null
      ),
    },
  };
}
