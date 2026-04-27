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
const JOURNAL_CONTAINER_TYPE = 'http://purl.org/coar/resource_type/c_0640';
const BOOK_CONTAINER_TYPE = 'http://purl.org/coar/resource_type/c_2f33';
const SERIAL_PUBLICATION_TYPES = new Set(['articulo', 'evento', 'ensayo']);
const AUTHOR_CATEGORIES = new Set(['autor', 'autor de correspondencia', 'tesista', '']);
const EDITOR_CATEGORIES = new Set(['editor']);
const ADVISOR_CATEGORIES = new Set(['asesor', 'co-asesor', 'co asesor']);
const RENATI_THESIS_TYPE_URI = `${VOCABULARIES.RENATI_TYPE}#tesis`;

function normalizeOrcid(orcid) {
  if (!orcid) return null;
  const value = String(orcid).trim();
  if (!value) return null;
  return value.startsWith('http') ? value : `https://orcid.org/${value}`;
}

function normalizeCategory(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function normalizeTextKey(value) {
  if (!value) return '';

  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function isThesisPublication(row) {
  const publicationType = normalizeCategory(row.tipo_publicacion);
  if (publicationType === 'tesis' || publicationType === 'tesis-asesoria') {
    return true;
  }

  const tipoDoc = normalizeTextKey(row.tipo_doc);
  return tipoDoc.includes('tesis');
}

function mapRenatiLevelUri(tipoTesis) {
  const key = normalizeTextKey(tipoTesis);

  if (!key) return null;
  if (key.includes('maestr')) {
    return `${VOCABULARIES.RENATI_LEVEL}#maestro`;
  }

  return null;
}

function parseLanguage(languageValue) {
  if (!languageValue) return null;

  const value = String(languageValue).trim();

  if (!value) return null;
  if (/[;,/|]/.test(value)) return null;
  if (/\s/.test(value)) return null;
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)) return null;

  return value;
}

