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

/**
 * Mapea una fila de BD a formato CERIF Person
 * @param {object} row
 * @param {object} affiliation - Datos de afiliacion (facultad)
 * @returns {object}
 */
function mapToCerif(row, affiliation = null) {
  const identifiers = filterEmpty([
    row.doc_tipo === 'DNI' || row.doc_numero
      ? createIdentifier(IDENTIFIER_SCHEMES.DNI, row.doc_numero)
      : null,
    row.codigo_orcid
      ? createIdentifier(IDENTIFIER_SCHEMES.ORCID, `https://orcid.org/${row.codigo_orcid}`)
      : null,
    row.scopus_id && row.scopus_id !== '0'
      ? createIdentifier(IDENTIFIER_SCHEMES.SCOPUS_AUTHOR_ID, row.scopus_id)
      : null,
    row.researcher_id && row.researcher_id !== '0'
      ? createIdentifier(IDENTIFIER_SCHEMES.RESEARCHER_ID, row.researcher_id)
      : null,
  ]);

  const emails = filterEmpty([row.email1, row.email2, row.email3]);

  const affiliations = [];
  if (affiliation) {
    affiliations.push({
      orgUnit: {
        id: toCerifId('OrgUnits', `F${affiliation.id}`),
        name: affiliation.nombre,
      },
      role: row.tipo || 'Investigador',
    });
  }

  const person = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    personName: {
      familyNames: formatFamilyNames(row.apellido1, row.apellido2),
      firstNames: row.nombres || '',
      fullName: formatFullName(row.nombres, row.apellido1, row.apellido2),
    },
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
    person.keywords = [{ value: row.palabras_clave }];
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
  const dateFilter = buildDateFilter(from, until);
  let query = 'SELECT COUNT(*) as total FROM Usuario_investigador WHERE estado = 1';

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
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT 
      ui.*,
      f.id as facultad_id,
      f.nombre as facultad_nombre
    FROM Usuario_investigador ui
    LEFT JOIN Facultad f ON ui.facultad_id = f.id
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
      datestamp: toISO8601(row.updated_at),
      setSpec: 'persons',
    },
    metadata: {
      Person: mapToCerif(row, row.facultad_id ? { id: row.facultad_id, nombre: row.facultad_nombre } : null),
    },
  }));
}

/**
 * Obtiene solo headers de personas (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPersonHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT id, updated_at
    FROM Usuario_investigador
    WHERE estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const params = [...dateFilter.params, limit, offset];
  const [rows] = await pool.query(query, params);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    datestamp: toISO8601(row.updated_at),
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
      f.nombre as facultad_nombre
    FROM Usuario_investigador ui
    LEFT JOIN Facultad f ON ui.facultad_id = f.id
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
      datestamp: toISO8601(row.updated_at),
      setSpec: 'persons',
    },
    metadata: {
      Person: mapToCerif(row, row.facultad_id ? { id: row.facultad_id, nombre: row.facultad_nombre } : null),
    },
  };
}
