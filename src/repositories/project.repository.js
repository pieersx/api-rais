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
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Projects';

/**
 * Mapea un proyecto a formato CERIF Project
 * @param {object} row
 * @param {Array} integrantes
 * @param {object} ocde - Campo OCDE
 * @returns {object}
 */
function mapToCerif(row, integrantes = [], ocde = null) {
  const project = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    title: filterEmpty([createTitle(row.titulo, 'es')]),
  };

  // Identificador del proyecto (codigo)
  if (row.codigo_proyecto) {
    project.identifiers = [
      createIdentifier(IDENTIFIER_SCHEMES.PROJECT_REFERENCE, row.codigo_proyecto),
    ];
  }

  // Acronimo
  if (row.tipo_proyecto) {
    project.acronym = row.tipo_proyecto;
  }

  // Fechas
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

  // Estado
  if (row.estado !== undefined && PROJECT_STATUS[row.estado]) {
    project.status = PROJECT_STATUS[row.estado];
  }

  // Palabras clave
  if (row.palabras_clave) {
    project.keywords = row.palabras_clave.split(',').map(k => ({
      lang: 'es',
      value: k.trim(),
    })).filter(k => k.value);
  }

  // Campo OCDE
  if (ocde) {
    project.subjects = [{
      scheme: VOCABULARIES.OCDE_FORD,
      value: `${VOCABULARIES.OCDE_FORD}#${ocde.codigo}`,
      name: ocde.linea,
    }];
  }

  // Monto asignado (como funding info)
  if (row.monto_asignado) {
    project.funding = {
      amount: {
        value: parseFloat(row.monto_asignado),
        currency: 'PEN',
      },
    };
  }

  // Equipo del proyecto (integrantes)
  if (integrantes.length > 0) {
    const team = [];
    const consortium = [];

    for (const int of integrantes) {
      const participant = {};

      if (int.investigador_id) {
        participant.person = {
          id: toCerifId('Persons', int.investigador_id),
          name: int.nombres ? `${int.nombres} ${int.apellido1 || ''} ${int.apellido2 || ''}`.trim() : null,
        };
      }

      // Rol
      const tipoNormalizado = (int.tipo_nombre || int.condicion || '').toLowerCase();
      if (tipoNormalizado.includes('responsable') || tipoNormalizado.includes('principal')) {
        participant.role = 'PrincipalInvestigator';
        team.push(participant);
      } else if (tipoNormalizado.includes('coordinador')) {
        participant.role = 'Coordinator';
        consortium.push(participant);
      } else if (tipoNormalizado.includes('tesista')) {
        participant.role = 'Student';
        team.push(participant);
      } else {
        participant.role = 'Member';
        team.push(participant);
      }
    }

    if (team.length > 0) {
      project.team = team;
    }

    if (consortium.length > 0) {
      project.consortium = consortium;
    }
  }

  // Grupo de investigacion
  if (row.grupo_id && row.grupo_nombre) {
    if (!project.consortium) project.consortium = [];
    project.consortium.push({
      orgUnit: {
        id: toCerifId('OrgUnits', `G${row.grupo_id}`),
        name: row.grupo_nombre,
      },
      role: 'Member',
    });
  }

  // Facultad
  if (row.facultad_id && row.facultad_nombre) {
    if (!project.consortium) project.consortium = [];
    project.consortium.push({
      orgUnit: {
        id: toCerifId('OrgUnits', `F${row.facultad_id}`),
        name: row.facultad_nombre,
      },
      role: 'Contractor',
    });
  }

  // Localizacion
  if (row.localizacion) {
    project.geoLocations = [{
      geoLocationPlace: row.localizacion,
    }];
  }

  return project;
}

/**
 * Obtiene el conteo total de proyectos activos
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countProjects(from, until) {
  const dateFilter = buildDateFilter(from, until);
  let query = 'SELECT COUNT(*) as total FROM Proyecto WHERE estado >= 1';

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
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT 
      p.*,
      f.nombre as facultad_nombre,
      g.grupo_nombre,
      o.codigo as ocde_codigo,
      o.linea as ocde_linea
    FROM Proyecto p
    LEFT JOIN Facultad f ON p.facultad_id = f.id
    LEFT JOIN Grupo g ON p.grupo_id = g.id
    LEFT JOIN Ocde o ON p.ocde_id = o.id
    WHERE p.estado >= 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY p.id LIMIT ? OFFSET ?`;

  const [projects] = await pool.query(query, [...dateFilter.params, limit, offset]);

  const results = [];
  for (const proj of projects) {
    // Obtener integrantes
    const [integrantes] = await pool.query(`
      SELECT 
        pi.*,
        ui.nombres,
        ui.apellido1,
        ui.apellido2,
        pit.nombre as tipo_nombre
      FROM Proyecto_integrante pi
      LEFT JOIN Usuario_investigador ui ON pi.investigador_id = ui.id
      LEFT JOIN Proyecto_integrante_tipo pit ON pi.proyecto_integrante_tipo_id = pit.id
      WHERE pi.proyecto_id = ? AND pi.estado = 1
    `, [proj.id]);

    const ocde = proj.ocde_codigo ? { codigo: proj.ocde_codigo, linea: proj.ocde_linea } : null;

    results.push({
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, proj.id),
        datestamp: toISO8601(proj.updated_at),
        setSpec: 'projects',
      },
      metadata: {
        Project: mapToCerif(proj, integrantes, ocde),
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
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT id, updated_at
    FROM Proyecto
    WHERE estado >= 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
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
  const [rows] = await pool.query(`
    SELECT 
      p.*,
      f.nombre as facultad_nombre,
      g.grupo_nombre,
      o.codigo as ocde_codigo,
      o.linea as ocde_linea
    FROM Proyecto p
    LEFT JOIN Facultad f ON p.facultad_id = f.id
    LEFT JOIN Grupo g ON p.grupo_id = g.id
    LEFT JOIN Ocde o ON p.ocde_id = o.id
    WHERE p.id = ? AND p.estado >= 1
  `, [id]);

  if (rows.length === 0) {
    return null;
  }

  const proj = rows[0];

  // Obtener integrantes
  const [integrantes] = await pool.query(`
    SELECT 
      pi.*,
      ui.nombres,
      ui.apellido1,
      ui.apellido2,
      pit.nombre as tipo_nombre
    FROM Proyecto_integrante pi
    LEFT JOIN Usuario_investigador ui ON pi.investigador_id = ui.id
    LEFT JOIN Proyecto_integrante_tipo pit ON pi.proyecto_integrante_tipo_id = pit.id
    WHERE pi.proyecto_id = ? AND pi.estado = 1
  `, [id]);

  const ocde = proj.ocde_codigo ? { codigo: proj.ocde_codigo, linea: proj.ocde_linea } : null;

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, proj.id),
      datestamp: toISO8601(proj.updated_at),
      setSpec: 'projects',
    },
    metadata: {
      Project: mapToCerif(proj, integrantes, ocde),
    },
  };
}
