import { getSchemaForVerb } from '../schemas/oai-params.schema.js';
import { VALID_PARAMS_BY_VERB } from '../schemas/oai-params.schema.js';
import { OAI_VERBS } from '../utils/constants.js';

/**
 * Middleware para validar parametros OAI-PMH
 */
export function verbValidator(req, res, next) {
  const { verb } = req.query;

  // Verificar que existe el verbo
  if (!verb) {
    req.oaiError = {
      code: 'badVerb',
      message: 'The verb argument is missing',
    };
    return next();
  }

  // Verificar que es un verbo valido
  if (!OAI_VERBS.includes(verb)) {
    req.oaiError = {
      code: 'badVerb',
      message: `The value "${verb}" is not a legal OAI-PMH verb`,
    };
    return next();
  }

  // Validar que no haya parámetros extra (según Directrices PerúCRIS)
  const validParams = VALID_PARAMS_BY_VERB[verb] || [];
  const receivedParams = Object.keys(req.query);
  const invalidParams = receivedParams.filter(p => !validParams.includes(p));

  if (invalidParams.length > 0) {
    req.oaiError = {
      code: 'badArgument',
      message: `The request includes illegal arguments: ${invalidParams.join(', ')}`,
    };
    return next();
  }

  // Obtener schema para el verbo
  const schema = getSchemaForVerb(verb);

  // Validar parametros
  const result = schema.safeParse(req.query);

  if (!result.success) {
    const error = result.error.issues[0];
    let code = 'badArgument';
    let message = error.message;

    // Parsear errores especificos
    if (message.includes(':')) {
      const parts = message.split(':');
      code = parts[0];
      message = parts[1] || parts[0];
    } else if (message === 'badVerb') {
      code = 'badVerb';
    } else if (message === 'cannotDisseminateFormat') {
      code = 'cannotDisseminateFormat';
      message = 'The metadata format is not supported by this repository';
    } else if (message === 'noSetHierarchy') {
      code = 'noSetHierarchy';
      message = 'The repository does not support the specified set';
    }

    req.oaiError = { code, message };
    return next();
  }

  // Parametros validos
  req.oaiParams = result.data;
  next();
}

/**
 * Verifica que no haya argumentos exclusivos
 * Cuando se usa resumptionToken, no deben venir otros argumentos
 */
export function checkExclusiveArgs(req, res, next) {
  const { verb, resumptionToken, ...otherArgs } = req.query;

  if (resumptionToken) {
    // Si hay resumptionToken, solo debe venir verb y resumptionToken
    const extraArgs = Object.keys(otherArgs).filter(k => 
      !['metadataPrefix', 'set', 'from', 'until'].includes(k) === false &&
      otherArgs[k] !== undefined
    );

    // En realidad, con resumptionToken no deberian venir from/until/set/metadataPrefix
    const invalidWithToken = ['from', 'until', 'set', 'metadataPrefix'].filter(k => otherArgs[k]);

    if (invalidWithToken.length > 0) {
      req.oaiError = {
        code: 'badArgument',
        message: `Arguments ${invalidWithToken.join(', ')} are not allowed when resumptionToken is provided`,
      };
    }
  }

  next();
}
