import pool from '../config/database.js'
import { env } from '../config/env.js'
import { NAMESPACES, PATENT_TYPE_MAP } from '../utils/constants.js'
import {
  buildDateFilter,
  createSchemeValueEntry,
  createTextValueEntry,
  filterEmpty,
  inferIPCClassification,
  normalizeOrcidToken,
  toCerifId,
  toISO8601,
  toOAIIdentifier,
} from '../utils/formatters.js'

const ENTITY_TYPE = 'Patents'
const PATENT_ELIGIBILITY_SQL = `
  p.estado = 1
  AND TRIM(COALESCE(p.nro_registro, '')) <> ''
  AND TRIM(COALESCE(p.titulo, '')) <> ''
  AND p.updated_at IS NOT NULL
`

function normalizeOrcid(orcid) {
  return normalizeOrcidToken(orcid)
}

function buildPatentHeader(row) {
  const header = {
    identifier: toOAIIdentifier(ENTITY_TYPE, row.id),
    setSpec: 'patents',
  }

  const datestamp = toISO8601(row.updated_at)
  if (datestamp) {
    header.datestamp = datestamp
  }

  return header
}

function normalizeAbstractPart(value) {
  const text = String(value || '').trim()
  if (!text) return null

  return text.replace(/[.\s]+$/u, '')
}

function mapToCerif(row, inventors = [], holders = []) {
  const typeUri = PATENT_TYPE_MAP[row.tipo] || PATENT_TYPE_MAP.default
  const ipcClassification = inferIPCClassification(row)
  const lastModified = toISO8601(row.updated_at)
  const title = filterEmpty([createTextValueEntry(row.titulo, 'es')])
  const patentNumber = String(row.nro_registro || '').trim()
  const abstractParts = []

  const patent = {
    '@id': toCerifId(ENTITY_TYPE, row.id),
    '@xmlns': NAMESPACES.PERUCRIS_CERIF,
    Type: typeUri,
    Subject: [
      {
        Scheme: ipcClassification.scheme,
        Value: ipcClassification.value,
      },
    ],
    CountryCode: 'PE',
  }

  if (patentNumber) {
    patent.PatentNumber = patentNumber
  }

  if (title.length > 0) {
    patent.Title = title
  }

  if (lastModified) {
    patent.LastModified = lastModified
  }

  if (inventors.length > 0) {
    patent.Inventors = {
      Inventor: inventors.map((inventor) => {
        const fullName = [
          inventor.nombres,
          inventor.apellido1,
          inventor.apellido2,
        ]
          .filter(Boolean)
          .join(' ')
          .trim()

        const person = {
          PersonName: {
            FullName: fullName,
          },
        }

        if (inventor.investigador_id) {
          person.id = toCerifId('Persons', inventor.investigador_id)
        }

        const identifiers = []
        if (inventor.doc_numero) {
          identifiers.push(
            createSchemeValueEntry(
              'http://purl.org/pe-repo/concytec/terminos#dni',
              inventor.doc_numero
            )
          )
        }
        if (inventor.codigo_orcid) {
          identifiers.push(
            createSchemeValueEntry(
              'https://orcid.org',
              normalizeOrcid(inventor.codigo_orcid)
            )
          )
        }

        const filteredIdentifiers = filterEmpty(identifiers)
        if (filteredIdentifiers.length > 0) {
          person.Identifier = filteredIdentifiers
        }

        return { Person: person }
      }),
    }
  }

  const holderItems = []
  holderItems.push(
    ...holders.map((holder) => ({
      OrgUnit: {
        Name: filterEmpty([createTextValueEntry(holder.titular, 'es')]),
      },
    }))
  )

  if (row.titular1)
    holderItems.push({
      OrgUnit: {
        Name: filterEmpty([createTextValueEntry(row.titular1, 'es')]),
      },
    })
  if (row.titular2)
    holderItems.push({
      OrgUnit: {
        Name: filterEmpty([createTextValueEntry(row.titular2, 'es')]),
      },
    })

  if (holderItems.length > 0) {
    patent.Holders = {
      Holder: holderItems,
    }
  }

  patent.Issuer = {
    OrgUnit: {
      Acronym: 'INDECOPI',
      Name: filterEmpty([
        createTextValueEntry(
          'Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual',
          'es'
        ),
      ]),
    },
  }

  if (row.fecha_presentacion) {
    patent.RegistrationDate =
      row.fecha_presentacion instanceof Date
        ? row.fecha_presentacion.toISOString().split('T')[0]
        : row.fecha_presentacion
  }

  const comment = normalizeAbstractPart(row.comentario)
  if (comment) {
    abstractParts.push(comment)
  }

  if (row.enlace) {
    patent.URL = row.enlace
  }

  if (row.nro_expediente) {
    abstractParts.push(`Expediente: ${String(row.nro_expediente).trim()}`)
  }

  if (abstractParts.length > 0) {
    patent.Abstract = filterEmpty([
      createTextValueEntry(abstractParts.join('. '), 'es'),
    ])
  }

  return patent
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
  )

  const [holders] = await pool.query(
    `
      SELECT titular
      FROM Patente_entidad
      WHERE patente_id = ?
      ORDER BY id
    `,
    [patentId]
  )

  const mappedInventors = inventors.map((inventor) => ({
    ...inventor,
    nombres: inventor.nombres || inventor.ui_nombres,
    apellido1: inventor.apellido1 || inventor.ui_apellido1,
    apellido2: inventor.apellido2 || inventor.ui_apellido2,
  }))

  return {
    inventors: mappedInventors,
    holders,
  }
}

