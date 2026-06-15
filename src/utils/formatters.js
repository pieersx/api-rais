import { OAI_DOMAIN } from '../config/env.js';
import { ACCESS_RIGHTS, LEGACY_SET_ALIASES, PATENT_IPC_BY_KEYWORDS } from './constants.js';

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
 * Normaliza un setSpec legado a su valor canónico
 * @param {string} setSpec
 * @returns {string}
 */
export function normalizeSetSpec(setSpec) {
  if (!setSpec) return setSpec;
  return LEGACY_SET_ALIASES[setSpec] || setSpec;
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

const DISPLAY_LOWERCASE_WORDS = new Set([
  'a',
  'al',
  'ante',
  'bajo',
  'con',
  'contra',
  'de',
  'del',
  'desde',
  'durante',
  'e',
  'el',
  'en',
  'entre',
  'hacia',
  'hasta',
  'la',
  'las',
  'los',
  'o',
  'para',
  'por',
  'segun',
  'según',
  'sin',
  'sobre',
  'tras',
  'u',
  'y',
]);

const DISPLAY_ACRONYMS = new Set([
  'ADN',
  'ARN',
  'CTI',
  'I+D',
  'I+D+I',
  'INDECOPI',
  'OCDE',
  'PCR',
  'RENACYT',
  'RENATI',
  'SUNEDU',
  'UNMSM',
  'VRI',
]);

const DISPLAY_ACCENT_WORDS = new Map([
  ['academica', 'académica'],
  ['academico', 'académico'],
  ['administracion', 'administración'],
  ['alarcon', 'alarcón'],
  ['analisis', 'análisis'],
  ['antropologia', 'antropología'],
  ['aplicacion', 'aplicación'],
  ['biologia', 'biología'],
  ['bioquimica', 'bioquímica'],
  ['clinica', 'clínica'],
  ['clinico', 'clínico'],
  ['comunicacion', 'comunicación'],
  ['desarrollo', 'desarrollo'],
  ['educacion', 'educación'],
  ['electronica', 'electrónica'],
  ['farmaceutica', 'farmacéutica'],
  ['farmaceutico', 'farmacéutico'],
  ['fisica', 'física'],
  ['genetica', 'genética'],
  ['gestion', 'gestión'],
  ['historica', 'histórica'],
  ['historico', 'histórico'],
  ['innovacion', 'innovación'],
  ['investigacion', 'investigación'],
  ['matematica', 'matemática'],
  ['matematicas', 'matemáticas'],
  ['medica', 'médica'],
  ['medico', 'médico'],
  ['metodologia', 'metodología'],
  ['nanotecnologia', 'nanotecnología'],
  ['nutricion', 'nutrición'],
  ['odontologia', 'odontología'],
  ['politica', 'política'],
  ['politicas', 'políticas'],
  ['produccion', 'producción'],
  ['quimica', 'química'],
  ['quimico', 'químico'],
  ['salud', 'salud'],
  ['sanchez', 'sánchez'],
  ['tecnica', 'técnica'],
  ['tecnico', 'técnico'],
  ['tecnologia', 'tecnología'],
  ['tecnologica', 'tecnológica'],
  ['tecnologico', 'tecnológico'],
  ['veterinaria', 'veterinaria'],
]);

function hasOnlyUppercaseLetters(value) {
  const letters = String(value).match(/\p{Letter}/gu) || [];
  if (letters.length < 2) return false;
  return letters.every(letter => letter === letter.toLocaleUpperCase('es-PE'));
}

function normalizeDisplayToken(token, index) {
  if (!token) return token;

  const upper = token.toLocaleUpperCase('es-PE');
  const lower = token.toLocaleLowerCase('es-PE');

  if (DISPLAY_ACRONYMS.has(upper) || /[0-9+&]/.test(token)) {
    return upper;
  }

  const accentWord = DISPLAY_ACCENT_WORDS.get(lower) || lower;
  if (index > 0 && DISPLAY_LOWERCASE_WORDS.has(lower)) {
    return accentWord;
  }

  return accentWord.charAt(0).toLocaleUpperCase('es-PE') + accentWord.slice(1);
}

function normalizeDisplayWord(word, index) {
  return String(word)
    .split(/([-./])/)
    .map((part, partIndex) => {
      if (/^[-./]$/.test(part)) return part;
      if (!part) return part;
      return normalizeDisplayToken(part, index + partIndex);
    })
    .join('');
}

/**
 * Normaliza nombres/titulos que vienen completamente en mayusculas.
 * Si el texto ya usa altas y bajas, lo conserva tal como viene de la fuente.
 * @param {string} value
 * @returns {string|null}
 */
export function normalizeDisplayText(value) {
  if (!value) return null;

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  if (!hasOnlyUppercaseLetters(normalized)) {
    return normalized;
  }

  return normalized
    .split(/(\s+)/)
    .map((part, index) => {
      if (/^\s+$/.test(part)) return part;
      return normalizeDisplayWord(part, index);
    })
    .join('');
}

const PROJECT_ID_PREFIX = 'UNMSM-';

export function formatProjectInternalId(id) {
  const normalized = String(id ?? '').trim();
  if (!normalized) return null;

  if (normalized.startsWith(PROJECT_ID_PREFIX)) {
    return normalized;
  }

  return `${PROJECT_ID_PREFIX}${normalized}`;
}

export function parseProjectInternalId(id) {
  const normalized = String(id ?? '').trim();
  if (!normalized) return null;

  if (normalized.startsWith(PROJECT_ID_PREFIX)) {
    return normalized.slice(PROJECT_ID_PREFIX.length) || null;
  }

  return normalized;
}

export function toProjectCerifId(id) {
  const projectId = formatProjectInternalId(id);
  return projectId ? toCerifId('Projects', projectId) : null;
}

export function toProjectOAIIdentifier(id) {
  const projectId = formatProjectInternalId(id);
  return projectId ? toOAIIdentifier('Projects', projectId) : null;
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
  return normalizeDisplayText(parts.join(' ').trim());
}

/**
 * Formatea apellidos
 * @param {string} apellido1
 * @param {string} apellido2
 * @returns {string}
 */
export function formatFamilyNames(apellido1, apellido2) {
  const parts = [apellido1, apellido2].filter(Boolean);
  return normalizeDisplayText(parts.join(' ').trim());
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
 * Normaliza ORCID al formato canónico 0000-0000-0000-000X
 * @param {string} value
 * @returns {string | null}
 */
export function normalizeOrcidToken(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const withoutPrefix = trimmed
    .replace(/^https?:\/\/orcid\.org\//i, '')
    .replace(/^orcid:\s*/i, '')
    .replace(/\s+/g, '')
    .toUpperCase();

  const compact = withoutPrefix.replace(/-/g, '');
  if (!/^\d{15}[\dX]$/.test(compact)) return null;
  if (compact === '0000000000000000') return null;

  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12)}`;
}

/**
 * Crea un objeto { Scheme, Value }
 * @param {string} scheme
 * @param {string|number} value
 * @returns {{ Scheme: string, Value: string } | null}
 */
export function createSchemeValueEntry(scheme, value) {
  if (!scheme || value === null || value === undefined) return null;

  const normalized = String(value).trim();
  if (!normalized || normalized === '0') return null;
  if (/^[-]+$/.test(normalized)) return null;
  if (/^(null|undefined)$/i.test(normalized)) return null;

  return {
    Scheme: scheme,
    Value: normalized,
  };
}

/**
 * Crea un objeto multilenguaje { Lang?, Value }
 * @param {string} value
 * @param {string|null} lang
 * @returns {{ Lang?: string, Value: string } | null}
 */
export function createTextValueEntry(value, lang = null) {
  if (!value) return null;

  const normalized = normalizeDisplayText(value);
  if (!normalized) return null;

  const entry = {
    Value: normalized,
  };

  if (lang) {
    entry.Lang = lang;
  }

  return entry;
}

/**
 * Mapea el setSpec a la configuracion de entidad
 * @param {string} setSpec
 * @returns {{ entityType: string, table: string }}
 */
export function getEntityConfig(setSpec) {
  const normalizedSet = normalizeSetSpec(setSpec);
  const configs = {
    persons: { entityType: 'Persons', table: 'Usuario_investigador' },
    orgunits: { entityType: 'OrgUnits', table: 'Facultad' },
    publications: { entityType: 'Publications', table: 'Publicacion' },
    projects: { entityType: 'Projects', table: 'Proyecto' },
    patents: { entityType: 'Patents', table: 'Patente' },
    fundings: { entityType: 'Fundings', table: 'Proyecto' },
    equipments: { entityType: 'Equipments', table: 'Grupo_infraestructura' },
  };
  return configs[normalizedSet] || null;
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

/**
 * Infiere el tipo de acceso (Access Rights) basado en identificadores disponibles
 * @param {object} row - Registro de publicacion
 * @param {string} row.doi - DOI de la publicacion
 * @param {string} row.url - URL de la publicacion
 * @param {string} row.uri - URI del repositorio institucional
 * @param {string} row.tipo_publicacion - Tipo de publicacion
 * @returns {{ uri: string, label: string }}
 */
export function inferAccessRights(row) {
  // Si tiene DOI, URL o URI (repositorio), asumir Open Access
  if (row.doi || row.url || row.uri) {
    return ACCESS_RIGHTS.OPEN_ACCESS;
  }

  // Si es tesis-asesoria y no tiene URI, probablemente no está en repositorio
  if (row.tipo_publicacion === 'tesis-asesoria' && !row.uri) {
    return ACCESS_RIGHTS.METADATA_ONLY;
  }

  // Por defecto, si no hay identificadores públicos: Metadata Only
  return ACCESS_RIGHTS.METADATA_ONLY;
}

/**
 * Infiere la clasificacion IPC (CIP) para patentes basado en titulo y tipo
 * @param {object} row - Registro de patente
 * @param {string} row.titulo - Titulo de la patente
 * @param {string} row.tipo - Tipo de patente
 * @returns {{ scheme: string, value: string, note?: string }}
 */
export function inferIPCClassification(row) {
  const title = (row.titulo || '').toLowerCase();
  const type = (row.tipo || '').toLowerCase();

  // Buscar coincidencia con palabras clave (iterando array ordenado)
  for (const [keywords, ipcCode] of PATENT_IPC_BY_KEYWORDS) {
    const regex = new RegExp(keywords, 'i');
    if (regex.test(title)) {
      return {
        scheme: 'http://data.epo.org/linked-data/def/ipc/',
        value: `http://data.epo.org/linked-data/def/ipc/${ipcCode}`,
      };
    }
  }

  // Mapeo por tipo cuando no hay coincidencia en título
  if (type.includes('modelo de utilidad')) {
    return {
      scheme: 'http://data.epo.org/linked-data/def/ipc/',
      value: 'http://data.epo.org/linked-data/def/ipc/F16H', // Elementos de máquinas
      note: 'Clasificación inferida por tipo - requiere curación manual',
    };
  }

  // Fallback: Clase técnica general
  return {
    scheme: 'http://data.epo.org/linked-data/def/ipc/',
    value: 'http://data.epo.org/linked-data/def/ipc/Y10S', // Clase técnica general
    note: 'Clasificación genérica - requiere curación manual',
  };
}
