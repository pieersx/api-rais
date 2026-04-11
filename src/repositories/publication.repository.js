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
  inferAccessRights,
} from '../utils/formatters.js';
import {
  PUBLICATION_TYPE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Publications';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';

function normalizeOrcid(orcid) {
  if (!orcid) return null;
  const value = String(orcid).trim();
  if (!value) return null;
  return value.startsWith('http') ? value : `https://orcid.org/${value}`;
}

function mapToCerif(row, { authors = [], keywords = [], projectIds = [], ocdeCodes = [] } = {}) {
  const typeUri = PUBLICATION_TYPE_MAP[row.tipo_publicacion] || PUBLICATION_TYPE_MAP.default;
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;
  const titleValue = row.titulo || row.publicacion_nombre || `Publicación ${row.id}`;

  const publication = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    type: {
      scheme: VOCABULARIES.COAR_PUBLICATION_TYPES,
      value: typeUri,
    },
    title: filterEmpty([createTitle(titleValue, 'es')]),
    access: inferAccessRights(row).uri,
    lastModified,
  };

  const identifiers = filterEmpty([
    createTypedIdentifier('DOI', row.doi),
    createTypedIdentifier('ISBN', row.isbn),
    createTypedIdentifier('ISSN', row.issn),
    createTypedIdentifier('ISSN', row.issn_e),
    createTypedIdentifier('Handle', row.uri),
    createTypedIdentifier('URL', row.url),
  ]);

  if (identifiers.length > 0) {
    publication.identifiers = identifiers;
  }

  if (authors.length > 0) {
    publication.authors = authors.map((author, index) => {
      const fullName = author.autor || [author.nombres, author.apellido1, author.apellido2]
        .filter(Boolean)
        .join(' ')
        .trim();

      const person = {
        personName: {
          fullName,
          familyNames: [author.apellido1, author.apellido2].filter(Boolean).join(' ').trim(),
          firstNames: author.nombres || '',
        },
      };

      if (author.investigador_id) {
        person.id = toCerifId('Persons', author.investigador_id);
      }

      const personIdentifiers = [];
      if (author.doc_numero) {
        personIdentifiers.push({
          scheme: 'http://purl.org/pe-repo/concytec/terminos#dni',
          value: String(author.doc_numero),
        });
      }

      if (author.codigo_orcid) {
        personIdentifiers.push({
          scheme: 'https://orcid.org',
          value: normalizeOrcid(author.codigo_orcid),
        });
      }

      if (personIdentifiers.length > 0) {
        person.identifiers = personIdentifiers;
      }

      const authorEntry = {
        person,
        order: Number(author.orden || index + 1),
      };

      if (author.facultad_id && author.facultad_nombre) {
        authorEntry.affiliations = [
          {
            orgUnit: {
              id: toCerifId('OrgUnits', `F${author.facultad_id}`),
              name: author.facultad_nombre,
            },
          },
        ];
      }

      return authorEntry;
    });
  }

  if (row.publicacion_nombre) {
    publication.publishedIn = {
      publication: {
        id: toCerifId('Publications', `SRC-${row.id}`),
        title: [{ value: row.publicacion_nombre }],
      },
    };
  }

  if (row.editorial) {
    publication.publishers = [
      {
        orgUnit: {
          name: [{ value: row.editorial }],
        },
      },
    ];
  }

  if (row.fecha_publicacion) {
    publication.publicationDate = row.fecha_publicacion instanceof Date
      ? row.fecha_publicacion.toISOString().split('T')[0]
      : row.fecha_publicacion;
  }

  if (row.volumen) publication.volume = String(row.volumen);
  if (row.edicion) publication.edition = String(row.edicion);
  if (row.pagina_inicial) publication.startPage = String(row.pagina_inicial);
  if (row.pagina_final) publication.endPage = String(row.pagina_final);

  if (row.idioma) {
    publication.language = [String(row.idioma).toLowerCase()];
  }

  if (row.resumen) {
    const text = row.resumen instanceof Buffer ? row.resumen.toString('utf-8') : String(row.resumen);
    if (text.trim()) {
      publication.abstract = [{ lang: 'es', value: text.trim() }];
    }
  }

  if (keywords.length > 0) {
    publication.keywords = keywords
      .map(keyword => String(keyword.palabra_clave || '').trim())
      .filter(Boolean)
      .map(value => ({ lang: 'es', value }));
  }

  if (ocdeCodes.length > 0) {
    publication.subjects = ocdeCodes
      .filter(Boolean)
      .map(code => ({
        scheme: VOCABULARIES.OCDE_FORD,
        value: `${VOCABULARIES.OCDE_FORD}#${code}`,
      }));
  }

  if (projectIds.length > 0) {
    publication.originatesFrom = [];

    for (const projectId of projectIds) {
      publication.originatesFrom.push({
        project: {
          id: toCerifId('Projects', projectId),
        },
      });

      publication.originatesFrom.push({
        funding: {
          id: toCerifId('Fundings', `P${projectId}`),
        },
      });
    }
  }

  return publication;
}

