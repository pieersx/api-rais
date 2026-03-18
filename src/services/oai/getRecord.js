import { parseOAIIdentifier } from '../../utils/formatters.js';

// Importar repositorios
import * as personRepo from '../../repositories/person.repository.js';
import * as orgunitRepo from '../../repositories/orgunit.repository.js';
import * as publicationRepo from '../../repositories/publication.repository.js';
import * as projectRepo from '../../repositories/project.repository.js';
import * as patentRepo from '../../repositories/patent.repository.js';

// Mapeo de entityType a repositorio
const repositories = {
  Persons: personRepo.getPersonById,
  OrgUnits: orgunitRepo.getOrgUnitById,
  Publications: publicationRepo.getPublicationById,
  Projects: projectRepo.getProjectById,
  Patents: patentRepo.getPatentById,
};

/**
 * Servicio GetRecord - Retorna un registro individual
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function getRecord(params) {
  const { identifier, metadataPrefix } = params;

  // Parsear el identificador OAI
  const parsed = parseOAIIdentifier(identifier);

  if (!parsed) {
    return {
      error: {
        code: 'idDoesNotExist',
        message: `Invalid identifier format: ${identifier}`,
      },
    };
  }

  const { entityType, id } = parsed;

  // Verificar que el entityType es soportado
  const getById = repositories[entityType];

  if (!getById) {
    return {
      error: {
        code: 'idDoesNotExist',
        message: `Entity type '${entityType}' is not supported`,
      },
    };
  }

  // Obtener el registro
  const record = await getById(id);

  if (!record) {
    return {
      error: {
        code: 'idDoesNotExist',
        message: `The identifier '${identifier}' does not exist in this repository`,
      },
    };
  }

  return {
    record,
  };
}