function dedupeTypedIdentifiers(identifiers) {
  const seen = new Set();
  const result = [];

  for (const identifier of identifiers) {
    if (!identifier) continue;

    const key = `${String(identifier.type).toLowerCase()}::${String(identifier.value).toLowerCase()}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(identifier);
  }

  return result;
}

function parseEditorNames(rawEditors) {
  if (!rawEditors) return [];

  const value = String(rawEditors).trim();
  if (!value) return [];

  const candidates = value
    .replace(/\s+y\s+/gi, ',')
    .split(/[;,]/)
    .map(part => part.trim())
    .filter(Boolean);

  if (candidates.length <= 1) {
    return [value];
  }

  return [...new Set(candidates)];
}

function buildPersonFromAuthor(author) {
  const fullName = (author.autor || [author.nombres, author.apellido1, author.apellido2]
    .filter(Boolean)
    .join(' ')
    .trim());

  if (!fullName) return null;

  const familyNames = [author.apellido1, author.apellido2].filter(Boolean).join(' ').trim();
  const firstNames = (author.nombres || '').trim();

  const personName = { fullName };
  if (familyNames) personName.familyNames = familyNames;
  if (firstNames) personName.firstNames = firstNames;

  const person = { personName };

  if (author.investigador_id) {
    person.id = toCerifId('Persons', author.investigador_id);
  }

  const personIdentifiers = filterEmpty([
    author.investigador_doc_numero || author.doc_numero
      ? {
        scheme: 'http://purl.org/pe-repo/concytec/terminos#dni',
        value: String(author.investigador_doc_numero || author.doc_numero),
      }
      : null,
    normalizeOrcid(author.investigador_codigo_orcid || author.codigo_orcid)
      ? {
        scheme: 'https://orcid.org',
        value: normalizeOrcid(author.investigador_codigo_orcid || author.codigo_orcid),
      }
      : null,
    author.investigador_researcher_id
      ? {
        scheme: 'https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID',
        value: String(author.investigador_researcher_id).trim(),
      }
      : null,
    author.investigador_scopus_id
      ? {
        scheme: 'https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID',
        value: String(author.investigador_scopus_id).trim(),
      }
      : null,
  ]);

  if (personIdentifiers.length > 0) {
    person.identifiers = personIdentifiers;
  }

  const emails = filterEmpty([
    author.investigador_email1,
    author.investigador_email2,
    author.investigador_email3,
  ].map(value => (value ? String(value).trim() : null)));

  if (emails.length > 0) {
    person.emails = [...new Set(emails)];
  }

  return person;
}

function buildAuthorEntry(author) {
  const person = buildPersonFromAuthor(author);
  if (!person) return null;

  const entry = { person };

  if (author.orden !== null && author.orden !== undefined && author.orden !== '') {
    const order = Number(author.orden);
    if (!Number.isNaN(order)) {
      entry.order = order;
    }
  }

  if (author.facultad_id && author.facultad_nombre) {
    const affiliation = {
      orgUnit: {
        id: toCerifId('OrgUnits', `F${author.facultad_id}`),
        name: author.facultad_nombre,
      },
    };

    if (author.categoria) {
      affiliation.role = String(author.categoria).trim();
    }

    entry.affiliations = [affiliation];
  }

  return entry;
}

function buildEditorEntryFromName(name) {
  const fullName = String(name || '').trim();
  if (!fullName) return null;

  return {
    person: {
      personName: {
        fullName,
      },
    },
  };
}

function mapToCerif(row, { authors = [], keywords = [], projectIds = [], ocdeCodes = [] } = {}) {
  const typeUri = PUBLICATION_TYPE_MAP[row.tipo_publicacion];
  const lastModified = toISO8601(row.updated_at);
  const titleValue = row.titulo ? String(row.titulo).trim() : '';
  const language = parseLanguage(row.idioma);
  const thesisPublication = isThesisPublication(row);

  const publication = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
  };

  if (typeUri) {
    publication.type = {
      scheme: VOCABULARIES.COAR_PUBLICATION_TYPES,
      value: typeUri,
    };
  }

  if (titleValue) {
    publication.title = filterEmpty([createTitle(titleValue, language)]);
  }

  if (lastModified) {
    publication.lastModified = lastModified;
  }

  const identifiers = filterEmpty([
    createTypedIdentifier('DOI', row.doi),
    createTypedIdentifier('ISBN', row.isbn),
    createTypedIdentifier('ISSN', row.issn),
    createTypedIdentifier('ISSN', row.issn_e),
    createTypedIdentifier('Handle', row.uri),
    createTypedIdentifier('URL', row.url),
  ]);

  const dedupedIdentifiers = dedupeTypedIdentifiers(identifiers);

  if (dedupedIdentifiers.length > 0) {
    publication.identifiers = dedupedIdentifiers;
  }

  if (authors.length > 0) {
    const publicationAuthors = authors
      .filter(author => AUTHOR_CATEGORIES.has(normalizeCategory(author.categoria)))
      .map(author => buildAuthorEntry(author))
      .filter(Boolean);

    if (publicationAuthors.length > 0) {
      publication.authors = publicationAuthors;
    }

    const editorEntries = authors
      .filter(author => EDITOR_CATEGORIES.has(normalizeCategory(author.categoria)))
      .map(author => buildAuthorEntry(author))
      .filter(Boolean)
      .map(entry => {
        const editorEntry = { person: entry.person };

        if (entry.order !== undefined) {
          editorEntry.order = entry.order;
        }

        return editorEntry;
      });

    if (editorEntries.length === 0 && row.editor) {
      const parsedEditors = parseEditorNames(row.editor)
        .map(name => buildEditorEntryFromName(name))
        .filter(Boolean);

      if (parsedEditors.length > 0) {
        publication.editors = parsedEditors;
      }
    } else if (editorEntries.length > 0) {
      publication.editors = editorEntries;
    }

    if (thesisPublication) {
      const advisors = authors
        .filter(author => ADVISOR_CATEGORIES.has(normalizeCategory(author.categoria)))
        .map(author => buildAuthorEntry(author))
        .filter(Boolean)
        .map(entry => ({ person: entry.person }));

      if (advisors.length > 0) {
        publication.advisors = advisors;
      }
    }
  }

  if (thesisPublication) {
    publication.renatiType = {
      scheme: VOCABULARIES.RENATI_TYPE,
      value: RENATI_THESIS_TYPE_URI,
    };

    const qualification = {};
    const renatiLevelUri = mapRenatiLevelUri(row.tipo_tesis);

    if (renatiLevelUri) {
      qualification.type = {
        scheme: VOCABULARIES.RENATI_LEVEL,
        value: renatiLevelUri,
      };
    }

    const grantorName = row.universidad ? String(row.universidad).trim() : '';

    if (grantorName) {
      qualification.grantor = {
        orgUnit: {
          name: [{ value: grantorName }],
        },
      };
    }

    if (Object.keys(qualification).length > 0) {
      publication.inSupportOf = {
        qualification,
      };
    }
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
  if (row.edicion) {
    if (SERIAL_PUBLICATION_TYPES.has(row.tipo_publicacion)) {
      publication.issue = String(row.edicion);
    } else {
      publication.edition = String(row.edicion);
    }
  }
  if (row.pagina_inicial) publication.startPage = String(row.pagina_inicial);
  if (row.pagina_final) publication.endPage = String(row.pagina_final);

  if (language) {
    publication.language = language;
  }

  if (row.resumen) {
    const text = row.resumen instanceof Buffer ? row.resumen.toString('utf-8') : String(row.resumen);
    if (text.trim()) {
      const abstract = { value: text.trim() };

      if (language) {
        abstract.lang = language;
      }

      publication.abstract = [abstract];
    }
  }

  if (keywords.length > 0) {
    publication.keywords = keywords
      .map(keyword => String(keyword.palabra_clave || '').trim())
      .filter(Boolean)
      .map(value => {
        const keywordEntry = { value };

        if (language) {
          keywordEntry.lang = language;
        }

        return keywordEntry;
      });
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
        ui.codigo_orcid as investigador_codigo_orcid,
        ui.doc_numero as investigador_doc_numero,
        ui.researcher_id as investigador_researcher_id,
        ui.scopus_id as investigador_scopus_id,
        ui.email1 as investigador_email1,
        ui.email2 as investigador_email2,
        ui.email3 as investigador_email3,
        f.id as facultad_id,
        f.nombre as facultad_nombre
      FROM Publicacion_autor pa
      LEFT JOIN Usuario_investigador ui ON pa.investigador_id = ui.id
      LEFT JOIN Facultad f ON ui.facultad_id = f.id
      WHERE pa.publicacion_id = ?
      ORDER BY pa.orden IS NULL, pa.orden ASC, pa.id ASC
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
      AND p.updated_at IS NOT NULL
      AND p.updated_at <> '0000-00-00 00:00:00'
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
      AND p.updated_at IS NOT NULL
      AND p.updated_at <> '0000-00-00 00:00:00'
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
        datestamp: toISO8601(row.updated_at),
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
      AND p.updated_at IS NOT NULL
      AND p.updated_at <> '0000-00-00 00:00:00'
  `;

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`;
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?';

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
    `
      SELECT p.*
      FROM Publicacion p
      WHERE p.id = ?
        AND p.estado = 1
        AND p.validado = 1
        AND p.updated_at IS NOT NULL
        AND p.updated_at <> '0000-00-00 00:00:00'
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
      datestamp: toISO8601(row.updated_at),
      setSpec: 'publications',
    },
    metadata: {
      Publication: mapToCerif(row, context),
    },
  };
}