async function getPublicationContext(publicationId) {
  const [authors] = await pool.query(
    `
      SELECT
        pa.*,
        ui.codigo_orcid,
        ui.doc_numero,
        f.id as facultad_id,
        f.nombre as facultad_nombre
      FROM Publicacion_autor pa
      LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
      LEFT JOIN Facultad f ON ui.facultad_id = f.id
      WHERE pa.publicacion_id = ?
      ORDER BY pa.orden ASC, pa.id ASC
    `,
    [publicationId]
  );

  const [keywords] = await pool.query(
    `
      SELECT clave as palabra_clave
      FROM Publicacion_palabra_clave
      WHERE publicacion_id = ?
    `,
    [publicationId]
  );

  const [originRows] = await pool.query(
    `
      SELECT DISTINCT
        pp.proyecto_id,
        o.codigo as ocde_codigo
      FROM Publicacion_proyecto pp
      LEFT JOIN Proyecto p ON pp.proyecto_id = p.id
      LEFT JOIN Ocde o ON p.ocde_id = o.id
      WHERE pp.publicacion_id = ?
        AND pp.proyecto_id IS NOT NULL
        AND IFNULL(pp.estado, 1) = 1
    `,
    [publicationId]
  );

  const projectIds = [...new Set(originRows.map(row => row.proyecto_id).filter(Boolean))];
  const ocdeCodes = [...new Set(originRows.map(row => row.ocde_codigo).filter(Boolean))];

  return {
    authors,
    keywords,
    projectIds,
    ocdeCodes,
  };
}

/**
 * Obtiene el conteo total de publicaciones publicables
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countPublications(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT COUNT(*) as total
    FROM Publicacion p
    WHERE p.estado = 1
      AND p.validado = 1
  `;

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
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT p.*
    FROM Publicacion p
    WHERE p.estado = 1
      AND p.validado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  const results = [];
  for (const row of rows) {
    const context = await getPublicationContext(row.id);

    results.push({
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
        datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
        setSpec: 'publications',
      },
      metadata: {
        Publication: mapToCerif(row, context),
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
  const dateFilter = buildDateFilter(from, until, 'p.updated_at');

  let query = `
    SELECT p.id, p.updated_at
    FROM Publicacion p
    WHERE p.estado = 1
      AND p.validado = 1
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset]);

  return rows.map(row => ({
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
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
    `
      SELECT p.*
      FROM Publicacion p
      WHERE p.id = ?
        AND p.estado = 1
        AND p.validado = 1
    `,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const context = await getPublicationContext(row.id);

  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
      datestamp: toISO8601(row.updated_at) || FALLBACK_DATE,
      setSpec: 'publications',
    },
    metadata: {
      Publication: mapToCerif(row, context),
    },
  };
}
