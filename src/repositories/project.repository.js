import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toInstitutionCerifId,
  toISO8601,
  filterEmpty,
  buildDateFilter,
  createSchemeValueEntry,
  createTextValueEntry,
  formatFamilyNames,
  formatFullName,
  formatProjectInternalId,
  normalizeDisplayText,
  normalizeOrcidToken,
  parseProjectInternalId,
  toEquipmentCerifId,
  toProjectCerifId,
  toProjectOAIIdentifier,
} from '../utils/formatters.js';
import {
  CONCYTEC_PROJECT_STATUS_MAP,
  IDENTIFIER_SCHEMES,
  PROJECT_MEMBER_OCCUPATION_RULES,
  PROJECT_TYPE_CONCYTEC_MAP,
  PROJECT_TYPE_OCDE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Projects';
const ROOT_ORGUNIT = {
  id: toInstitutionCerifId('OrgUnits', '1'),
  Name: 'Universidad Nacional Mayor de San Marcos',
};
const EQUIPMENT_EXCLUSION_REGEXP = 'archivador|armario|deshumedecedor|silla|sill[oó]n|cpu|unidad central de proceso|refrigeradora el[eé]ctrica dom[eé]stica|refrigeradora dom[eé]stica|secadora|mesa|estante|mouse|teclado|keyboard|parlante|webcam|monitor|proyector|router|televisor|tel[eé]fono|aire acondicionado|tablet|laptop|computadora port[aá]til|computadora personal|microcomputadora|modulo de computadora|m[oó]dulo de computadora|impresora laser|impresora multifuncional|copiadora|scanner|fax|ups';
const EQUIPMENT_PRESERVE_REGEXP = 'impresora 3d|servidor|workstation|think station|alto desempe[nñ]o|cluster|gpu';
const EXTERNAL_FUNDING_TOTAL = `
  (
    COALESCE(p.aporte_no_unmsm, 0)
    + COALESCE(p.financiamiento_fuente_externa, 0)
    + COALESCE(p.entidad_asociada, 0)
  )
`;
const PROJECT_HAS_FUNDING_DATA = `
  (
    (p.codigo_proyecto IS NOT NULL AND TRIM(p.codigo_proyecto) <> '')
    OR p.convocatoria IS NOT NULL
    OR (
      COALESCE(p.aporte_unmsm, 0)
      + COALESCE(p.aporte_no_unmsm, 0)
      + COALESCE(p.financiamiento_fuente_externa, 0)
      + COALESCE(p.entidad_asociada, 0)
    ) > 0
  )
`;
const PROJECT_HAS_REQUIRED_IDENTIFIER = `
  (p.codigo_proyecto IS NOT NULL AND TRIM(p.codigo_proyecto) <> '')
`;
const REAL_EXTERNAL_PROJECT = `
  (
    LOWER(TRIM(COALESCE(p.tipo_proyecto, ''))) = 'pfex'
    OR ${EXTERNAL_FUNDING_TOTAL} > 0
  )
`;
const PROJECT_HAS_REAL_PI = `
  EXISTS (
    SELECT 1
    FROM Proyecto_integrante pi2
    LEFT JOIN Proyecto_integrante_tipo pit2 ON pit2.id = pi2.proyecto_integrante_tipo_id
    WHERE pi2.proyecto_id = p.id
      AND IFNULL(pi2.estado, 1) = 1
      AND pi2.investigador_id IS NOT NULL
      AND LOWER(TRIM(CONCAT_WS(' ', COALESCE(pit2.nombre, ''), COALESCE(pi2.condicion, ''), COALESCE(pi2.responsabilidad, ''))))
        REGEXP 'responsable|investigador principal|coordinador'
  )
`;
const STRICT_PROJECT_ELIGIBILITY = `
  (
    ${PROJECT_HAS_REQUIRED_IDENTIFIER}
    AND
    ${PROJECT_HAS_FUNDING_DATA}
    AND ${PROJECT_HAS_REAL_PI}
    AND (NOT ${REAL_EXTERNAL_PROJECT} OR ef.external_funder_count = 1)
  )
`;

function getProjectTypes(row) {
  const types = [];
  const projectType = String(row.tipo_proyecto || '').trim();

  if (!projectType) {
    return types;
  }

  const ocdeType = PROJECT_TYPE_OCDE_MAP[projectType];
  if (ocdeType) {
    types.push({
      Scheme: VOCABULARIES.OCDE_PROJECT_TYPES,
      Value: ocdeType,
    });
  }

  const concytecType = PROJECT_TYPE_CONCYTEC_MAP[projectType];
  if (concytecType) {
    types.push({
      Scheme: 'http://purl.org/pe-repo/concytec/terminos',
      Value: concytecType,
    });
  }

  return types;
}

function hasFundingData(row) {
  const total =
    Number(row.aporte_unmsm || 0)
    + Number(row.aporte_no_unmsm || 0)
    + Number(row.financiamiento_fuente_externa || 0)
    + Number(row.entidad_asociada || 0);

  return total > 0 || (row.codigo_proyecto && String(row.codigo_proyecto).trim() !== '');
}

function buildParticipantRole(integrante) {
  const roles = [
    integrante.tipo_nombre,
    integrante.condicion,
    integrante.responsabilidad,
  ]
    .map(normalizeHumanText)
    .filter(Boolean);

  if (roles.length === 0) return null;

  const principalRole = roles.find(role => isPrincipalRole(role));
  return principalRole || roles[0];
}

function normalizeHumanText(value) {
  if (!value) return null;

  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized || normalized === '-' || normalized === '--' || normalized === '---') {
    return null;
  }

  return normalized;
}

function normalizeRoleKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function isPrincipalRole(role) {
  const normalizedRole = normalizeRoleKey(role);
  return normalizedRole.includes('responsable')
    || normalizedRole.includes('investigador principal')
    || normalizedRole.includes('coordinador');
}

function getMemberOccupationType(role) {
  const normalizedRole = normalizeRoleKey(role);

  for (const [keyword, uri] of PROJECT_MEMBER_OCCUPATION_RULES) {
    if (normalizedRole.includes(keyword)) {
      return uri;
    }
  }

  return `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`;
}

function buildAffiliation(integrante) {
  const affiliations = [];

  if (integrante.facultad_id && integrante.facultad_nombre) {
    affiliations.push({
      OrgUnit: {
        id: toInstitutionCerifId('OrgUnits', `F${integrante.facultad_id}`),
        Name: normalizeDisplayText(integrante.facultad_nombre), 
      },
    });
  }

  return affiliations;
}

function buildPersonParticipant(integrante) {
  const fullName = formatFullName(integrante.nombres, integrante.apellido1, integrante.apellido2);
  const familyNames = formatFamilyNames(integrante.apellido1, integrante.apellido2);
  const firstNames = normalizeDisplayText(integrante.nombres);
  const role = buildParticipantRole(integrante);

  if (!role || (!integrante.investigador_id && !fullName)) return null;

  const person = {};
  if (integrante.investigador_id) {
    person.id = toInstitutionCerifId('Persons', integrante.investigador_id);
  }
  
  
  const personName = {};
  if (familyNames && firstNames) {
    personName.FamilyNames = familyNames;
    personName.FirstNames = firstNames;
  } else if (fullName) {
    personName.FullName = fullName;
  }
  
  if (Object.keys(personName).length > 0) {
    person.PersonName = personName;
  }

  const orcid = normalizeOrcidToken(integrante.codigo_orcid);
  if (orcid) {
    person.ORCID = orcid;
  }

  const affiliations = buildAffiliation(integrante);
  if (affiliations.length > 0) {
    person.Affiliation = affiliations;
  }

  return {
    role,
    Person: person,
  };
}

function buildTeam(integrantes) {
  const principalInvestigators = [];
  const members = [];

  for (const integrante of integrantes) {
    const participant = buildPersonParticipant(integrante);
    if (!participant) continue;

    if (isPrincipalRole(participant.role)) {
      principalInvestigators.push({
        Person: participant.Person,
      });
      continue;
    }

    members.push({
      '@type': getMemberOccupationType(participant.role),
      Person: participant.Person,
    });
  }

  if (principalInvestigators.length === 0) {
    return null;
  }

  return {
    PrincipalInvestigator: principalInvestigators,
    ...(members.length > 0 ? { Member: members } : {}),
  };
}

function buildConsortium(row) {
  if (row.grupo_id && row.grupo_nombre) {
    return {
      Contractor: [
        {
          OrgUnit: {
            id: toInstitutionCerifId('OrgUnits', `G${row.grupo_id}`),
            Name: normalizeDisplayText(row.grupo_nombre),
          },
        },
      ],
    };
  }

  if (row.facultad_id && row.facultad_nombre) {
    return {
      Contractor: [
        {
          OrgUnit: {
            id: toInstitutionCerifId('OrgUnits', `F${row.facultad_id}`),
            Name: normalizeDisplayText(row.facultad_nombre),
          },
        },
      ],
    };
  }

  return {
    Contractor: [
      {
        OrgUnit: ROOT_ORGUNIT,
      },
    ],
  };
}

