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
} from '../utils/formatters.js';
import {
  NAMESPACES,
  ORGUNIT_SUBTYPE_VALUES,
  ORGUNIT_TYPE_VALUES,
  UNMSM_IDENTIFIERS,
  UNMSM_CODES,
  UNMSM_ORGUNIT_TYPED_VALUES,
  VOCABULARIES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'OrgUnits';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';

function normalizeRorValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || null;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function normalizeIsniValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, '');
}

function normalizeUrlValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  return null;
}

function normalizeEmailValue(value) {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return null;
  const domain = trimmed.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null;
  return `mailto:${trimmed}`;
}

function buildIdentifier(scheme, value) {
  return createSchemeValueEntry(scheme, value);
}

function buildName(value, lang = 'es') {
  return createTextValueEntry(value, lang);
}

function buildTypeValue(value, scheme = null) {
  if (!value) return null;

  if (!scheme) {
    return {
      Value: String(value).trim(),
    };
  }

  return createSchemeValueEntry(scheme, value);
}

function buildPartOf(orgUnitId, orgUnitName) {
  if (!orgUnitId) return null;

  const partOf = {
    OrgUnit: {
      id: toCerifId(ENTITY_TYPE, orgUnitId),
    },
  };

  if (orgUnitName) {
    partOf.OrgUnit.name = orgUnitName;
  }

  return partOf;
}

function buildRootTypeEntries() {
  return filterEmpty([
    buildTypeValue(ORGUNIT_TYPE_VALUES.ROOT),
    buildTypeValue(UNMSM_ORGUNIT_TYPED_VALUES.SECTOR, VOCABULARIES.ORGUNIT_SECTOR_INSTITUTIONAL),
    buildTypeValue(UNMSM_ORGUNIT_TYPED_VALUES.HIGHER_EDUCATION, VOCABULARIES.ORGUNIT_HIGHER_EDUCATION_TYPE),
    buildTypeValue(UNMSM_ORGUNIT_TYPED_VALUES.NATURE, VOCABULARIES.ORGUNIT_NATURE),
    buildTypeValue(UNMSM_ROOT.ciiu, VOCABULARIES.ORGUNIT_CIIU),
  ]);
}

function buildDependencyTypeEntries(subtype) {
  return filterEmpty([
    buildTypeValue(ORGUNIT_TYPE_VALUES.DEPENDENCY),
    buildTypeValue(subtype, VOCABULARIES.ORGUNIT_SUBTYPE),
    buildTypeValue(UNMSM_ROOT.ciiu, VOCABULARIES.ORGUNIT_CIIU),
  ]);
}

// Hardcoded: UNMSM como organizacion raiz
const UNMSM_ROOT = {
  id: 1,
  nombre: 'Universidad Nacional Mayor de San Marcos',
  acronym: 'UNMSM',
  ruc: UNMSM_IDENTIFIERS.RUC,
  ror: UNMSM_IDENTIFIERS.ROR,
  isni: UNMSM_IDENTIFIERS.ISNI,
  grid: UNMSM_IDENTIFIERS.GRID,
  scopusAffiliationId: UNMSM_IDENTIFIERS.SCOPUS_AFFILIATION_ID,
  countryCode: 'PE',
  ubigeo: UNMSM_CODES.UBIGEO_LIMA,
  ciiu: UNMSM_CODES.CIIU_EDUCACION_SUPERIOR,
  sectorOcde: UNMSM_CODES.SECTOR_OCDE,
};

function shouldIncludeStaticOrgUnits(from, until) {
  const fallbackTime = new Date(FALLBACK_DATE).getTime();

  if (from) {
    const fromTime = new Date(from).getTime();
    if (!Number.isNaN(fromTime) && fallbackTime < fromTime) {
      return false;
    }
  }

  if (until) {
    const untilTime = new Date(until).getTime();
    if (!Number.isNaN(untilTime) && fallbackTime > untilTime) {
      return false;
    }
  }

  return true;
}

