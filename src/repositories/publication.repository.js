import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  createTitle,
  createTypedIdentifier,
  buildDateFilter,
} from '../utils/formatters.js';
import {
  PUBLICATION_TYPE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Publications';

/**
 * Mapea una publicacion a formato CERIF Publication
 * @param {object} row
 * @param {Array} authors
 * @returns {object}
 */
function mapToCerif(row, authors = []) {
  const typeUri = PUBLICATION_TYPE_MAP[row.tipo_publicacion] || PUBLICATION_TYPE_MAP.default;

  const publication = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Type: {
      '@xmlns': VOCABULARIES.COAR_PUBLICATION_TYPES,
      '#text': typeUri,
    },
    title: filterEmpty([createTitle(row.titulo)]),
  };

  // Identificadores
  const identifiers = filterEmpty([
    createTypedIdentifier('DOI', row.doi),
    createTypedIdentifier('ISBN', row.isbn),
    createTypedIdentifier('ISSN', row.issn),
    createTypedIdentifier('ISSN-E', row.issn_e),
    createTypedIdentifier('Handle', row.uri),
    createTypedIdentifier('URL', row.url),
  ]);

  if (identifiers.length > 0) {
    publication.identifiers = identifiers;
  }

  // Autores
  if (authors.length > 0) {
    publication.authors = authors.map((a, idx) => {
      const author = {
        order: a.orden || idx + 1,
      };

      if (a.investigador_id) {
        author.person = {
          id: toCerifId('Persons', a.investigador_id),
          personName: {
            fullName: a.autor || `${a.nombres || ''} ${a.apellido1 || ''} ${a.apellido2 || ''}`.trim(),
            familyNames: `${a.apellido1 || ''} ${a.apellido2 || ''}`.trim(),
            firstNames: a.nombres || '',
          },
        };

        const personIdentifiers = [];
        if (a.doc_numero) {
          personIdentifiers.push({ scheme: 'http://purl.org/pe-repo/concytec/terminos#dni', value: a.doc_numero });
        }
        if (a.codigo_orcid) {
          personIdentifiers.push({ scheme: 'https://orcid.org', value: `https://orcid.org/${a.codigo_orcid}` });
        }
        if (personIdentifiers.length > 0) {
          author.person.identifiers = personIdentifiers;
        }
      } else {
        // Autor externo
        author.person = {
          personName: {
            fullName: a.autor || `${a.nombres || ''} ${a.apellido1 || ''} ${a.apellido2 || ''}`.trim(),
          },
        };
      }

      return author;
    });
  }

  // Fecha de publicacion
  if (row.fecha_publicacion) {
    publication.publicationDate = row.fecha_publicacion instanceof Date
      ? row.fecha_publicacion.toISOString().split('T')[0]
      : row.fecha_publicacion;
  }

  // Nombre de publicacion/revista
  if (row.publicacion_nombre) {
    publication.publishedIn = { name: row.publicacion_nombre };
  }

  // Editorial
  if (row.editorial) {
    publication.publishers = [{ name: row.editorial }];
  }

  // Volumen, edicion, paginas
  if (row.volumen) publication.volume = row.volumen;
  if (row.edicion) publication.edition = row.edicion;
  if (row.pagina_inicial) publication.startPage = row.pagina_inicial;
  if (row.pagina_final) publication.endPage = row.pagina_final;

  // Idioma
  if (row.idioma) {
    publication.language = [row.idioma];
  }

  // Resumen
  if (row.resumen) {
    const resumenText = row.resumen instanceof Buffer
      ? row.resumen.toString('utf-8')
      : row.resumen;
    if (resumenText && resumenText.trim()) {
      publication.abstract = [{ value: resumenText.trim() }];
    }
  }

  // Pais
  if (row.pais_codigo) {
    publication.countryCode = row.pais_codigo;
  }

  return publication;
}

/**
 * Obtiene el conteo total de publicaciones activas
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countPublications(from, until) {
  const dateFilter = buildDateFilter(from, until);
  let query = 'SELECT COUNT(*) as total FROM Publicacion WHERE estado = 1';

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  const [rows] = await pool.query(query, dateFilter.params);
  return rows[0].total;
}

/**
 * Obtiene publicaciones con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPublications({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT * FROM Publicacion 
    WHERE estado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ` ORDER BY id LIMIT ? OFFSET ?`;

  const [publications] = await pool.query(query, [...dateFilter.params, limit, offset]);

  // Obtener autores para cada publicacion
  const results = [];
  for (const pub of publications) {
    const [authors] = await pool.query(`
      SELECT pa.*, ui.codigo_orcid
      FROM Publicacion_autor pa
      LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
      WHERE pa.publicacion_id = ?
      ORDER BY pa.orden ASC
    `, [pub.id]);

    results.push({
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, pub.id),
        datestamp: toISO8601(pub.updated_at),
        setSpec: 'publications',
      },
      metadata: {
        Publication: mapToCerif(pub, authors),
      },
    });
  }

  return results;
}

/**
 * Obtiene solo headers de publicaciones (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPublicationHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const dateFilter = buildDateFilter(from, until);

  let query = `
    SELECT id, updated_at
    FROM Publicacion
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
    setSpec: 'publications',
  }));
}

/**
 * Obtiene una publicacion por ID
 * @param {string|number} id
 * @returns {Promise<object|null>}
 */
export async function getPublicationById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM Publicacion WHERE id = ? AND estado = 1',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const pub = rows[0];

  // Obtener autores
  const [authors] = await pool.query(`
    SELECT pa.*, ui.codigo_orcid
    FROM Publicacion_autor pa
    LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
    WHERE pa.publicacion_id = ?
    ORDER BY pa.orden ASC
  `, [id]);

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, pub.id),
      datestamp: toISO8601(pub.updated_at),
      setSpec: 'publications',
    },
    metadata: {
      Publication: mapToCerif(pub, authors),
    },
  };
}
