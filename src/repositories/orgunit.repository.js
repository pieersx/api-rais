import pool from '../config/database.js';
import { env } from '../config/env.js';
import {
  toOAIIdentifier,
  toCerifId,
  toISO8601,
  filterEmpty,
  createIdentifier,
  createTitle,
  buildDateFilter,
} from '../utils/formatters.js';
import {
  IDENTIFIER_SCHEMES,
  NAMESPACES,
  UNMSM_IDENTIFIERS,
  UNMSM_CODES,
} from '../utils/constants.js';

const ENTITY_TYPE = 'OrgUnits';
const FALLBACK_DATE = '2014-01-01T00:00:00Z';

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
        name: [createTitle(UNMSM_ROOT.nombre)],
        acronym: UNMSM_ROOT.acronym,
        type: 'Universidad',
        lastModified: FALLBACK_DATE,
        identifiers: filterEmpty([
          createIdentifier(IDENTIFIER_SCHEMES.RUC, UNMSM_ROOT.ruc),
          createIdentifier(IDENTIFIER_SCHEMES.ROR, UNMSM_ROOT.ror),
          createIdentifier(IDENTIFIER_SCHEMES.ISNI, UNMSM_ROOT.isni),
          createIdentifier(IDENTIFIER_SCHEMES.GRID, UNMSM_ROOT.grid),
          createIdentifier('http://purl.org/pe-repo/concytec/scopus/affiliationId', UNMSM_ROOT.scopusAffiliationId),
        ]),
        countryCode: UNMSM_ROOT.countryCode,
        classifications: filterEmpty([
          {
            scheme: 'https://purl.org/pe-repo/inei/ubigeo',
            value: UNMSM_ROOT.ubigeo,
          },
          {
            scheme: 'https://purl.org/pe-repo/inei/ciiu',
            value: UNMSM_ROOT.ciiu,
          },
          {
            scheme: 'https://purl.org/pe-repo/ocde/sector',
            value: UNMSM_ROOT.sectorOcde,
          },
        ]),
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
    name: [createTitle(row.nombre)],
    type: 'Facultad',
    lastModified,
  };

  // Todas las facultades dependen de UNMSM
  orgUnit.partOf = {
    orgUnit: {
      id: toCerifId(ENTITY_TYPE, UNMSM_ROOT.id),
      name: UNMSM_ROOT.nombre,
    },
  };

  // Agregar clasificaciones: UbiGeo, CIIU, Sector OCDE (heredadas de UNMSM)
  orgUnit.classifications = filterEmpty([
    {
      scheme: 'https://purl.org/pe-repo/inei/ubigeo',
      value: UNMSM_CODES.UBIGEO_LIMA,
    },
    {
      scheme: 'https://purl.org/pe-repo/inei/ciiu',
      value: UNMSM_CODES.CIIU_EDUCACION_SUPERIOR,
    },
    {
      scheme: 'https://purl.org/pe-repo/ocde/sector',
      value: UNMSM_CODES.SECTOR_OCDE,
    },
  ]);

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
    name: [createTitle(row.instituto)],
    type: 'Instituto',
    lastModified,
  };

  // Los institutos dependen de su facultad
  if (row.facultad_id && row.facultad_nombre) {
    orgUnit.partOf = {
      orgUnit: {
        id: toCerifId(ENTITY_TYPE, `F${row.facultad_id}`),
        name: row.facultad_nombre,
      },
    };
  }

  // Agregar clasificaciones: UbiGeo, CIIU, Sector OCDE (heredadas de UNMSM)
  orgUnit.classifications = filterEmpty([
    {
      scheme: 'https://purl.org/pe-repo/inei/ubigeo',
      value: UNMSM_CODES.UBIGEO_LIMA,
    },
    {
      scheme: 'https://purl.org/pe-repo/inei/ciiu',
      value: UNMSM_CODES.CIIU_EDUCACION_SUPERIOR,
    },
    {
      scheme: 'https://purl.org/pe-repo/ocde/sector',
      value: UNMSM_CODES.SECTOR_OCDE,
    },
  ]);

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
    name: [createTitle(row.grupo_nombre)],
    type: 'Grupo de investigacion',
    lastModified,
  };

  if (row.grupo_nombre_corto) {
    orgUnit.acronym = row.grupo_nombre_corto;
  }

  // Los grupos dependen de su facultad
  if (row.facultad_id && row.facultad_nombre) {
    orgUnit.partOf = {
      orgUnit: {
        id: toCerifId(ENTITY_TYPE, `F${row.facultad_id}`),
        name: row.facultad_nombre,
      },
    };
  }

  const websites = [];
  if (row.web) {
    websites.push({ type: 'homepage', url: row.web });
  }
  if (row.email) {
    websites.push({ type: 'email', url: `mailto:${String(row.email).trim().toLowerCase()}` });
  }
  if (websites.length > 0) {
    orgUnit.websites = websites;
  }

  if (row.direccion) {
    orgUnit.address = { street: row.direccion };
  }

  if (row.presentacion) {
    orgUnit.description = [{ lang: 'es', value: row.presentacion }];
  }

  // Clasificaciones del grupo
  const classifications = [];

  // UbiGeo, CIIU, Sector OCDE (heredadas de UNMSM)
  classifications.push(
    {
      scheme: 'https://purl.org/pe-repo/inei/ubigeo',
      value: UNMSM_CODES.UBIGEO_LIMA,
    },
    {
      scheme: 'https://purl.org/pe-repo/inei/ciiu',
      value: UNMSM_CODES.CIIU_EDUCACION_SUPERIOR,
    },
    {
      scheme: 'https://purl.org/pe-repo/ocde/sector',
      value: UNMSM_CODES.SECTOR_OCDE,
    }
  );

  // Categoría del grupo (si existe)
  if (row.grupo_categoria) {
    classifications.push({
      scheme: IDENTIFIER_SCHEMES.ORG_TYPE,
      value: row.grupo_categoria,
    });
  }

  if (classifications.length > 0) {
    orgUnit.classifications = filterEmpty(classifications);
  }

  return orgUnit;
}

/**
 * Obtiene el conteo total de OrgUnits (Facultades + Institutos + Grupos activos)
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

  // +1 por UNMSM root
  return 1 + facultades[0].total + institutos[0].total + grupos[0].total;
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
