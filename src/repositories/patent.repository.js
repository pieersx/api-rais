import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  createTitle,
  buildDateFilter,
} from '../utils/formatters.js';
import {
  PATENT_TYPE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Patents';

/**
 * Mapea una patente a formato CERIF Patent
 * @param {object} row
 * @param {Array} inventors
 * @returns {object}
 */
function mapToCerif(row, inventors = []) {
  const typeUri = PATENT_TYPE_MAP[row.tipo] || PATENT_TYPE_MAP.default;

  const patent = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    type: typeUri,
    patentNumber: row.nro_registro,
    title: filterEmpty([createTitle(row.titulo)]),
  };

  // Inventores
  if (inventors.length > 0) {
    patent.inventors = inventors.map(inv => {
      const inventor = {
        person: {
          personName: {
            fullName: `${inv.nombres || ''} ${inv.apellido1 || ''} ${inv.apellido2 || ''}`.trim(),
            familyNames: `${inv.apellido1 || ''} ${inv.apellido2 || ''}`.trim(),
            firstNames: inv.nombres || '',
          },
        },
      };

      if (inv.investigador_id) {
        inventor.person.id = toCerifId('Persons', inv.investigador_id);
      }

      return inventor;
    });
  }

  // Titulares
  const holders = filterEmpty([row.titular1, row.titular2]);
  if (holders.length > 0) {
    patent.holders = holders.map(h => ({
      name: h,
    }));
  }

  // Fecha de presentacion
  if (row.fecha_presentacion) {
    patent.registrationDate = row.fecha_presentacion instanceof Date
      ? row.fecha_presentacion.toISOString().split('T')[0]
      : row.fecha_presentacion;
  }

  // Oficina de presentacion (issuer)
  if (row.oficina_presentacion) {
    patent.issuer = {
      name: row.oficina_presentacion,
    };
  }

  // Enlace
  if (row.enlace) {
    patent.url = row.enlace;
  }

  // Numero de expediente como identificador adicional
  if (row.nro_expediente) {
    patent.expedientNumber = row.nro_expediente;
  }

  // Pais (Peru por defecto para INDECOPI)
  patent.countryCode = 'PE';

  // Idioma
  patent.language = ['es'];

  return patent;
}

/**
 * Obtiene el conteo total de patentes activas
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countPatents(from, until) {
  const dateFilter = buildDateFilter(from, until);
  let query = 'SELECT COUNT(*) as total FROM Patente WHERE estado = 1';

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

/**
 * Obtiene patentes con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPatents({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT * FROM Patente 
    WHERE estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const [patents] = await pool.query(query, [...dateFilter.params, limit, offset]);

  const results = [];
  for (const pat of patents) {
    // Obtener inventores/autores
    const [inventors] = await pool.query(`
      SELECT pa.*, ui.nombres as ui_nombres, ui.apellido1 as ui_apellido1, ui.apellido2 as ui_apellido2
      FROM Patente_autor pa
      LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
      WHERE pa.patente_id = ?
    `, [pat.id]);

    // Usar nombres de la tabla de union o del investigador
    const mappedInventors = inventors.map(inv => ({
      ...inv,
      nombres: inv.nombres || inv.ui_nombres,
      apellido1: inv.apellido1 || inv.ui_apellido1,
      apellido2: inv.apellido2 || inv.ui_apellido2,
    }));

    results.push({
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, pat.id),
        datestamp: toISO8601(pat.updated_at),
        setSpec: 'patents',
      },
      metadata: {
        Patent: mapToCerif(pat, mappedInventors),
      },
    });
  }

  return results;
}

/**
 * Obtiene solo headers de patentes (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPatentHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT id, updated_at
    FROM Patente
    WHERE estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    datestamp: toISO8601(row.updated_at),
    setSpec: 'patents',
  }));
}

/**
 * Obtiene una patente por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getPatentById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM Patente WHERE id = ? AND estado = 1',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const pat = rows[0];

  // Obtener inventores
  const [inventors] = await pool.query(`
    SELECT pa.*, ui.nombres as ui_nombres, ui.apellido1 as ui_apellido1, ui.apellido2 as ui_apellido2
    FROM Patente_autor pa
    LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
    WHERE pa.patente_id = ?
  `, [id]);

  const mappedInventors = inventors.map(inv => ({
    ...inv,
    nombres: inv.nombres || inv.ui_nombres,
    apellido1: inv.apellido1 || inv.ui_apellido1,
    apellido2: inv.apellido2 || inv.ui_apellido2,
  }));

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, pat.id),
      datestamp: toISO8601(pat.updated_at),
      setSpec: 'patents',
    },
    metadata: {
      Patent: mapToCerif(pat, mappedInventors),
    },
  };
}
