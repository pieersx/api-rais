import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  createTitle,
  buildDateFilter,
  inferIPCClassification,
} from '../utils/formatters.js';
import {
  PATENT_TYPE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Patents';

function normalizeOrcid(orcid) {
  if (!orcid) return null;
  const value = String(orcid).trim();
  if (!value) return null;
  return value.startsWith('http') ? value : `https://orcid.org/${value}`;
}

function buildPatentHeader(row) {
  const header = {
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    setSpec: 'patents',
  };

  const datestamp = toISO8601(row.updated_at);
  if (datestamp) {
    header.datestamp = datestamp;
  }

  return header;
}

function mapToCerif(row, inventors = [], holders = []) {
  const typeUri = PATENT_TYPE_MAP[row.tipo] || PATENT_TYPE_MAP.default;
  const ipcClassification = inferIPCClassification(row);
  const lastModified = toISO8601(row.updated_at);
  const title = filterEmpty([createTitle(row.titulo, 'es')]);
  const patentNumber = String(row.nro_registro || '').trim();

  const patent = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    type: typeUri,
    subjects: [
      {
        scheme: ipcClassification.scheme,
        value: ipcClassification.value,
      },
    ],
    countryCode: 'PE',
  };

  if (patentNumber) {
    patent.patentNumber = patentNumber;
  }

  if (title.length > 0) {
    patent.title = title;
  }

  if (lastModified) {
    patent.lastModified = lastModified;
  }

  if (ipcClassification.note) {
    patent.notes = [ipcClassification.note];
  }

  if (inventors.length > 0) {
    patent.inventors = inventors.map(inventor => {
      const fullName = [inventor.nombres, inventor.apellido1, inventor.apellido2]
        .filter(Boolean)
        .join(' ')
        .trim();

      const person = {
        name: fullName,
      };

      if (inventor.investigador_id) {
        person.id = toCerifId('Persons', inventor.investigador_id);
      }

      const identifiers = [];
      if (inventor.doc_numero) {
        identifiers.push({
          scheme: 'http://purl.org/pe-repo/concytec/terminos#dni',
          value: String(inventor.doc_numero),
        });
      }
      if (inventor.codigo_orcid) {
        identifiers.push({
          scheme: 'https://orcid.org',
          value: normalizeOrcid(inventor.codigo_orcid),
        });
      }

      if (identifiers.length > 0) {
        person.identifiers = identifiers;
      }

      return { person };
    });
  }

  const holderItems = [];
  holderItems.push(...holders.map(holder => ({ orgUnit: { name: holder.titular } })));

  if (row.titular1) holderItems.push({ orgUnit: { name: row.titular1 } });
  if (row.titular2) holderItems.push({ orgUnit: { name: row.titular2 } });

  if (holderItems.length > 0) {
    patent.holders = holderItems;
  }

  patent.issuer = {
    orgUnit: {
      acronym: 'INDECOPI',
      name: 'Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual',
    },
  };

  if (row.fecha_presentacion) {
    patent.registrationDate = row.fecha_presentacion instanceof Date
      ? row.fecha_presentacion.toISOString().split('T')[0]
      : row.fecha_presentacion;
  }

  if (row.comentario) {
    patent.abstract = [{ lang: 'es', value: row.comentario }];
  }

  if (row.enlace) {
    patent.url = row.enlace;
  }

  if (row.nro_expediente) {
    patent.identifiers = [
      {
        type: 'Expediente',
        value: row.nro_expediente,
      },
    ];
  }

  return patent;
}

async function getPatentContext(patentId) {
  const [inventors] = await pool.query(
    `
      SELECT
        pa.*,
        ui.nombres as ui_nombres,
        ui.apellido1 as ui_apellido1,
        ui.apellido2 as ui_apellido2,
        ui.doc_numero,
        ui.codigo_orcid
      FROM Patente_autor pa
      LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
      WHERE pa.patente_id = ?
      ORDER BY pa.id
    `,
    [patentId]
  );

  const [holders] = await pool.query(
    `
      SELECT titular
      FROM Patente_entidad
      WHERE patente_id = ?
      ORDER BY id
    `,
    [patentId]
  );

  const mappedInventors = inventors.map(inventor => ({
    ...inventor,
    nombres: inventor.nombres || inventor.ui_nombres,
    apellido1: inventor.apellido1 || inventor.ui_apellido1,
    apellido2: inventor.apellido2 || inventor.ui_apellido2,
  }));

  return {
    inventors: mappedInventors,
    holders,
  };
}

/**
 * Obtiene el conteo total de patentes activas
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countPatents(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = 'SELECT COUNT(*) as total FROM Patente p WHERE p.estado = 1';

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
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT p.*
    FROM Patente p
    WHERE p.estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  const results = [];
  for (const row of rows) {
    const context = await getPatentContext(row.id);

    results.push({
      header: buildPatentHeader(row),
      metadata: {
        Patent: mapToCerif(row, context.inventors, context.holders),
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
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT p.id, p.updated_at
    FROM Patente p
    WHERE p.estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => buildPatentHeader(row));
}

/**
 * Obtiene una patente por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getPatentById(id) {
  const [rows] = await pool.query(
    `
      SELECT p.*
      FROM Patente p
      WHERE p.id = ?
        AND p.estado = 1
    `,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const context = await getPatentContext(row.id);

  return {
    header: buildPatentHeader(row),
    metadata: {
      Patent: mapToCerif(row, context.inventors, context.holders),
    },
  };
}