/**
 * Obtiene el conteo total de patentes activas
 * @param {string} from
 * @param {string} until
 * @returns {Promise<number>}
 */
export async function countPatents(from, until) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at')

  let query = `SELECT COUNT(*) as total FROM Patente p WHERE ${PATENT_ELIGIBILITY_SQL}`

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`
  }

  const [rows] = await pool.query(query, dateFilter.params)
  return rows[0].total
}

/**
 * Obtiene patentes con paginacion
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPatents({
  from,
  until,
  offset = 0,
  limit = env.PAGE_SIZE,
}) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at')

  let query = `
    SELECT p.*
    FROM Patente p
    WHERE ${PATENT_ELIGIBILITY_SQL}
  `

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?'

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset])

  const results = []
  for (const row of rows) {
    const context = await getPatentContext(row.id)

    results.push({
      header: buildPatentHeader(row),
      metadata: {
        Patent: mapToCerif(row, context.inventors, context.holders),
      },
    })
  }

  return results
}

/**
 * Obtiene solo headers de patentes (para ListIdentifiers)
 * @param {object} options
 * @returns {Promise<Array>}
 */
export async function getPatentHeaders({
  from,
  until,
  offset = 0,
  limit = env.PAGE_SIZE,
}) {
  const dateFilter = buildDateFilter(from, until, 'p.updated_at')

  let query = `
    SELECT p.id, p.updated_at
    FROM Patente p
    WHERE ${PATENT_ELIGIBILITY_SQL}
  `

  if (dateFilter.clause) {
    query += ` AND ${dateFilter.clause}`
  }

  query += ' ORDER BY p.id LIMIT ? OFFSET ?'

  const [rows] = await pool.query(query, [...dateFilter.params, limit, offset])

  return rows.map((row) => buildPatentHeader(row))
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
        AND ${PATENT_ELIGIBILITY_SQL}
    `,
    [id]
  )

  if (rows.length === 0) {
    return null
  }

  const row = rows[0]
  const context = await getPatentContext(row.id)

  return {
    header: buildPatentHeader(row),
    metadata: {
      Patent: mapToCerif(row, context.inventors, context.holders),
    },
  }
}