function buildFunded(row) {
  if (!hasFundingData(row)) return null;

  const by = row.is_external_project
    ? {
        OrgUnit: {
          Name: row.external_funder_name,
        },
      }
    : {
        OrgUnit: ROOT_ORGUNIT,
      };

  return {
    By: by,
    As: {
      Funding: {
        id: toInstitutionCerifId('Fundings', `P${row.id}`),
        ...(normalizeHumanText(row.titulo || row.codigo_proyecto)
          ? {
              Name: filterEmpty([
                createTextValueEntry(normalizeHumanText(row.titulo || row.codigo_proyecto), 'es'),
              ]),
            }
          : {}),
      },
    },
  };
}

function mapToCerif(row, integrantes = [], ocde = null, abstract = null, equipments = []) {
  const titleValue = normalizeDisplayText(row.titulo) || '';
  const lastModified = toISO8601(row.updated_at);
  const team = buildTeam(integrantes);
  const consortium = buildConsortium(row);
  const funded = buildFunded(row);

  const project = {
    '@id': toProjectCerifId(row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Consortium: consortium,
    OAMandate: {
      '@mandated': false,
    },
  };

  if (titleValue) {
    project.Title = filterEmpty([createTextValueEntry(titleValue, 'es')]);
  }

  if (lastModified) {
    project.LastModified = lastModified;
  }

  if (row.id) {
    project.Identifier = filterEmpty([
      createSchemeValueEntry(IDENTIFIER_SCHEMES.PROJECT_REFERENCE, formatProjectInternalId(row.id)),
    ]);
  }

  const types = getProjectTypes(row);
  if (types.length > 0) {
    project.Type = types;
  }

  if (row.fecha_inicio) {
    project.StartDate = row.fecha_inicio instanceof Date
      ? row.fecha_inicio.toISOString().split('T')[0]
      : row.fecha_inicio;
  }

  if (row.fecha_fin) {
    project.EndDate = row.fecha_fin instanceof Date
      ? row.fecha_fin.toISOString().split('T')[0]
      : row.fecha_fin;
  }

  if (row.estado !== undefined && CONCYTEC_PROJECT_STATUS_MAP[row.estado]) {
    project.Status = CONCYTEC_PROJECT_STATUS_MAP[row.estado];
  }

  if (row.palabras_clave) {
    project.Keyword = row.palabras_clave
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean)
      .map(value => createTextValueEntry(value, 'es'));
  }

  if (abstract) {
    project.Abstract = filterEmpty([
      createTextValueEntry(String(abstract).trim(), 'es'),
    ]);
  }

  if (ocde?.codigo) {
    project.Subject = [{
      Scheme: VOCABULARIES.OCDE_FORD,
      Value: `${VOCABULARIES.OCDE_FORD}#${ocde.codigo}`,
    }];
  }

  if (row.linea_investigacion_id && row.linea_nombre) {
    project.ResearchLine = [
      {
        OrgUnit: {
          id: toInstitutionCerifId('OrgUnits', `LI${row.linea_investigacion_id}`),
          Name: filterEmpty([createTextValueEntry(row.linea_nombre, 'es')]),
        },
      },
    ];
  }

  if (team) {
    project.Team = team;
  }

  if (funded) {
    project.Funded = funded;
  }

  const geoLocationPlace = normalizeProjectGeoLocation(row.localizacion);
  if (geoLocationPlace) {
    project.geoLocation = [{
      geoLocationPlace: {
        Value: geoLocationPlace,
      },
    }];
  }

  if (equipments.length > 0) {
    project.Uses = equipments;
  }

  return project;
}

async function getProjectParticipants(projectId) {
  const [integrantes] = await pool.query(
    `
      SELECT
        pi.investigador_id,
        pi.condicion,
        pi.responsabilidad,
        ui.nombres,
        ui.apellido1,
        ui.apellido2,
        ui.codigo_orcid,
        f.id as facultad_id,
        f.nombre as facultad_nombre,
        pit.nombre as tipo_nombre
      FROM Proyecto_integrante pi
      LEFT JOIN Usuario_investigador ui ON pi.investigador_id = ui.id
      LEFT JOIN Facultad f ON ui.facultad_id = f.id
      LEFT JOIN Proyecto_integrante_tipo pit ON pi.proyecto_integrante_tipo_id = pit.id
      WHERE pi.proyecto_id = ?
        AND IFNULL(pi.estado, 1) = 1
      ORDER BY pi.id
    `,
    [projectId]
  );

  return integrantes;
}

