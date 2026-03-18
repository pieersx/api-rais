import { OAI_DOMAIN } from '../config/env.js';

/**
 * Formatea una fecha a ISO 8601 (W3CDTF)
 * @param {Date|string} date
 * @returns {string}
 */
export function toISO8601(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Genera la fecha actual en ISO 8601
 * @returns {string}
 */
export function nowISO8601() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Genera un identificador OAI-PMH
 * @param {string} entityType - Tipo de entidad (Persons, OrgUnits, etc.)
 * @param {string|number} id - ID interno
 * @returns {string}
 */
export function toOAIIdentifier(entityType, id) {
  return `oai:${OAI_DOMAIN}:${entityType}/${id}`;
}

/**
 * Parsea un identificador OAI-PMH
 * @param {string} oaiId - Identificador OAI completo
 * @returns {{ entityType: string, id: string } | null}
 */
export function parseOAIIdentifier(oaiId) {
  if (!oaiId) return null;

  const regex = /^oai:([^:]+):([^/]+)\/(.+)$/;
  const match = oaiId.match(regex);

  if (!match) return null;

  return {
    domain: match[1],
    entityType: match[2],
    id: match[3],
  };
}

/**
 * Genera el ID interno CERIF (EntityType/id)
 * @param {string} entityType
 * @param {string|number} id
 * @returns {string}
 */
export function toCerifId(entityType, id) {
  return `${entityType}/${id}`;
}

/**
 * Formatea un nombre completo desde componentes
 * @param {string} nombres
 * @param {string} apellido1
 * @param {string} apellido2
 * @returns {string}
 */
export function formatFullName(nombres, apellido1, apellido2) {
  const parts = [nombres, apellido1, apellido2].filter(Boolean);
  return parts.join(' ').trim();
}

/**
 * Formatea apellidos
 * @param {string} apellido1
 * @param {string} apellido2
 * @returns {string}
 */
export function formatFamilyNames(apellido1, apellido2) {
  const parts = [apellido1, apellido2].filter(Boolean);
  return parts.join(' ').trim();
}

/**
 * Filtra valores nulos/undefined/vacios de un array
 * @param {Array} arr
 * @returns {Array}
 */
export function filterEmpty(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => item !== null && item !== undefined && item !== '');
}

/**
 * Convierte un valor a array si no lo es
 * @param {*} value
 * @returns {Array}
 */
export function ensureArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Crea un objeto de titulo multilenguaje
 * @param {string} value
 * @param {string} lang
 * @returns {{ lang?: string, value: string }}
 */
export function createTitle(value, lang = null) {
  if (!value) return null;
  const obj = { value: value.trim() };
  if (lang) obj.lang = lang;
  return obj;
}

/**
 * Crea un objeto identificador
 * @param {string} scheme - URI del scheme
 * @param {string} value - Valor del identificador
 * @returns {{ scheme: string, value: string } | null}
 */
export function createIdentifier(scheme, value) {
  if (!value || value === '0' || value === '') return null;
  return { scheme, value: String(value).trim() };
}

/**
 * Crea un objeto identificador con type (para publicaciones)
 * @param {string} type
 * @param {string} value
 * @returns {{ type: string, value: string } | null}
 */
export function createTypedIdentifier(type, value) {
  if (!value || value === '') return null;
  return { type, value: String(value).trim() };
}

/**
 * Mapea el setSpec a la configuracion de entidad
 * @param {string} setSpec
 * @returns {{ entityType: string, table: string }}
 */
export function getEntityConfig(setSpec) {
  const configs = {
    persons: { entityType: 'Persons', table: 'Usuario_investigador' },
    orgunits: { entityType: 'OrgUnits', table: 'Facultad' },
    publications: { entityType: 'Publications', table: 'Publicacion' },
    projects: { entityType: 'Projects', table: 'Proyecto' },
    patents: { entityType: 'Patents', table: 'Patente' },
  };
  return configs[setSpec] || null;
}

/**
 * Valida y parsea una fecha ISO 8601 para filtros from/until
 * @param {string} dateStr
 * @returns {Date|null}
 */
export function parseFilterDate(dateStr) {
  if (!dateStr) return null;

  // Soportar YYYY-MM-DD o YYYY-MM-DDThh:mm:ssZ
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Construye clausula WHERE para filtros de fecha
 * @param {string} fromDate
 * @param {string} untilDate
 * @param {string} dateField - Campo de fecha en la tabla (default: updated_at)
 * @returns {{ clause: string, params: Array }}
 */
export function buildDateFilter(fromDate, untilDate, dateField = 'updated_at') {
  const conditions = [];
  const params = [];

  if (fromDate) {
    const from = parseFilterDate(fromDate);
    if (from) {
      conditions.push(`${dateField} >= ?`);
      params.push(from);
    }
  }

  if (untilDate) {
    const until = parseFilterDate(untilDate);
    if (until) {
      conditions.push(`${dateField} <= ?`);
      params.push(until);
    }
  }

  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : '',
    params,
  };
}
