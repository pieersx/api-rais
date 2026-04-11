import { env } from '../../config/env.js';
import { resumptionTokenDataSchema } from '../../schemas/oai-params.schema.js';

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

  const parsed = resumptionTokenDataSchema.safeParse(data);
  if (!parsed.success) {
    return { valid: false, error: 'Invalid token payload' };
  }

  if (parsed.data.completeListSize <= 0) {
    return { valid: false, error: 'Invalid completeListSize in token' };
  }

  if (parsed.data.cursor >= parsed.data.completeListSize) {
    return { valid: false, error: 'Cursor is out of range' };
  }

  return { valid: true, data: parsed.data };
}
