import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toInstitutionCerifId,
  toInstitutionOAIIdentifier,
  parseInstitutionInternalId,
  toISO8601,
  formatFullName,
  formatFamilyNames,
  filterEmpty,
  buildDateFilter,
  createSchemeValueEntry,
  createTextValueEntry,
  normalizeDisplayText,
  normalizeOrcidToken,
} from '../utils/formatters.js';
import {
  IDENTIFIER_SCHEMES,
  GENDER_MAP,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Persons';

const NORMALIZED_ORCID_SQL = `
  REGEXP_REPLACE(
    UPPER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(TRIM(ui.codigo_orcid), '^https?://orcid\\.org/', '', 1, 0, 'i'),
        '^orcid:[[:space:]]*',
        '',
        1,
        0,
        'i'
      )
    ),
    '[[:space:]-]+',
    ''
  )
`;

const PERSON_REQUIRED_IDENTIFIER_FILTER = `
  (
    (
      UPPER(TRIM(ui.doc_tipo)) = 'DNI'
      AND TRIM(ui.doc_numero) REGEXP '^[0-9]{8}$'
      AND TRIM(ui.doc_numero) <> '00000000'
    )
    OR
    (
      ui.codigo_orcid IS NOT NULL
      AND ${NORMALIZED_ORCID_SQL} REGEXP '^[0-9]{15}[0-9X]$'
      AND ${NORMALIZED_ORCID_SQL} <> '0000000000000000'
    )
  )
`;

const PERSON_REQUIRED_DATE_FILTER = `COALESCE(ui.updated_at, ui.created_at) IS NOT NULL`;
const PERSON_DATE_FIELD = 'COALESCE(ui.updated_at, ui.created_at)';

function normalizeOrcid(orcid) {
  return normalizeOrcidToken(orcid);
}

function normalizeEmail(value) {
  if (!value) return null;

  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed || trimmed.includes(' ')) return null;

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return null;

  const domain = trimmed.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return null;
  }

  return trimmed;
}

function normalizePhone(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed || /[A-Za-z@]/.test(trimmed)) return null;
  if (!/^\+?[0-9\s\-()]+$/.test(trimmed)) return null;

  const compact = trimmed.replace(/[()\s-]+/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;

  if (!/^\d{6,}$/.test(digits)) return null;

  return compact.startsWith('+') ? `+${digits}` : digits;
}

