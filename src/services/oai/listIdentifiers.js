import { env } from '../../config/env.js';
import { createResumptionToken, validateResumptionToken } from './resumptionToken.js';
import { normalizeSetSpec } from '../../utils/formatters.js';

// Importar repositorios
import * as personRepo from '../../repositories/person.repository.js';
import * as orgunitRepo from '../../repositories/orgunit.repository.js';
import * as publicationRepo from '../../repositories/publication.repository.js';
import * as projectRepo from '../../repositories/project.repository.js';
import * as patentRepo from '../../repositories/patent.repository.js';
import * as fundingRepo from '../../repositories/funding.repository.js';
import * as equipmentRepo from '../../repositories/equipment.repository.js';

const REQUIRED_METADATA_PREFIX = 'perucris-cerif';

// Mapeo de set a repositorio
const repositories = {
  persons: {
    count: personRepo.countPersons,
    getHeaders: personRepo.getPersonHeaders,
  },
  orgunits: {
    count: orgunitRepo.countOrgUnits,
    getHeaders: orgunitRepo.getOrgUnitHeaders,
  },
  publications: {
    count: publicationRepo.countPublications,
    getHeaders: publicationRepo.getPublicationHeaders,
  },
  projects: {
    count: projectRepo.countProjects,
    getHeaders: projectRepo.getProjectHeaders,
  },
  patents: {
    count: patentRepo.countPatents,
    getHeaders: patentRepo.getPatentHeaders,
  },
  fundings: {
    count: fundingRepo.countFunding,
    getHeaders: fundingRepo.getFundingHeaders,
  },
  equipments: {
    count: equipmentRepo.countEquipment,
    getHeaders: equipmentRepo.getEquipmentHeaders,
  },
};

/**
 * Servicio ListIdentifiers - Retorna headers de registros
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function listIdentifiers(params) {
  let set, metadataPrefix, from, until, cursor = 0, completeListSize;

  // Si viene resumptionToken, decodificar
  if (params.resumptionToken) {
    const validation = validateResumptionToken(params.resumptionToken);
    if (!validation.valid) {
      return { error: { code: 'badResumptionToken', message: validation.error } };
    }
    ({ set, metadataPrefix, from, until, cursor, completeListSize } = validation.data);
    set = normalizeSetSpec(set);
  } else {
    set = normalizeSetSpec(params.set);
    metadataPrefix = params.metadataPrefix;
    from = params.from;
    until = params.until;
  }

  // Verificar set
  if (!set) {
    return { error: { code: 'badArgument', message: 'set argument is required' } };
  }

  if (metadataPrefix !== REQUIRED_METADATA_PREFIX) {
    return {
      error: {
        code: 'cannotDisseminateFormat',
        message: 'The metadata format is not supported by this repository',
      },
    };
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

  // Obtener headers
  const headers = await repo.getHeaders({
    from,
    until,
    offset: cursor,
    limit: env.PAGE_SIZE,
  });

  // Construir respuesta
  const response = {
    header: headers,
  };

  // Agregar resumptionToken si hay mas paginas
  if (headers.length > 0) {
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
