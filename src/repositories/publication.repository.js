import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  buildDateFilter,
  createSchemeValueEntry,
  createTextValueEntry,
  createTypedIdentifier,
  inferAccessRights,
  normalizeOrcidToken,
} from '../utils/formatters.js';
import {
  PUBLICATION_TYPE_MAP,
  VOCABULARIES,
  NAMESPACES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'Publications';
const MIN_VALID_UPDATED_AT = '2000-01-01 00:00:00';
const JOURNAL_CONTAINER_TYPE = 'http://purl.org/coar/resource_type/c_0640';
const BOOK_CONTAINER_TYPE = 'http://purl.org/coar/resource_type/c_2f33';
const SERIAL_PUBLICATION_TYPES = new Set(['articulo', 'evento', 'ensayo']);
const AUTHOR_CATEGORIES = new Set(['autor', 'autor de correspondencia', 'tesista', '']);
const EDITOR_CATEGORIES = new Set(['editor']);
const ADVISOR_CATEGORIES = new Set(['asesor', 'co-asesor', 'co asesor']);
const RENATI_THESIS_TYPE_URI = `${VOCABULARIES.RENATI_TYPE}#tesis`;
const ACCESS_RIGHTS_VOCABULARY = VOCABULARIES.COAR_ACCESS_RIGHTS;

function normalizeOrcid(orcid) {
  return normalizeOrcidToken(orcid);
}

function normalizeAuthorEmail(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  const email = lower.startsWith('mailto:')
    ? lower.slice('mailto:'.length).trim()
    : lower;

  if (!email || email.includes(' ')) return null;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) return null;

  const domain = email.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return null;
  }

  return `mailto:${email}`;
}

function resolveExplicitAccess(row) {
  const value = row.access || row.acceso;

  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://purl.org/coar/access_right/')) {
    return trimmed;
  }

  return null;
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

function normalizeIdentifierValue(value) {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '-') return null;

  return trimmed;
}