function normalizeUrl(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    if (!url.hostname) return null;

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeWebLikeValue(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed || /\s/.test(trimmed) || trimmed.includes('@')) return null;

  if (!/^(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:[/?#][^\s]*)?$/.test(trimmed)) {
    return null;
  }

  return `https://${trimmed}`;
}

function normalizeContact(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const lowerTrimmed = trimmed.toLowerCase();

  if (lowerTrimmed.startsWith('mailto:')) {
    const email = normalizeEmail(trimmed.slice('mailto:'.length));
    return email ? `mailto:${email}` : null;
  }

  const email = normalizeEmail(trimmed);
  if (email) {
    return `mailto:${email}`;
  }

  if (lowerTrimmed.startsWith('tel:')) {
    const phone = normalizePhone(trimmed.slice('tel:'.length));
    return phone ? `tel:${phone}` : null;
  }

  const phone = normalizePhone(trimmed);
  if (phone) {
    return `tel:${phone}`;
  }

  const explicitUrl = normalizeUrl(trimmed);
  if (explicitUrl) {
    return explicitUrl;
  }

  return normalizeWebLikeValue(trimmed);
}

function buildAffiliationContext(row) {
  return {
    id: row.facultad_id,
    nombre: row.facultad_nombre,
    instituto_id: row.instituto_id,
    instituto_nombre: row.instituto_nombre,
  };
}

function buildPersonHeader(row) {
  const header = {
    identifier: toInstitutionOAIIdentifier(ENTITY_TYPE, row.id),
    setSpec: 'persons',
  };

  const datestamp = toISO8601(row.oai_datestamp || row.updated_at || row.created_at);
  if (datestamp) {
    header.datestamp = datestamp;
  }

  return header;
}

/**
 * Mapea una fila de BD a formato CERIF Person
 * @param {object} row
 * @param {object} affiliation - Datos de afiliacion (facultad)
 * @returns {object}
 */
function mapToCerif(row, affiliation = null) {
  const documentType = String(row.doc_tipo || '').trim().toUpperCase();
  const fullName = formatFullName(row.nombres, row.apellido1, row.apellido2) || null;
  const familyNames = formatFamilyNames(row.apellido1, row.apellido2) || null;
  const firstNames = normalizeDisplayText(row.nombres);
  const orcid = normalizeOrcid(row.codigo_orcid);

  const identifiers = filterEmpty([
    documentType === 'DNI'
      && /^\d{8}$/.test(String(row.doc_numero || '').trim())
      && String(row.doc_numero || '').trim() !== '00000000'
      ? createSchemeValueEntry(IDENTIFIER_SCHEMES.DNI, row.doc_numero)
      : null,
  ]);

  const scopusAuthorId = row.scopus_id && row.scopus_id !== '0'
    ? createSchemeValueEntry(IDENTIFIER_SCHEMES.SCOPUS_AUTHOR_ID, row.scopus_id)
    : null;

  const researcherId = row.researcher_id && row.researcher_id !== '0'
    ? createSchemeValueEntry(IDENTIFIER_SCHEMES.RESEARCHER_ID, row.researcher_id)
    : null;

  const emails = [...new Set(filterEmpty([row.email1, row.email2, row.email3].map(normalizeEmail)).map(email => `mailto:${email}`))];

  const affiliations = [
    {
      OrgUnit: {
        id: toInstitutionCerifId('OrgUnits', '1'),
        name: 'Universidad Nacional Mayor de San Marcos',
      },
    },
  ];

  if (affiliation?.id && affiliation.nombre) {
    affiliations.push({
      OrgUnit: {
        id: toInstitutionCerifId('OrgUnits', `F${affiliation.id}`),
        name: normalizeDisplayText(affiliation.nombre),
      },
    });
  }

  if (affiliation?.instituto_id && affiliation.instituto_nombre) {
    affiliations.push({
      OrgUnit: {
        id: toInstitutionCerifId('OrgUnits', `I${affiliation.instituto_id}`),
        name: normalizeDisplayText(affiliation.instituto_nombre),
      },
    });
  }

  const personName = {};
  if (familyNames) {
    personName.FamilyNames = familyNames;
  }
  if (firstNames) {
    personName.FirstNames = firstNames;
  }
  if (fullName) {
    personName.FullName = fullName;
  }

  const person = {
    '@id': toInstitutionCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    PersonName: personName,
    Gender: GENDER_MAP[row.sexo],
  };

  const lastModified = toISO8601(row.oai_datestamp || row.updated_at || row.created_at);
  if (lastModified) {
    person.LastModified = lastModified;
  }

  if (identifiers.length > 0) {
    person.Identifier = identifiers;
  }

  if (scopusAuthorId) {
    person.ScopusAuthorID = scopusAuthorId;
  }

  if (researcherId) {
    person.ResearcherID = researcherId;
  }

  if (orcid) {
    person.ORCID = orcid;
  }

  if (emails.length > 0) {
    person.ElectronicAddress = emails;
  }

  if (affiliations.length > 0) {
    person.Affiliation = affiliations;
  }

  if (row.palabras_clave) {
    person.Keywords = row.palabras_clave
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean)
      .map(value => createTextValueEntry(value, null));
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
  const dateFilter = buildDateFilter(from, until, PERSON_DATE_FIELD);
  let query = `
    SELECT COUNT(*) as total
    FROM Usuario_investigador ui
    WHERE ui.estado = 1
      AND ui.sexo IN ('M', 'F')
      AND ${PERSON_REQUIRED_IDENTIFIER_FILTER}
      AND ${PERSON_REQUIRED_DATE_FILTER}
  `;

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
      ${PERSON_DATE_FIELD} as oai_datestamp,
      f.id as facultad_id,
      f.nombre as facultad_nombre,
      i.id as instituto_id,
      i.instituto as instituto_nombre
    FROM Usuario_investigador ui
    LEFT JOIN Facultad f ON ui.facultad_id = f.id
    LEFT JOIN Instituto i ON ui.instituto_id = i.id AND i.estado = 1
    WHERE ui.estado = 1
      AND ui.sexo IN ('M', 'F')
      AND ${PERSON_REQUIRED_IDENTIFIER_FILTER}
      AND ${PERSON_REQUIRED_DATE_FILTER}
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY ui.id LIMIT ? OFFSET ?`;

  const params = [...dateFilter.params, limit, offset];
  const [rows] = await pool.query(query, params);

  return rows.map(row => ({
    header: buildPersonHeader(row),
    metadata: {
      Person: mapToCerif(row, buildAffiliationContext(row)),
    },
  }));
}

/**
 * Obtiene solo headers de personas (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPersonHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, PERSON_DATE_FIELD);

  let query = `
    SELECT ui.id, ${PERSON_DATE_FIELD} as oai_datestamp
    FROM Usuario_investigador ui
    WHERE ui.estado = 1
      AND ui.sexo IN ('M', 'F')
      AND ${PERSON_REQUIRED_IDENTIFIER_FILTER}
      AND ${PERSON_REQUIRED_DATE_FILTER}
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const params = [...dateFilter.params, limit, offset];
  const [rows] = await pool.query(query, params);

  return rows.map(row => buildPersonHeader(row));
}

/**
 * Obtiene una persona por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getPersonById(id) {
  const personId = parseInstitutionInternalId(id);
  if (!personId) return null;

  const query = `
    SELECT 
      ui.*,
      ${PERSON_DATE_FIELD} as oai_datestamp,
      f.id as facultad_id,
      f.nombre as facultad_nombre,
      i.id as instituto_id,
      i.instituto as instituto_nombre
    FROM Usuario_investigador ui
    LEFT JOIN Facultad f ON ui.facultad_id = f.id
    LEFT JOIN Instituto i ON ui.instituto_id = i.id AND i.estado = 1
    WHERE ui.id = ?
      AND ui.estado = 1
      AND ui.sexo IN ('M', 'F')
      AND ${PERSON_REQUIRED_IDENTIFIER_FILTER}
      AND ${PERSON_REQUIRED_DATE_FILTER}
  `;

  const [rows] = await pool.query(query, [personId]);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    header: buildPersonHeader(row),
    metadata: {
      Person: mapToCerif(row, buildAffiliationContext(row)),
    },
  };
}
