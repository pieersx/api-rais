import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  createTitle,
  createIdentifier,
  buildDateFilter,
} from '../utils/formatters.js';
import {
  IDENTIFIER_SCHEMES,
  PROJECT_STATUS,
  PROJECT_TYPE_OCDE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Projects';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';
const OCDE_PROJECT_TYPE_SCHEME = 'https://purl.org/pe-repo/ocde/tipoProyecto';
const CTI_PROJECT_TYPE_SCHEME = 'https://purl.org/pe-repo/concytec/terminos';

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProjectTypes(row) {
  const types = [];
  const projectType = String(row.tipo_proyecto || '').trim();

  if (!projectType) {
    return types;
  }

  const ocdeType = PROJECT_TYPE_OCDE_MAP[projectType];
  if (ocdeType) {
    types.push({
      scheme: OCDE_PROJECT_TYPE_SCHEME,
      value: ocdeType,
    });
  }

  const ctiSlug = toSlug(projectType);
  if (ctiSlug) {
    types.push({
      scheme: CTI_PROJECT_TYPE_SCHEME,
      value: `${CTI_PROJECT_TYPE_SCHEME}#${ctiSlug}`,
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
  const rawRole = String(integrante.tipo_nombre || integrante.condicion || '').trim();
  if (rawRole) return rawRole;
  return 'Participante';
}

function buildParticipants(row, integrantes) {
  const participants = [];

  for (const integrante of integrantes) {
    const fullName = [integrante.nombres, integrante.apellido1, integrante.apellido2]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!integrante.investigador_id && !fullName) continue;

    const participant = {
      role: buildParticipantRole(integrante),
    };

    if (integrante.investigador_id) {
      participant.person = {
        id: toCerifId('Persons', integrante.investigador_id),
        name: fullName || `Investigador ${integrante.investigador_id}`,
      };
    } else if (fullName) {
      participant.person = {
        name: fullName,
      };
    }

    participants.push(participant);
  }

  if (row.facultad_id && row.facultad_nombre) {
    participants.push({
      orgUnit: {
        id: toCerifId('OrgUnits', `F${row.facultad_id}`),
        name: row.facultad_nombre,
      },
      role: 'Institución ejecutora',
    });
  }

  if (row.grupo_id && row.grupo_nombre) {
    participants.push({
      orgUnit: {
        id: toCerifId('OrgUnits', `G${row.grupo_id}`),
        name: row.grupo_nombre,
      },
      role: 'Grupo de investigación',
    });
  }

  return participants;
}

function mapToCerif(row, integrantes = [], ocde = null, abstract = null, outputs = null, equipments = []) {
  const titleValue = row.titulo || row.codigo_proyecto || `Proyecto ${row.id}`;

  const project = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    title: filterEmpty([createTitle(titleValue, 'es')]),
    lastModified: toISO8601(row.updated_at) || FALLBACK_DATE,
  };

  if (row.codigo_proyecto) {
    project.identifiers = filterEmpty([
      createIdentifier(IDENTIFIER_SCHEMES.PROJECT_REFERENCE, row.codigo_proyecto),
    ]);
  }

  const types = getProjectTypes(row);
  if (types.length > 0) {
    project.type = types;
  }

  if (row.fecha_inicio) {
    project.startDate = row.fecha_inicio instanceof Date
      ? row.fecha_inicio.toISOString().split('T')[0]
      : row.fecha_inicio;
  }

  if (row.fecha_fin) {
    project.endDate = row.fecha_fin instanceof Date
      ? row.fecha_fin.toISOString().split('T')[0]
      : row.fecha_fin;
  }

  if (row.estado !== undefined && PROJECT_STATUS[row.estado]) {
    project.status = PROJECT_STATUS[row.estado];
  }

  if (row.palabras_clave) {
    project.keywords = row.palabras_clave
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean)
      .map(value => ({ lang: 'es', value }));
  }

  if (abstract) {
    project.abstract = [{
      lang: 'es',
      value: String(abstract).trim(),
    }];
  }

  if (ocde?.codigo) {
    project.subjects = [{
      scheme: VOCABULARIES.OCDE_FORD,
      value: `${VOCABULARIES.OCDE_FORD}#${ocde.codigo}`,
    }];
  }

  if (row.linea_nombre) {
    project.researchLine = [row.linea_nombre];
  }

  const participants = buildParticipants(row, integrantes);
  if (participants.length > 0) {
    project.participants = participants;
  }

  if (hasFundingData(row)) {
    project.fundings = [{
      id: toCerifId('Fundings', `P${row.id}`),
    }];
  }

  if (outputs) {
    project.outputs = {
      publications: outputs.publications || [],
      patents: outputs.patents || [],
      products: outputs.products || [],
    };
  }

  if (row.localizacion) {
    project.geoLocations = [{
      geoLocationPlace: row.localizacion,
    }];
  }

  if (equipments.length > 0) {
    project.uses = equipments;
  }

  return project;
}

async function getProjectParticipants(projectId) {
  const [integrantes] = await pool.query(
    `
      SELECT
        pi.investigador_id,
        pi.condicion,
        ui.nombres,
        ui.apellido1,
        ui.apellido2,
        pit.nombre as tipo_nombre
      FROM Proyecto_integrante pi
      LEFT JOIN Usuario_investigador ui ON pi.investigador_id = ui.id
      LEFT JOIN Proyecto_integrante_tipo pit ON pi.proyecto_integrante_tipo_id = pit.id
      WHERE pi.proyecto_id = ?
        AND IFNULL(pi.estado, 1) = 1
      ORDER BY pi.id
    `,
    [projectId]
  );

  return integrantes;
}

async function getProjectOutputs(projectId) {
  const [publications] = await pool.query(
    `
      SELECT DISTINCT pp.publicacion_id
      FROM Publicacion_proyecto pp
      WHERE pp.proyecto_id = ?
        AND pp.publicacion_id IS NOT NULL
        AND IFNULL(pp.estado, 1) = 1
      ORDER BY pp.publicacion_id
    `,
    [projectId]
  );

  return {
    publications: publications.map(row => toCerifId('Publications', row.publicacion_id)),
    patents: [],
    products: [],
  };
}

async function getProjectEquipments(groupId) {
  if (!groupId) return [];

  const [rows] = await pool.query(
    `
      SELECT gi.id
      FROM Grupo_infraestructura gi
      WHERE gi.grupo_id = ?
      ORDER BY gi.id
      LIMIT 100
    `,
    [groupId]
  );

  return rows.map(row => toCerifId('Equipments', row.id));
}

/**
 * Obtiene el conteo total de proyectos activos
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countProjects(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');
  let query = 'SELECT COUNT(*) as total FROM Proyecto p WHERE p.estado >= 1';

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
      pd.detalle as proyecto_descripcion
    FROM Proyecto p
    LEFT JOIN Facultad f ON p.facultad_id = f.id
    LEFT JOIN Grupo g ON p.grupo_id = g.id
    LEFT JOIN Ocde o ON p.ocde_id = o.id
    LEFT JOIN Linea_investigacion li ON p.linea_investigacion_id = li.id
    LEFT JOIN Proyecto_descripcion pd ON p.id = pd.proyecto_id
    WHERE p.estado >= 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [projects] = await pool.query(query, [...dateFilter.params, limit, offset]);

  const results = [];
  for (const projectRow of projects) {
    const integrantes = await getProjectParticipants(projectRow.id);
    const outputs = await getProjectOutputs(projectRow.id);
    const equipments = await getProjectEquipments(projectRow.grupo_id);

    const ocde = projectRow.ocde_codigo
      ? { codigo: projectRow.ocde_codigo, linea: projectRow.ocde_linea }
      : null;

    results.push({
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, projectRow.id),
        datestamp: toISO8601(projectRow.updated_at) || FALLBACK_DATE,
        setSpec: 'projects',
      },
      metadata: {
        Project: mapToCerif(projectRow, integrantes, ocde, projectRow.proyecto_descripcion, outputs, equipments),
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
    WHERE p.estado >= 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
    setSpec: 'projects',
  }));
}

/**
 * Obtiene un proyecto por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getProjectById(id) {
  const [rows] = await pool.query(
    `
      SELECT
        p.*,
        f.nombre as facultad_nombre,
        g.grupo_nombre,
        o.codigo as ocde_codigo,
        o.linea as ocde_linea,
        li.nombre as linea_nombre,
        pd.detalle as proyecto_descripcion
      FROM Proyecto p
      LEFT JOIN Facultad f ON p.facultad_id = f.id
      LEFT JOIN Grupo g ON p.grupo_id = g.id
      LEFT JOIN Ocde o ON p.ocde_id = o.id
      LEFT JOIN Linea_investigacion li ON p.linea_investigacion_id = li.id
      LEFT JOIN Proyecto_descripcion pd ON p.id = pd.proyecto_id
      WHERE p.id = ?
        AND p.estado >= 1
    `,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const projectRow = rows[0];
  const integrantes = await getProjectParticipants(projectRow.id);
  const outputs = await getProjectOutputs(projectRow.id);
  const equipments = await getProjectEquipments(projectRow.grupo_id);

  const ocde = projectRow.ocde_codigo
    ? { codigo: projectRow.ocde_codigo, linea: projectRow.ocde_linea }
    : null;

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, projectRow.id),
      datestamp: toISO8601(projectRow.updated_at) || FALLBACK_DATE,
      setSpec: 'projects',
    },
    metadata: {
      Project: mapToCerif(projectRow, integrantes, ocde, projectRow.proyecto_descripcion, outputs, equipments),
    },
  };
}
