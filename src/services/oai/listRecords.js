import { env } from '../../config/env.js';
import { createResumptionToken, validateResumptionToken } from './resumptionToken.js';

// Importar repositorios
import * as personRepo from '../../repositories/person.repository.js';
import * as orgunitRepo from '../../repositories/orgunit.repository.js';
import * as publicationRepo from '../../repositories/publication.repository.js';
import * as projectRepo from '../../repositories/project.repository.js';
import * as patentRepo from '../../repositories/patent.repository.js';

// Mapeo de set a repositorio
const repositories = {
  persons: {
    count: personRepo.countPersons,
    getRecords: personRepo.getPersons,
  },
  orgunits: {
    count: orgunitRepo.countOrgUnits,
    getRecords: orgunitRepo.getOrgUnits,
  },
  publications: {
    count: publicationRepo.countPublications,
    getRecords: publicationRepo.getPublications,
  },
  projects: {
    count: projectRepo.countProjects,
    getRecords: projectRepo.getProjects,
  },
  patents: {
    count: patentRepo.countPatents,
    getRecords: patentRepo.getPatents,
  },
};

/**
 * Servicio ListRecords - Retorna registros completos con metadata
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function listRecords(params) {
  let set, metadataPrefix, from, until, cursor = 0, completeListSize;

  // Si viene resumptionToken, decodificar
  if (params.resumptionToken) {
    const validation = validateResumptionToken(params.resumptionToken);
    if (!validation.valid) {
      return { error: { code: 'badResumptionToken', message: validation.error } };
    }
    ({ set, metadataPrefix, from, until, cursor, completeListSize } = validation.data);
  } else {
    set = params.set;
    metadataPrefix = params.metadataPrefix;
    from = params.from;
    until = params.until;
  }

  // Verificar set
  if (!set) {
    return { error: { code: 'badArgument', message: 'set argument is required' } };
  }

  const repo = repositories[set];
  if (!repo) {
    return { error: { code: 'noSetHierarchy', message: `Set '${set}' not supported` } };
  }

  // Obtener conteo total si no viene del token
  if (completeListSize === undefined) {
    completeListSize = await repo.count(from, until);
  }

  // Verificar que hay registros
  if (completeListSize === 0) {
    return { error: { code: 'noRecordsMatch', message: 'No records match the request criteria' } };
  }

  // Obtener registros
  const records = await repo.getRecords({
    from,
    until,
    offset: cursor,
    limit: env.PAGE_SIZE,
  });

  // Construir respuesta
  const response = {
    record: records,
  };

  // Agregar resumptionToken si hay mas paginas
  if (records.length > 0) {
    const token = createResumptionToken(cursor, completeListSize, {
      set,
      metadataPrefix,
      from,
      until,
    });
    if (token) {
      response.resumptionToken = token;
    }
  }

  return response;
}
