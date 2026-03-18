import { env } from '../../config/env.js';

/**
 * Codifica los datos de paginacion en un resumptionToken
 * @param {object} data
 * @returns {string}
 */
export function encodeResumptionToken(data) {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64');
}

/**
 * Decodifica un resumptionToken
 * @param {string} token
 * @returns {object|null}
 */
export function decodeResumptionToken(token) {
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Crea un objeto resumptionToken para la respuesta
 * @param {number} cursor - Posicion actual
 * @param {number} completeListSize - Total de registros
 * @param {object} params - Parametros para el siguiente request
 * @returns {object|null}
 */
export function createResumptionToken(cursor, completeListSize, params) {
  const pageSize = env.PAGE_SIZE;
  const nextCursor = cursor + pageSize;

  // Si no hay mas paginas, retornar token vacio (fin de cosecha)
  if (nextCursor >= completeListSize) {
    return {
      '@cursor': String(cursor),
      '@completeListSize': String(completeListSize),
      '#text': '', // Token vacio indica fin
    };
  }

  // Crear token para siguiente pagina
  const tokenData = {
    ...params,
    cursor: nextCursor,
    completeListSize,
  };

  return {
    '@cursor': String(cursor),
    '@completeListSize': String(completeListSize),
    '#text': encodeResumptionToken(tokenData),
  };
}

/**
 * Valida y extrae datos de un resumptionToken
 * @param {string} token
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
export function validateResumptionToken(token) {
  if (!token) {
    return { valid: false, error: 'Token is empty' };
  }

  const data = decodeResumptionToken(token);

  if (!data) {
    return { valid: false, error: 'Invalid token format' };
  }

  // Validar campos requeridos
  if (typeof data.cursor !== 'number' || data.cursor < 0) {
    return { valid: false, error: 'Invalid cursor in token' };
  }

  if (!data.set) {
    return { valid: false, error: 'Missing set in token' };
  }

  return { valid: true, data };
}