function createRootOrgUnitRecord() {
  return {
    header: {
      identifier: toOAIIdentifier(ENTITY_TYPE, UNMSM_ROOT.id),
      datestamp: FALLBACK_DATE,
      setSpec: 'orgunits',
    },
    metadata: {
      OrgUnit: {
        '@id': toCerifId(ENTITY_TYPE, UNMSM_ROOT.id),
        '@xmlns': NAMESPACES.PERUCRIS_CERIF,
        Name: filterEmpty([buildName(UNMSM_ROOT.nombre)]),
        Acronym: UNMSM_ROOT.acronym,
        Type: buildRootTypeEntries(),
        LastModified: FALLBACK_DATE,
        Identifier: filterEmpty([
          buildIdentifier('https://purl.org/pe-repo/concytec/terminos#ruc', UNMSM_ROOT.ruc),
          buildIdentifier('https://w3id.org/cerif/vocab/IdentifierTypes#RORID', normalizeRorValue(UNMSM_ROOT.ror)),
          buildIdentifier('https://w3id.org/cerif/vocab/IdentifierTypes#ISNI', normalizeIsniValue(UNMSM_ROOT.isni)),
          buildIdentifier('https://www.grid.ac', UNMSM_ROOT.grid),
          buildIdentifier('https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAffiliationID', UNMSM_ROOT.scopusAffiliationId),
        ]),
        CountryCode: UNMSM_ROOT.countryCode,
        UbiGeo: buildIdentifier(VOCABULARIES.ORGUNIT_UBIGEO, UNMSM_ROOT.ubigeo),
      },
    },
  };
}

/**
 * Mapea una facultad a formato CERIF OrgUnit
 * @param {object} row
 * @returns {object}
 */