function normalizeProjectGeoLocation(value) {
  const text = normalizeHumanText(value);
  if (!text) return null;

  const key = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (key.includes('otros lugares') || key.includes('otras regiones')) {
    return null;
  }
  if (key.includes('lima metropolitana')) {
    return 'Lima Metropolitana';
  }
  if (key.includes('callao')) {
    return 'Lima y Callao';
  }
  if (key.includes('lima')) {
    return 'Lima';
  }

  return text;
}

async function getProjectEquipments(groupId) {
  if (!groupId) return [];

  const [rows] = await pool.query(
    `
      SELECT gi.id, gi.codigo, gi.nombre
      FROM Grupo_infraestructura gi
      WHERE gi.grupo_id = ?
        AND LOWER(TRIM(gi.categoria)) = 'equipo'
        AND NOT (
          LOWER(CONCAT_WS(' ', gi.nombre, gi.descripcion, gi.ubicacion)) REGEXP ?
          AND LOWER(CONCAT_WS(' ', gi.nombre, gi.descripcion, gi.ubicacion)) NOT REGEXP ?
        )
      ORDER BY gi.id
      LIMIT 100
    `,
    [groupId, EQUIPMENT_EXCLUSION_REGEXP, EQUIPMENT_PRESERVE_REGEXP]
  );

  return rows.map(row => ({
    Equipment: {
      id: toEquipmentCerifId(row.id),
      ...(row.nombre
        ? { Name: filterEmpty([createTextValueEntry(normalizeDisplayText(row.nombre), 'es')]) }
        : {}),
      Identifier: {
        '@type': IDENTIFIER_SCHEMES.CRIS_ID,
        Value: formatProjectInternalId(row.id),
      },
    },
  }));
}

