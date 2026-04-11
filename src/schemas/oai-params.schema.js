import { z } from 'zod';
import { OAI_VERBS, VALID_SETS, METADATA_FORMATS } from '../utils/constants.js';

const iso8601Pattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/;

// Schema para validar fechas ISO 8601
const iso8601Date = z.string().regex(
  iso8601Pattern,
  'Fecha debe estar en formato YYYY-MM-DD o YYYY-MM-DDThh:mm:ssZ'
).optional();

function isValidDateRange(from, until) {
  if (!from || !until) return true;

  const fromTime = new Date(from).getTime();
  const untilTime = new Date(until).getTime();

  if (Number.isNaN(fromTime) || Number.isNaN(untilTime)) return true;
  return fromTime <= untilTime;
}

// Schema base para parametros OAI-PMH
export const baseOaiSchema = z.object({
  verb: z.enum(OAI_VERBS, {
    errorMap: () => ({ message: 'badVerb' }),
  }),
});

// Parámetros válidos por verbo (para validación posterior)
export const VALID_PARAMS_BY_VERB = {
  Identify: ['verb'],
  ListMetadataFormats: ['verb'],
  ListSets: ['verb'],
  ListIdentifiers: ['verb', 'metadataPrefix', 'set', 'from', 'until', 'resumptionToken'],
  ListRecords: ['verb', 'metadataPrefix', 'set', 'from', 'until', 'resumptionToken'],
  GetRecord: ['verb', 'identifier', 'metadataPrefix'],
};

// Schema para Identify
export const identifySchema = baseOaiSchema.extend({
  verb: z.literal('Identify'),
});

// Schema para ListMetadataFormats
export const listMetadataFormatsSchema = baseOaiSchema.extend({
  verb: z.literal('ListMetadataFormats'),
});

// Schema para ListSets
export const listSetsSchema = baseOaiSchema.extend({
  verb: z.literal('ListSets'),
});

// Schema para metadataPrefix
const metadataPrefixSchema = z.enum(
  Object.keys(METADATA_FORMATS).map(k => METADATA_FORMATS[k].metadataPrefix),
  { errorMap: () => ({ message: 'cannotDisseminateFormat' }) }
);

const perucrisMetadataPrefixSchema = z.literal('perucris-cerif', {
  errorMap: () => ({ message: 'cannotDisseminateFormat' }),
});

// Schema para set
const setSchema = z.enum(VALID_SETS, {
  errorMap: () => ({ message: 'noSetHierarchy' }),
});

// Schema para ListIdentifiers
export const listIdentifiersSchema = baseOaiSchema.extend({
  verb: z.literal('ListIdentifiers'),
  metadataPrefix: perucrisMetadataPrefixSchema.optional(),
  set: setSchema.optional(),
  from: iso8601Date,
  until: iso8601Date,
  resumptionToken: z.string().optional(),
}).refine(
  data => data.resumptionToken || data.metadataPrefix,
  { message: 'badArgument:metadataPrefix required when resumptionToken not provided' }
).refine(
  data => isValidDateRange(data.from, data.until),
  { message: 'badArgument:from must be less than or equal to until' }
);

// Schema para ListRecords
export const listRecordsSchema = baseOaiSchema.extend({
  verb: z.literal('ListRecords'),
  metadataPrefix: perucrisMetadataPrefixSchema.optional(),
  set: setSchema.optional(),
  from: iso8601Date,
  until: iso8601Date,
  resumptionToken: z.string().optional(),
}).refine(
  data => data.resumptionToken || data.metadataPrefix,
  { message: 'badArgument:metadataPrefix required when resumptionToken not provided' }
).refine(
  data => isValidDateRange(data.from, data.until),
  { message: 'badArgument:from must be less than or equal to until' }
);

// Schema para GetRecord
export const getRecordSchema = baseOaiSchema.extend({
  verb: z.literal('GetRecord'),
  metadataPrefix: metadataPrefixSchema,
  identifier: z.string({
    required_error: 'badArgument:identifier is required',
  }).min(1),
});

// Funcion para obtener el schema segun el verbo
export function getSchemaForVerb(verb) {
  const schemas = {
    Identify: identifySchema,
    ListMetadataFormats: listMetadataFormatsSchema,
    ListSets: listSetsSchema,
    ListIdentifiers: listIdentifiersSchema,
    ListRecords: listRecordsSchema,
    GetRecord: getRecordSchema,
  };
  return schemas[verb] || baseOaiSchema;
}

// Schema para validar resumptionToken decodificado
export const resumptionTokenDataSchema = z.object({
  set: setSchema,
  metadataPrefix: metadataPrefixSchema,
  from: z.string().regex(iso8601Pattern).optional(),
  until: z.string().regex(iso8601Pattern).optional(),
  cursor: z.number().int().min(0),
  completeListSize: z.number().int().min(0),
}).refine(
  data => isValidDateRange(data.from, data.until),
  { message: 'from must be less than or equal to until' }
);