function dedupeTypedIdentifiers(identifiers) {
  const seen = new Set();
  const result = [];

  for (const identifier of identifiers) {
    if (!identifier) continue;

    const key = `${String(identifier.Type).toLowerCase()}::${String(identifier.Value).toLowerCase()}`;
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

  const personName = { FullName: fullName };
  if (familyNames) personName.FamilyNames = familyNames;
  if (firstNames) personName.FirstNames = firstNames;

  const person = { PersonName: personName };

  if (author.investigador_id) {
    person.id = toCerifId('Persons', author.investigador_id);
  }

  const personIdentifiers = filterEmpty([
    author.investigador_doc_numero || author.doc_numero
      ? createSchemeValueEntry('http://purl.org/pe-repo/concytec/terminos#dni', author.investigador_doc_numero || author.doc_numero)
      : null,
    normalizeOrcid(author.investigador_codigo_orcid || author.codigo_orcid)
      ? createSchemeValueEntry('https://orcid.org', normalizeOrcid(author.investigador_codigo_orcid || author.codigo_orcid))
      : null,
    author.investigador_researcher_id
      ? createSchemeValueEntry('https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID', author.investigador_researcher_id)
      : null,
    author.investigador_scopus_id
      ? createSchemeValueEntry('https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID', author.investigador_scopus_id)
      : null,
  ]);

  if (personIdentifiers.length > 0) {
    person.Identifier = personIdentifiers;
  }

  const emails = filterEmpty([
    author.investigador_email1,
    author.investigador_email2,
    author.investigador_email3,
  ].map(normalizeAuthorEmail));

  if (emails.length > 0) {
    person.ElectronicAddress = [...new Set(emails)];
  }

  return person;
}

function buildAuthorEntry(author) {
  const person = buildPersonFromAuthor(author);
  if (!person) return null;

  const entry = { person };
  const normalizedEntry = { Person: person };

  if (author.orden !== null && author.orden !== undefined && author.orden !== '') {
    const order = Number(author.orden);
    if (!Number.isNaN(order)) {
      normalizedEntry.Order = order;
    }
  }

  if (author.facultad_id && author.facultad_nombre) {
    const affiliation = {
      OrgUnit: {
        id: toCerifId('OrgUnits', `F${author.facultad_id}`),
        name: author.facultad_nombre,
      },
    };

    if (author.categoria) {
      affiliation.Role = String(author.categoria).trim();
    }

    normalizedEntry.Affiliation = [affiliation];
  }

  return normalizedEntry;
}

function buildEditorEntryFromName(name) {
  const fullName = String(name || '').trim();
  if (!fullName) return null;

  return {
    Person: {
      PersonName: {
        FullName: fullName,
      },
    },
  };
}

function mapToCerif(row, { authors = [], keywords = [], projectIds = [], ocdeCodes = [] } = {}) {
  const typeUri = PUBLICATION_TYPE_MAP[row.tipo_publicacion] || PUBLICATION_TYPE_MAP.default;
  const lastModified = toISO8601(row.updated_at);
  const titleValue = row.titulo ? String(row.titulo).trim() : '';
  const language = parseLanguage(row.idioma);
  const thesisPublication = isThesisPublication(row);
  const access = resolveExplicitAccess(row) || inferAccessRights(row).uri;
  const typeEntries = filterEmpty([
    {
      Scheme: VOCABULARIES.COAR_PUBLICATION_TYPES,
      Value: typeUri,
    },
    thesisPublication
      ? {
        Scheme: VOCABULARIES.RENATI_TYPE,
        Value: RENATI_THESIS_TYPE_URI,
      }
      : null,
  ]);

  const publication = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Type: typeEntries,
  };

  if (titleValue) {
    publication.Title = filterEmpty([createTextValueEntry(titleValue, language || 'es')]);
  }

  if (access) {
    publication.Access = {
      Scheme: ACCESS_RIGHTS_VOCABULARY,
      Value: access,
    };
  }

  if (lastModified) {
    publication.LastModified = lastModified;
  }

  const identifiers = filterEmpty([
    normalizeIdentifierValue(row.doi) ? { Type: 'DOI', Value: normalizeIdentifierValue(row.doi) } : null,
    normalizeIdentifierValue(row.uri) ? { Type: 'Handle', Value: normalizeIdentifierValue(row.uri) } : null,
    normalizeIdentifierValue(row.url) ? { Type: 'URL', Value: normalizeIdentifierValue(row.url) } : null,
  ]);

  const dedupedIdentifiers = dedupeTypedIdentifiers(identifiers);

  if (dedupedIdentifiers.length > 0) {
    publication.Identifier = dedupedIdentifiers;
  }

  if (authors.length > 0) {
    const publicationAuthors = authors
      .filter(author => AUTHOR_CATEGORIES.has(normalizeCategory(author.categoria)))
      .map(author => buildAuthorEntry(author))
      .filter(Boolean);

    if (publicationAuthors.length > 0) {
      publication.Authors = {
        Author: publicationAuthors,
      };
    }

    const editorEntries = authors
      .filter(author => EDITOR_CATEGORIES.has(normalizeCategory(author.categoria)))
      .map(author => buildAuthorEntry(author))
      .filter(Boolean)
      .map(entry => {
        const editorEntry = { Person: entry.Person };

        if (entry.Order !== undefined) {
          editorEntry.Order = entry.Order;
        }

        return editorEntry;
      });

    if (editorEntries.length === 0 && row.editor) {
      const parsedEditors = parseEditorNames(row.editor)
        .map(name => buildEditorEntryFromName(name))
        .filter(Boolean);

        if (parsedEditors.length > 0) {
          publication.Editors = {
            Editor: parsedEditors,
          };
        }
      } else if (editorEntries.length > 0) {
        publication.Editors = {
          Editor: editorEntries,
        };
      }

    if (thesisPublication) {
      const advisors = authors
        .filter(author => ADVISOR_CATEGORIES.has(normalizeCategory(author.categoria)))
        .map(author => buildAuthorEntry(author))
        .filter(Boolean)
        .map(entry => ({ Person: entry.Person }));

      if (advisors.length > 0) {
        publication.Advisors = {
          Advisor: advisors,
        };
      }
    }
  }

  if (thesisPublication) {
    const qualification = {};
    const renatiLevelUri = mapRenatiLevelUri(row.tipo_tesis);

    if (renatiLevelUri) {
      qualification.Type = {
        Scheme: VOCABULARIES.RENATI_LEVEL,
        Value: renatiLevelUri,
      };
    }

    const grantorName = row.universidad ? String(row.universidad).trim() : '';

    if (grantorName) {
      qualification.Grantor = {
        OrgUnit: {
          Name: filterEmpty([createTextValueEntry(grantorName, 'es')]),
        },
      };
    }

    if (Object.keys(qualification).length > 0) {
      publication.InSupportOf = {
        Qualification: qualification,
      };
    }
  }

  const containerIssn = filterEmpty([row.issn, row.issn_e].map(normalizeIdentifierValue));
  const containerIsbn = filterEmpty([row.isbn].map(normalizeIdentifierValue));
  const containerTitle = row.publicacion_nombre || row.nombre_libro;

  if (containerTitle || containerIssn.length > 0 || containerIsbn.length > 0) {
    const containerType = containerIssn.length > 0 ? JOURNAL_CONTAINER_TYPE : BOOK_CONTAINER_TYPE;

    const embeddedPublication = {
      id: toCerifId('Publications', `SRC-${row.id}`),
      Type: containerType,
    };

    if (containerTitle) {
      embeddedPublication.Title = filterEmpty([createTextValueEntry(String(containerTitle), 'es')]);
    }

    if (containerIssn.length > 0) {
      embeddedPublication.ISSN = [...new Set(containerIssn)];
    }

    if (containerIsbn.length > 0) {
      embeddedPublication.ISBN = [...new Set(containerIsbn)];
    }

    publication.PublishedIn = {
      Publication: embeddedPublication,
    };
  }

  if (row.tipo_publicacion === 'capitulo' && (row.nombre_libro || row.isbn)) {
    const partOfPublication = {
      id: toCerifId('Publications', `BOOK-${row.id}`),
      Type: BOOK_CONTAINER_TYPE,
    };

    if (row.nombre_libro) {
      partOfPublication.Title = filterEmpty([createTextValueEntry(String(row.nombre_libro), 'es')]);
    }

    const partOfIsbn = normalizeIdentifierValue(row.isbn);
    if (partOfIsbn) {
      partOfPublication.ISBN = [partOfIsbn];
    }

    publication.PartOf = {
      Publication: partOfPublication,
    };
  }

  if (row.editorial) {
    publication.Publishers = {
      Publisher: [
        {
          OrgUnit: {
            Name: filterEmpty([createTextValueEntry(row.editorial, 'es')]),
          },
        },
      ],
    };
  }

  if (row.fecha_publicacion) {
    publication.PublicationDate = row.fecha_publicacion instanceof Date
      ? row.fecha_publicacion.toISOString().split('T')[0]
      : row.fecha_publicacion;
  }

  if (row.volumen) publication.Volume = String(row.volumen);
  if (row.edicion) {
    if (SERIAL_PUBLICATION_TYPES.has(row.tipo_publicacion)) {
      publication.Issue = String(row.edicion);
    } else {
      publication.Edition = String(row.edicion);
    }
  }
  if (row.pagina_inicial) publication.StartPage = String(row.pagina_inicial);
  if (row.pagina_final) publication.EndPage = String(row.pagina_final);

  if (language) {
    publication.Language = language;
  }

  if (row.resumen) {
    const text = row.resumen instanceof Buffer ? row.resumen.toString('utf-8') : String(row.resumen);
    if (text.trim()) {
      publication.Abstract = filterEmpty([
        createTextValueEntry(text.trim(), language || 'es'),
      ]);
    }
  }

  if (keywords.length > 0) {
    publication.Keywords = keywords
      .map(keyword => String(keyword.palabra_clave || '').trim())
      .filter(Boolean)
      .map(value => createTextValueEntry(value, language || 'es'));
  }

  if (ocdeCodes.length > 0) {
    publication.Subject = ocdeCodes
      .filter(Boolean)
      .map(code => ({
        Scheme: VOCABULARIES.OCDE_FORD,
        Value: `${VOCABULARIES.OCDE_FORD}#${code}`,
      }));
  }

  if (projectIds.length > 0) {
    publication.OriginatesFrom = [];

    for (const projectId of projectIds) {
      publication.OriginatesFrom.push({
        Project: {
          id: toCerifId('Projects', projectId),
        },
      });

      publication.OriginatesFrom.push({
        Funding: {
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
      AND p.updated_at >= '${MIN_VALID_UPDATED_AT}'
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
      AND p.updated_at >= '${MIN_VALID_UPDATED_AT}'
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
      AND p.updated_at >= '${MIN_VALID_UPDATED_AT}'
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
        AND p.updated_at >= ?
    `,
    [id, MIN_VALID_UPDATED_AT]
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
