import { METADATA_FORMATS } from '../../utils/constants.js';

/**
 * Servicio ListMetadataFormats - Retorna formatos de metadatos soportados
 * @returns {object}
 */
export function listMetadataFormats() {
  const formats = Object.values(METADATA_FORMATS).map(format => ({
    metadataPrefix: format.metadataPrefix,
    schema: format.schema,
    metadataNamespace: format.metadataNamespace,
  }));

  return {
    metadataFormat: formats,
  };
}
