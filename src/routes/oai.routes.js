import { Router } from 'express';
import { verbValidator, checkExclusiveArgs } from '../middleware/verbValidator.js';
import { checkOaiError, createOaiResponse, createOaiError } from '../middleware/errorHandler.js';

// Importar servicios OAI
import { identify } from '../services/oai/identify.js';
import { listMetadataFormats } from '../services/oai/listMetadataFormats.js';
import { listSets } from '../services/oai/listSets.js';
import { listIdentifiers } from '../services/oai/listIdentifiers.js';
import { listRecords } from '../services/oai/listRecords.js';
import { getRecord } from '../services/oai/getRecord.js';

const router = Router();

// Aplicar middlewares de validacion
router.use(verbValidator);
router.use(checkExclusiveArgs);
router.use(checkOaiError);

// Handler principal OAI-PMH
router.get('/', async (req, res) => {
  const params = req.oaiParams || req.query;
  const { verb } = params;

  try {
    let result;

    switch (verb) {
      case 'Identify':
        result = identify();
        return res.json(createOaiResponse('Identify', result, params, 'full'));

      case 'ListMetadataFormats':
        result = listMetadataFormats();
        return res.json(createOaiResponse('ListMetadataFormats', result, params));

      case 'ListSets':
        result = listSets();
        return res.json(createOaiResponse('ListSets', result, params));

      case 'ListIdentifiers':
        result = await listIdentifiers(params);
        if (result.error) {
          return res.json(createOaiError(result.error.code, result.error.message, params));
        }
        return res.json(createOaiResponse('ListIdentifiers', result, params));

      case 'ListRecords':
        result = await listRecords(params);
        if (result.error) {
          return res.json(createOaiError(result.error.code, result.error.message, params));
        }
        return res.json(createOaiResponse('ListRecords', result, params, 'xsi'));

      case 'GetRecord':
        result = await getRecord(params);
        if (result.error) {
          return res.json(createOaiError(result.error.code, result.error.message, params));
        }
        return res.json(createOaiResponse('GetRecord', result, params));

      default:
        return res.json(createOaiError('badVerb', `Unknown verb: ${verb}`, params));
    }
  } catch (error) {
    console.error('OAI Handler Error:', error);
    return res.json(createOaiError('badArgument', 'Internal server error', params));
  }
});

export default router;
