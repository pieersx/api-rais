import { nowISO8601 } from '../utils/formatters.js';
import { env, REPOSITORY_CONFIG } from '../config/env.js';
import { NAMESPACES, OAI_ERRORS } from '../utils/constants.js';

/**
 * Crea una respuesta de error OAI-PMH
 * @param {string} code - Codigo de error OAI-PMH
 * @param {string} message - Mensaje de error
 * @param {object} request - Objeto request para incluir en la respuesta
 * @returns {object}
 */
export function createOaiError(code, message, request = {}) {
  return {
    'OAI-PMH': {
      '@xmlns': NAMESPACES.OAI_PMH,
      responseDate: nowISO8601(),
      request: {
        '@verb': request.verb || '',
        ...buildRequestAttrs(request),
        '#text': REPOSITORY_CONFIG.baseURL,
      },
      error: {
        '@code': code,
        '#text': message || OAI_ERRORS[code] || 'Unknown error',
      },
    },
  };
}

/**
 * Construye los atributos del request para la respuesta
 * @param {object} params
 * @returns {object}
 */
function buildRequestAttrs(params) {
  const attrs = {};
  
  if (params.metadataPrefix) attrs['@metadataPrefix'] = params.metadataPrefix;
  if (params.set) attrs['@set'] = params.set;
  if (params.from) attrs['@from'] = params.from;
  if (params.until) attrs['@until'] = params.until;
  if (params.identifier) attrs['@identifier'] = params.identifier;
  if (params.resumptionToken) attrs['@resumptionToken'] = params.resumptionToken;
  
  return attrs;
}

/**
 * Crea una respuesta OAI-PMH exitosa
 * @param {string} verb - Verbo OAI-PMH
 * @param {object} content - Contenido de la respuesta
 * @param {object} request - Parametros del request
 * @returns {object}
 */
export function createOaiResponse(verb, content, request = {}) {
  return {
    'OAI-PMH': {
      '@xmlns': NAMESPACES.OAI_PMH,
      responseDate: nowISO8601(),
      request: {
        '@verb': verb,
        ...buildRequestAttrs(request),
        '#text': REPOSITORY_CONFIG.baseURL,
      },
      [verb]: content,
    },
  };
}

/**
 * Middleware de manejo de errores OAI-PMH
 */
export function oaiErrorHandler(err, req, res, next) {
  console.error('OAI Error:', err);

  // Si ya hay un error OAI en el request
  if (req.oaiError) {
    const response = createOaiError(
      req.oaiError.code,
      req.oaiError.message,
      req.query
    );
    return res.status(200).json(response);
  }

  // Error interno del servidor
  const response = createOaiError(
    'badArgument',
    'Internal server error',
    req.query
  );
  res.status(200).json(response);
}

/**
 * Middleware para verificar y manejar errores OAI antes de procesar
 */
export function checkOaiError(req, res, next) {
  if (req.oaiError) {
    const response = createOaiError(
      req.oaiError.code,
      req.oaiError.message,
      req.query
    );
    return res.json(response);
  }
  next();
}