/**
 * Obtiene el conteo total de proyectos activos
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countProjects(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');
  let query = `
    SELECT COUNT(*) as total
    FROM Proyecto p
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count,
        MIN(TRIM(pp.entidad_financiadora)) AS external_funder_name
      FROM Publicacion_proyecto pp
      WHERE IFNULL(pp.estado, 1) = 1
        AND pp.proyecto_id IS NOT NULL
        AND pp.entidad_financiadora IS NOT NULL
        AND TRIM(pp.entidad_financiadora) <> ''
        AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
      GROUP BY pp.proyecto_id
    ) ef ON ef.proyecto_id = p.id
    WHERE p.estado >= 1
      AND ${STRICT_PROJECT_ELIGIBILITY}
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

/**
 * Obtiene proyectos con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getProjects({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT
      p.*,
      f.nombre as facultad_nombre,
      g.grupo_nombre,
      o.codigo as ocde_codigo,
      o.linea as ocde_linea,
      li.nombre as linea_nombre,
      pd.resumen as proyecto_descripcion,
      ef.external_funder_count,
      ef.external_funder_name,
      CASE
        WHEN LOWER(TRIM(COALESCE(p.tipo_proyecto, ''))) = 'pfex' OR ${EXTERNAL_FUNDING_TOTAL} > 0 THEN 1
        ELSE 0
      END AS is_external_project
    FROM Proyecto p
    LEFT JOIN Facultad f ON p.facultad_id = f.id
    LEFT JOIN Grupo g ON p.grupo_id = g.id
    LEFT JOIN Ocde o ON p.ocde_id = o.id
    LEFT JOIN Linea_investigacion li ON p.linea_investigacion_id = li.id
    LEFT JOIN (
      SELECT proyecto_id, MAX(CASE WHEN codigo = 'resumen' THEN detalle END) AS resumen
      FROM Proyecto_descripcion
      GROUP BY proyecto_id
    ) pd ON p.id = pd.proyecto_id
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count,
        MIN(TRIM(pp.entidad_financiadora)) AS external_funder_name
      FROM Publicacion_proyecto pp
      WHERE IFNULL(pp.estado, 1) = 1
        AND pp.proyecto_id IS NOT NULL
        AND pp.entidad_financiadora IS NOT NULL
        AND TRIM(pp.entidad_financiadora) <> ''
        AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
      GROUP BY pp.proyecto_id
    ) ef ON ef.proyecto_id = p.id
    WHERE p.estado >= 1
      AND ${STRICT_PROJECT_ELIGIBILITY}
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [projects] = await pool.query(query, [...dateFilter.params, limit, offset]);

  const results = [];
  for (const projectRow of projects) {
    const integrantes = await getProjectParticipants(projectRow.id);
    const equipments = await getProjectEquipments(projectRow.grupo_id);

    const ocde = projectRow.ocde_codigo
      ? { codigo: projectRow.ocde_codigo, linea: projectRow.ocde_linea }
      : null;

    results.push({
      header: {
        identifier: toProjectOAIIdentifier(projectRow.id),
        datestamp: toISO8601(projectRow.updated_at),
        setSpec: 'projects',
      },
      metadata: {
        Project: mapToCerif(projectRow, integrantes, ocde, projectRow.proyecto_descripcion, equipments),
      },
    });
  }

  return results;
}

/**
 * Obtiene solo headers de proyectos (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getProjectHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT p.id, p.updated_at
    FROM Proyecto p
    LEFT JOIN (
      SELECT
        pp.proyecto_id,
        COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count
      FROM Publicacion_proyecto pp
      WHERE IFNULL(pp.estado, 1) = 1
        AND pp.proyecto_id IS NOT NULL
        AND pp.entidad_financiadora IS NOT NULL
        AND TRIM(pp.entidad_financiadora) <> ''
        AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
      GROUP BY pp.proyecto_id
    ) ef ON ef.proyecto_id = p.id
    WHERE p.estado >= 1
      AND ${STRICT_PROJECT_ELIGIBILITY}
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toProjectOAIIdentifier(row.id),
    datestamp: toISO8601(row.updated_at),
    setSpec: 'projects',
  }));
}

/**
 * Obtiene un proyecto por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getProjectById(id) {
  const projectId = parseProjectInternalId(id);
  if (!projectId) {
    return null;
  }

  const [rows] = await pool.query(
    `
      SELECT
        p.*,
        f.nombre as facultad_nombre,
        g.grupo_nombre,
        o.codigo as ocde_codigo,
        o.linea as ocde_linea,
        li.nombre as linea_nombre,
        pd.resumen as proyecto_descripcion,
        ef.external_funder_count,
        ef.external_funder_name,
        CASE
          WHEN LOWER(TRIM(COALESCE(p.tipo_proyecto, ''))) = 'pfex' OR ${EXTERNAL_FUNDING_TOTAL} > 0 THEN 1
          ELSE 0
        END AS is_external_project
      FROM Proyecto p
      LEFT JOIN Facultad f ON p.facultad_id = f.id
      LEFT JOIN Grupo g ON p.grupo_id = g.id
      LEFT JOIN Ocde o ON p.ocde_id = o.id
      LEFT JOIN Linea_investigacion li ON p.linea_investigacion_id = li.id
      LEFT JOIN (
        SELECT proyecto_id, MAX(CASE WHEN codigo = 'resumen' THEN detalle END) AS resumen
        FROM Proyecto_descripcion
        GROUP BY proyecto_id
      ) pd ON p.id = pd.proyecto_id
      LEFT JOIN (
        SELECT
          pp.proyecto_id,
          COUNT(DISTINCT UPPER(TRIM(pp.entidad_financiadora))) AS external_funder_count,
          MIN(TRIM(pp.entidad_financiadora)) AS external_funder_name
        FROM Publicacion_proyecto pp
        WHERE IFNULL(pp.estado, 1) = 1
          AND pp.proyecto_id IS NOT NULL
          AND pp.entidad_financiadora IS NOT NULL
          AND TRIM(pp.entidad_financiadora) <> ''
          AND UPPER(TRIM(pp.entidad_financiadora)) <> 'UNMSM'
        GROUP BY pp.proyecto_id
      ) ef ON ef.proyecto_id = p.id
      WHERE p.id = ?
        AND p.estado >= 1
        AND ${STRICT_PROJECT_ELIGIBILITY}
    `,
    [projectId]
  );

  if (rows.length === 0) {
    return null;
  }

  const projectRow = rows[0];
  const integrantes = await getProjectParticipants(projectRow.id);
  const equipments = await getProjectEquipments(projectRow.grupo_id);

  const ocde = projectRow.ocde_codigo
    ? { codigo: projectRow.ocde_codigo, linea: projectRow.ocde_linea }
    : null;

  return {
    header: {
      identifier: toProjectOAIIdentifier(projectRow.id),
      datestamp: toISO8601(projectRow.updated_at),
      setSpec: 'projects',
    },
    metadata: {
      Project: mapToCerif(projectRow, integrantes, ocde, projectRow.proyecto_descripcion, equipments),
    },
  };
}
