import { REPOSITORY_CONFIG } from '../../config/env.js';

/**
 * Servicio Identify - Retorna informacion del repositorio
 * @returns {object}
 */
export function identify() {
  return {
    repositoryName: REPOSITORY_CONFIG.repositoryName,
    baseURL: REPOSITORY_CONFIG.baseURL,
    protocolVersion: REPOSITORY_CONFIG.protocolVersion,
    adminEmail: REPOSITORY_CONFIG.adminEmail,
    earliestDatestamp: REPOSITORY_CONFIG.earliestDatestamp,
    deletedRecord: REPOSITORY_CONFIG.deletedRecord,
    granularity: REPOSITORY_CONFIG.granularity,
  };
}