function mapFacultadToCerif(row) {
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;

  const orgUnit = {
    '@id': toCerifId(ENTITY_TYPE, `F${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Name: filterEmpty([buildName(row.nombre)]),
    Type: buildDependencyTypeEntries(ORGUNIT_SUBTYPE_VALUES.RESEARCH_UNIT),
    UbiGeo: buildIdentifier(VOCABULARIES.ORGUNIT_UBIGEO, UNMSM_CODES.UBIGEO_LIMA),
    LastModified: lastModified,
  };

  orgUnit.PartOf = buildPartOf(String(UNMSM_ROOT.id), UNMSM_ROOT.nombre);

  return orgUnit;
}

/**
 * Mapea un instituto a formato CERIF OrgUnit
 * @param {object} row
 * @returns {object}
 */
function mapInstitutoToCerif(row) {
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;

  const orgUnit = {
    '@id': toCerifId(ENTITY_TYPE, `I${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Name: filterEmpty([buildName(row.instituto)]),
    Type: buildDependencyTypeEntries(ORGUNIT_SUBTYPE_VALUES.RESEARCH_UNIT),
    UbiGeo: buildIdentifier(VOCABULARIES.ORGUNIT_UBIGEO, UNMSM_CODES.UBIGEO_LIMA),
    LastModified: lastModified,
  };

  orgUnit.PartOf = row.facultad_id && row.facultad_nombre
    ? buildPartOf(`F${row.facultad_id}`, row.facultad_nombre)
    : buildPartOf(String(UNMSM_ROOT.id), UNMSM_ROOT.nombre);

  return orgUnit;
}

/**
 * Mapea un laboratorio a formato CERIF OrgUnit
 * @param {object} row
 * @returns {object}
 */
function mapLaboratorioToCerif(row) {
  const orgUnit = {
    '@id': toCerifId(ENTITY_TYPE, `L${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Name: filterEmpty([buildName(row.laboratorio)]),
    Type: buildDependencyTypeEntries(ORGUNIT_SUBTYPE_VALUES.RESEARCH_UNIT),
    UbiGeo: buildIdentifier(VOCABULARIES.ORGUNIT_UBIGEO, UNMSM_CODES.UBIGEO_LIMA),
    Keywords: [{ Value: 'Laboratorio' }],
    LastModified: FALLBACK_DATE,
  };

  orgUnit.PartOf = row.facultad_id && row.facultad_nombre
    ? buildPartOf(`F${row.facultad_id}`, row.facultad_nombre)
    : buildPartOf(String(UNMSM_ROOT.id), UNMSM_ROOT.nombre);

  if (row.codigo) {
    orgUnit.Identifier = filterEmpty([
      buildIdentifier('https://w3id.org/cerif/vocab/IdentifierTypes#CRISID', row.codigo),
    ]);
  }

  const descriptionParts = [];
  if (row.responsable) descriptionParts.push(`Responsable: ${String(row.responsable).trim()}`);
  if (row.categoria_uso) descriptionParts.push(`Categoría de uso: ${String(row.categoria_uso).trim()}`);
  if (descriptionParts.length > 0) {
    orgUnit.Description = filterEmpty([
      buildName(descriptionParts.join('. ')),
    ]);
  }

  if (row.ubicacion) {
    orgUnit.Address = { Street: String(row.ubicacion).trim() };
  }

  return orgUnit;
}

/**
 * Mapea una linea de investigacion a formato CERIF OrgUnit
 * @param {object} row
 * @returns {object}
 */
function mapLineaInvestigacionToCerif(row) {
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;

  const orgUnit = {
    '@id': toCerifId(ENTITY_TYPE, `LI${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Name: filterEmpty([buildName(row.nombre)]),
    Type: buildDependencyTypeEntries(ORGUNIT_SUBTYPE_VALUES.RESEARCH_LINE),
    UbiGeo: buildIdentifier(VOCABULARIES.ORGUNIT_UBIGEO, UNMSM_CODES.UBIGEO_LIMA),
    LastModified: lastModified,
  };

  if (row.parent_id && row.parent_nombre) {
    orgUnit.PartOf = buildPartOf(`LI${row.parent_id}`, row.parent_nombre);
  } else if (row.facultad_id && row.facultad_nombre) {
    orgUnit.PartOf = buildPartOf(`F${row.facultad_id}`, row.facultad_nombre);
  } else {
    orgUnit.PartOf = buildPartOf(String(UNMSM_ROOT.id), UNMSM_ROOT.nombre);
  }

  if (row.codigo) {
    orgUnit.Identifier = filterEmpty([
      buildIdentifier('https://w3id.org/cerif/vocab/IdentifierTypes#CRISID', row.codigo),
    ]);
  }

  if (row.resolucion) {
    orgUnit.Description = filterEmpty([
      buildName(`Resolución: ${String(row.resolucion).trim()}`),
    ]);
  }

  return orgUnit;
}

/**
 * Mapea un grupo de investigacion a formato CERIF OrgUnit
 * @param {object} row
 * @returns {object}
 */
function mapGrupoToCerif(row) {
  const lastModified = toISO8601(row.updated_at) || FALLBACK_DATE;

  const orgUnit = {
    '@id': toCerifId(ENTITY_TYPE, `G${row.id}`),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Name: filterEmpty([buildName(row.grupo_nombre)]),
    Type: buildDependencyTypeEntries(ORGUNIT_SUBTYPE_VALUES.RESEARCH_GROUP),
    UbiGeo: buildIdentifier(VOCABULARIES.ORGUNIT_UBIGEO, UNMSM_CODES.UBIGEO_LIMA),
    LastModified: lastModified,
  };

  if (row.grupo_nombre_corto) {
    orgUnit.Acronym = row.grupo_nombre_corto;
  }

  orgUnit.PartOf = row.facultad_id && row.facultad_nombre
    ? buildPartOf(`F${row.facultad_id}`, row.facultad_nombre)
    : buildPartOf(String(UNMSM_ROOT.id), UNMSM_ROOT.nombre);

  const websites = [];
  if (row.web) {
    const normalizedWeb = normalizeUrlValue(row.web);
    if (normalizedWeb) {
      websites.push({ Type: 'homepage', URL: normalizedWeb });
    }
  }
  if (row.email) {
    const normalizedEmail = normalizeEmailValue(row.email);
    if (normalizedEmail) {
      websites.push({ Type: 'email', URL: normalizedEmail });
    }
  }
  if (websites.length > 0) {
    orgUnit.Websites = websites;
  }

  if (row.direccion) {
    orgUnit.Address = { Street: row.direccion };
  }

  if (row.presentacion) {
    orgUnit.Description = filterEmpty([buildName(row.presentacion)]);
  }

  if (row.grupo_categoria) {
    orgUnit.Keywords = [{ Value: String(row.grupo_categoria).trim() }];
  }

  return orgUnit;
}

/**
 * Obtiene el conteo total de OrgUnits (Facultades + Institutos + Laboratorios + Lineas + Grupos activos)
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countOrgUnits(from, until) {
  const includeStatic = shouldIncludeStaticOrgUnits(from, until);

  // Contar grupos activos (estado = 4 es activo en tabla Grupo)
  const dateFilter = buildDateFilter(from, until);
  let gruposQuery = 'SELECT COUNT(*) as total FROM Grupo WHERE estado = 4';
  if (dateFilter.clause) {
    gruposQuery += ` AND ${dateFilter.clause}`;
  }
  const [grupos] = await pool.query(gruposQuery, dateFilter.params);

  if (!includeStatic) {
    return grupos[0].total;
  }

  // Contar facultades (sin updated_at en origen)
  const [facultades] = await pool.query('SELECT COUNT(*) as total FROM Facultad');

  // Contar institutos activos (sin updated_at en origen)
  const [institutos] = await pool.query('SELECT COUNT(*) as total FROM Instituto WHERE estado = 1');

  // Contar laboratorios con nombre (sin updated_at en origen)
  const [laboratorios] = await pool.query(`
    SELECT COUNT(*) as total
    FROM Laboratorio
    WHERE laboratorio IS NOT NULL
      AND TRIM(laboratorio) <> ''
  `);

  // Contar lineas de investigacion activas
  const [lineas] = await pool.query(`
    SELECT COUNT(*) as total
    FROM Linea_investigacion
    WHERE estado = 1
      AND nombre IS NOT NULL
      AND TRIM(nombre) <> ''
  `);

  // +1 por UNMSM root
  return 1 + facultades[0].total + institutos[0].total + laboratorios[0].total + lineas[0].total + grupos[0].total;
}

/**
 * Obtiene OrgUnits con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getOrgUnits({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  const results = [];
  let currentOffset = offset;
  let remaining = limit;
  const includeStatic = shouldIncludeStaticOrgUnits(from, until);

  if (includeStatic && remaining > 0) {
    const staticRecords = [createRootOrgUnitRecord()];

    const [facultades] = await pool.query('SELECT * FROM Facultad ORDER BY id');
    for (const f of facultades) {
      staticRecords.push({
        header: {
          identifier: toOAIIdentifier(ENTITY_TYPE, `F${f.id}`),
          datestamp: FALLBACK_DATE,
          setSpec: 'orgunits',
        },
        metadata: {
          OrgUnit: mapFacultadToCerif(f),
        },
      });
    }

    const [institutos] = await pool.query(`
      SELECT i.*, f.nombre as facultad_nombre
      FROM Instituto i
      LEFT JOIN Facultad f ON i.facultad_id = f.id
      WHERE i.estado = 1
      ORDER BY i.id
    `);

    for (const inst of institutos) {
      staticRecords.push({
        header: {
          identifier: toOAIIdentifier(ENTITY_TYPE, `I${inst.id}`),
          datestamp: FALLBACK_DATE,
          setSpec: 'orgunits',
        },
        metadata: {
          OrgUnit: mapInstitutoToCerif(inst),
        },
      });
    }

    const [laboratorios] = await pool.query(`
      SELECT l.*, f.nombre as facultad_nombre
      FROM Laboratorio l
      LEFT JOIN Facultad f ON l.facultad_id = f.id
      WHERE l.laboratorio IS NOT NULL
        AND TRIM(l.laboratorio) <> ''
      ORDER BY l.id
    `);

    for (const lab of laboratorios) {
      staticRecords.push({
        header: {
          identifier: toOAIIdentifier(ENTITY_TYPE, `L${lab.id}`),
          datestamp: FALLBACK_DATE,
          setSpec: 'orgunits',
        },
        metadata: {
          OrgUnit: mapLaboratorioToCerif(lab),
        },
      });
    }

    const [lineas] = await pool.query(`
      SELECT
        li.*,
        f.nombre as facultad_nombre,
        parent.nombre as parent_nombre
      FROM Linea_investigacion li
      LEFT JOIN Facultad f ON li.facultad_id = f.id
      LEFT JOIN Linea_investigacion parent ON li.parent_id = parent.id
      WHERE li.estado = 1
        AND li.nombre IS NOT NULL
        AND TRIM(li.nombre) <> ''
      ORDER BY li.id
    `);

    for (const linea of lineas) {
      staticRecords.push({
        header: {
          identifier: toOAIIdentifier(ENTITY_TYPE, `LI${linea.id}`),
          datestamp: toISO8601(linea.updated_at) || FALLBACK_DATE,
          setSpec: 'orgunits',
        },
        metadata: {
          OrgUnit: mapLineaInvestigacionToCerif(linea),
        },
      });
    }

    if (currentOffset < staticRecords.length) {
      const page = staticRecords.slice(currentOffset, currentOffset + remaining);
      results.push(...page);
      remaining -= page.length;
      currentOffset = 0;
    } else {
      currentOffset -= staticRecords.length;
    }
  }

  // Grupos
  if (remaining > 0) {
    const dateFilter = buildDateFilter(from, until);
    let gruposQuery = `
      SELECT g.*, f.nombre as facultad_nombre
      FROM Grupo g
      LEFT JOIN Facultad f ON g.facultad_id = f.id
      WHERE g.estado = 4
    `;
    if (dateFilter.clause) {
      gruposQuery += ` AND ${dateFilter.clause}`;
    }
    gruposQuery += ` ORDER BY g.id LIMIT ? OFFSET ?`;

    const [grupos] = await pool.query(gruposQuery, [...dateFilter.params, remaining, Math.max(0, currentOffset)]);

    for (const g of grupos) {
      results.push({
        header: {
          identifier: toOAIIdentifier(ENTITY_TYPE, `G${g.id}`),
          datestamp: toISO8601(g.updated_at) || FALLBACK_DATE,
          setSpec: 'orgunits',
        },
        metadata: {
          OrgUnit: mapGrupoToCerif(g),
        },
      });
    }
  }

  return results;
}

/**
 * Obtiene solo headers de OrgUnits (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getOrgUnitHeaders({ from, until, offset = 0, limit = env.PAGE_SIZE }) {
  // Simplificado: obtener todos los records y extraer solo headers
  const records = await getOrgUnits({ from, until, offset, limit });
  return records.map(r => r.header);
}

/**
 * Obtiene una OrgUnit por ID
 * @param {string} id - ID con prefijo (F1, I2, G3) o numero para UNMSM root
 * @returns {Promise<object|null>}
 */
export async function getOrgUnitById(id) {
  // UNMSM root
  if (id === '1' || id === 1) {
    return createRootOrgUnitRecord();
  }

  const prefix = id.charAt(0);
  const numId = id.substring(1);

  // Linea de investigacion
  if (id.startsWith('LI')) {
    const lineaId = id.substring(2);
    const [rows] = await pool.query(`
      SELECT
        li.*,
        f.nombre as facultad_nombre,
        parent.nombre as parent_nombre
      FROM Linea_investigacion li
      LEFT JOIN Facultad f ON li.facultad_id = f.id
      LEFT JOIN Linea_investigacion parent ON li.parent_id = parent.id
      WHERE li.id = ?
        AND li.estado = 1
        AND li.nombre IS NOT NULL
        AND TRIM(li.nombre) <> ''
    `, [lineaId]);
    if (rows.length === 0) return null;

    return {
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, id),
        datestamp: toISO8601(rows[0].updated_at) || FALLBACK_DATE,
        setSpec: 'orgunits',
      },
      metadata: {
        OrgUnit: mapLineaInvestigacionToCerif(rows[0]),
      },
    };
  }

  // Facultad
  if (prefix === 'F') {
    const [rows] = await pool.query('SELECT * FROM Facultad WHERE id = ?', [numId]);
    if (rows.length === 0) return null;

    return {
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, id),
        datestamp: FALLBACK_DATE,
        setSpec: 'orgunits',
      },
      metadata: {
        OrgUnit: mapFacultadToCerif(rows[0]),
      },
    };
  }

  // Instituto
  if (prefix === 'I') {
    const [rows] = await pool.query(`
      SELECT i.*, f.nombre as facultad_nombre
      FROM Instituto i
      LEFT JOIN Facultad f ON i.facultad_id = f.id
      WHERE i.id = ? AND i.estado = 1
    `, [numId]);
    if (rows.length === 0) return null;

    return {
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, id),
        datestamp: FALLBACK_DATE,
        setSpec: 'orgunits',
      },
      metadata: {
        OrgUnit: mapInstitutoToCerif(rows[0]),
      },
    };
  }

  // Laboratorio
  if (prefix === 'L') {
    const [rows] = await pool.query(`
      SELECT l.*, f.nombre as facultad_nombre
      FROM Laboratorio l
      LEFT JOIN Facultad f ON l.facultad_id = f.id
      WHERE l.id = ?
        AND l.laboratorio IS NOT NULL
        AND TRIM(l.laboratorio) <> ''
    `, [numId]);
    if (rows.length === 0) return null;

    return {
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, id),
        datestamp: FALLBACK_DATE,
        setSpec: 'orgunits',
      },
      metadata: {
        OrgUnit: mapLaboratorioToCerif(rows[0]),
      },
    };
  }

  // Grupo (estado = 4 es activo en tabla Grupo)
  if (prefix === 'G') {
    const [rows] = await pool.query(`
      SELECT g.*, f.nombre as facultad_nombre
      FROM Grupo g
      LEFT JOIN Facultad f ON g.facultad_id = f.id
      WHERE g.id = ? AND g.estado = 4
    `, [numId]);
    if (rows.length === 0) return null;

    return {
      header: {
        identifier: toOAIIdentifier(ENTITY_TYPE, id),
        datestamp: toISO8601(rows[0].updated_at) || FALLBACK_DATE,
        setSpec: 'orgunits',
      },
      metadata: {
        OrgUnit: mapGrupoToCerif(rows[0]),
      },
    };
  }

  return null;
}
