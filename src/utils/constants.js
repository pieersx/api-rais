/**
 * URIs y Vocabularios Controlados para CERIF PeruCRIS
 * Basado en Directrices #PeruCRIS v1.1 (CONCYTEC, Junio 2024)
 */

// Namespaces
export const NAMESPACES = {
  OAI_PMH: 'http://www.openarchives.org/OAI/2.0/',
  OAI_PMH_XSI: 'http://www.w3.org/2001/XMLSchema-instance',
  OAI_PMH_SCHEMA_LOCATION: 'http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd',
  PERUCRIS_CERIF: 'https://purl.org/pe-repo/perucris/cerif',
  CERIF_MODEL: 'https://w3id.org/cerif/model',
};

// Metadata Prefixes soportados
export const METADATA_FORMATS = {
  OAI_DC: {
    metadataPrefix: 'oai_dc',
    schema: 'http://www.openarchives.org/OAI/2.0/oai_dc.xsd',
    metadataNamespace: 'http://www.openarchives.org/OAI/2.0/oai_dc/',
  },
  PERUCRIS_CERIF: {
    metadataPrefix: 'perucris-cerif',
    schema: 'https://purl.org/pe-repo/perucris/cerif.xsd',
    metadataNamespace: 'https://purl.org/pe-repo/perucris/cerif',
  },
};

// Sets disponibles (entidades)
export const SETS = [
  { setSpec: 'persons', setName: 'Personas' },
  { setSpec: 'orgunits', setName: 'Unidades organizativas' },
  { setSpec: 'publications', setName: 'Publicaciones' },
  { setSpec: 'projects', setName: 'Proyectos' },
  { setSpec: 'fundings', setName: 'Financiamientos' },
  { setSpec: 'equipments', setName: 'Equipamientos' },
  { setSpec: 'patents', setName: 'Patentes' },
];

export const LEGACY_SET_ALIASES = {
  funding: 'fundings',
  equipment: 'equipments',
};

export const VALID_SETS = [
  ...SETS.map(s => s.setSpec),
  ...Object.keys(LEGACY_SET_ALIASES),
];

// Verbos OAI-PMH soportados
export const OAI_VERBS = [
  'Identify',
  'ListMetadataFormats',
  'ListSets',
  'ListIdentifiers',
  'ListRecords',
  'GetRecord',
];

// Schemes de identificadores por entidad
export const IDENTIFIER_SCHEMES = {
  // Person
  DNI: 'http://purl.org/pe-repo/concytec/terminos#dni',
  ORCID: 'https://orcid.org',
  RESEARCHER_ID: 'https://w3id.org/cerif/vocab/IdentifierTypes#ResearcherID',
  SCOPUS_AUTHOR_ID: 'https://w3id.org/cerif/vocab/IdentifierTypes#ScopusAuthorID',

  // OrgUnit
  RUC: 'https://purl.org/pe-repo/concytec/terminos#ruc',
  ROR: 'https://ror.org',
  GRID: 'https://www.grid.ac',
  ISNI: 'https://isni.org',
  ORG_TYPE: 'https://purl.org/pe-repo/concytec/tipoOrganizacion',

  // Project
  PROJECT_REFERENCE: 'https://w3id.org/cerif/vocab/IdentifierTypes#ProjectReference',

  // Funding
  AWARD_NUMBER: 'https://w3id.org/cerif/vocab/IdentifierTypes#AwardNumber',
  FUNDREF_ID: 'https://w3id.org/cerif/vocab/IdentifierTypes#FundRefID',

  // Equipment
  CRIS_ID: 'https://w3id.org/cerif/vocab/IdentifierTypes#CRISID',
  SERIAL_NUMBER: 'https://w3id.org/cerif/vocab/IdentifierTypes#SerialNumber',

  // Publication
  DOI: 'https://doi.org',
  HANDLE: 'https://hdl.handle.net',
  ISBN: 'urn:isbn',
  ISSN: 'urn:issn',
  PMCID: 'https://www.ncbi.nlm.nih.gov/pmc',
  ISI_NUMBER: 'https://www.webofscience.com',
  SCP_NUMBER: 'https://www.scopus.com',

  // Patent
  CIP: 'http://data.epo.org/linked-data/def/ipc/',
};

// Vocabularios de clasificacion
export const VOCABULARIES = {
  // Campos OCDE
  OCDE_FORD: 'https://purl.org/pe-repo/ocde/ford',
  OCDE_PROJECT_TYPES: 'https://purl.org/pe-repo/ocde/tipoProyecto',
  OCDE_OCCUPATION_TYPES: 'https://purl.org/pe-repo/ocde/tipoOcupacion',

  // Tipos de publicacion COAR
  COAR_PUBLICATION_TYPES: 'https://www.openaire.eu/cerif-profile/vocab/COAR_Publication_Types',

  // Versiones COAR
  COAR_VERSION: 'http://purl.org/coar/version',

  // Tipos de licencia
  LICENSE_TYPES: 'https://www.openaire.eu/cerif-profile/vocab/LicenseTypes',

  // RENATI
  RENATI_TYPE: 'https://purl.org/pe-repo/renati/type',
  RENATI_LEVEL: 'https://purl.org/pe-repo/renati/level',

  // Programas INEI
  INEI_CPESUTPT: 'https://purl.org/pe-repo/inei/cpesutpt',

  // MeSH
  MESH: 'http://id.nlm.nih.gov/mesh',

  // Access Rights COAR
  COAR_ACCESS_RIGHTS: 'http://purl.org/coar/access_right',

  // OrgUnits PeruCRIS
  ORGUNIT_UBIGEO: 'https://purl.org/pe-repo/inei/ubigeo',
  ORGUNIT_CIIU: 'https://purl.org/pe-repo/inei/ciiu',
  ORGUNIT_SUBTYPE: 'https://purl.org/pe-repo/concytec/tipoSubunidad',
  ORGUNIT_SECTOR_INSTITUTIONAL: 'https://purl.org/pe-repo/ocde/sectorInstitucional',
  ORGUNIT_HIGHER_EDUCATION_TYPE: 'https://purl.org/pe-repo/sunedu/tipoInstitucion',
  ORGUNIT_NATURE: 'https://purl.org/pe-repo/ocde/naturalezaInstitucion',

  // Patente COAR
  COAR_PATENT: 'http://purl.org/coar/resource_type/9DKX-KSAF',

  // Funding types
  OPENAIRE_FUNDING_TYPES: 'https://www.openaire.eu/cerif-profile/vocab/OpenAIRE_Funding_Types',

  // Equipamientos CONCYTEC
  CONCYTEC_EQUIPMENT_TYPES: 'https://purl.org/pe-repo/concytec/equipamiento',

  // Estado de proyecto CONCYTEC
  CONCYTEC_PROJECT_STATUS: 'https://purl.org/pe-repo/concytec/estadoProyecto',
};

// Mapeo de tipos de publicacion a URIs COAR
export const PUBLICATION_TYPE_MAP = {
  'articulo': 'http://purl.org/coar/resource_type/c_6501',        // journal article
  'libro': 'http://purl.org/coar/resource_type/c_2f33',           // book
  'capitulo': 'http://purl.org/coar/resource_type/c_3248',        // book chapter
  'tesis': 'http://purl.org/coar/resource_type/c_db06',           // doctoral thesis
  'tesis-asesoria': 'http://purl.org/coar/resource_type/c_db06',  // doctoral thesis
  'evento': 'http://purl.org/coar/resource_type/c_c94f',          // conference paper
  'ensayo': 'http://purl.org/coar/resource_type/c_dcae04bc',      // review article
  'default': 'http://purl.org/coar/resource_type/c_1843',         // other
};

// Mapeo de genero
export const GENDER_MAP = {
  M: 'm',
  F: 'f',
};

// Mapeo de tipos de patente
export const PATENT_TYPE_MAP = {
  'Patente de invención': 'http://purl.org/coar/resource_type/9DKX-KSAF',
  'Modelo de utilidad': 'http://purl.org/coar/resource_type/9DKX-KSAF',
  'default': 'http://purl.org/coar/resource_type/9DKX-KSAF',
};

// Mapeo de palabras clave a clasificación IPC para patentes
// NOTA: Mantener orden de ESPECÍFICO a GENERAL para evitar coincidencias erradas
export const PATENT_IPC_BY_KEYWORDS = [
  // Electricidad y energía (H02) - MÁS ESPECÍFICO primero
  ['motor eléctrico|generador eléctrico|máquina eléctrica', 'H02K'],
  ['transformador|convertidor|alimentación|rectificador', 'H02M'],
  ['circuito eléctrico|electrónica|semiconductor|diodo|transistor', 'H01L'],
  
  // Construcción y edificación (E04)
  ['construcción|edificio|cemento|concreto|mampostería|estructura', 'E04B'],
  ['techo|cubierta|tejado|losa', 'E04D'],
  
  // Ingeniería mecánica (F16) - MENOS ESPECÍFICO
  ['engranaje|transmisión|acople', 'F16H'],
  ['cojinete|rodamiento|eje|chumacera', 'F16C'],
  ['válvula|grifo|compuerta|llave', 'F16K'],
  ['tubería|conducto|conexión|manguera', 'F16L'],
  ['motor|máquina|mecanismo', 'F16H'], // Genérico - va al final
  
  // Transporte (B62)
  ['bicicleta|motocicleta|mototaxi', 'B62K'],
  ['vehículo|auto|carrocería|chasis|bastidor', 'B62D'],
  ['rueda|llanta|freno', 'B62K'],
  
  // Química y materiales (C01-C08)
  ['aleación|metal|tratamiento térmico', 'C22C'],
  ['plástico|polímero|resina|elastómero', 'C08L'],
  ['composición|compuesto|material|sustancia', 'C01B'],
  
  // Salud y medicina (A61)
  ['medicamento|fármaco|composición farmacéutica|fórmula', 'A61K'],
  ['dispositivo médico|prótesis|implante|catéter', 'A61F'],
  ['diagnóstico|tratamiento|terapia|método quirúrgico', 'A61B'],
  
  // Agricultura (A01)
  ['maquinaria agrícola|tractor|cosechadora|arado', 'A01B'],
  ['cultivo|planta|semilla|fertilizante|abono', 'A01G'],
  
  // Procesamiento de datos (G06)
  ['computadora|software|algoritmo|procesamiento|código', 'G06F'],
  ['sistema de información|base de datos|aplicación', 'G06F'],
  
  // Física e instrumentación (G01)
  ['medición|sensor|detector|instrumento|calibración', 'G01N'],
  ['control|regulación|monitoreo|automatización', 'G05B'],
];

// Acceso a publicaciones (COAR Access Rights)
export const ACCESS_RIGHTS = {
  OPEN_ACCESS: {
    uri: 'http://purl.org/coar/access_right/c_abf2',
    label: 'open access',
  },
  EMBARGOED_ACCESS: {
    uri: 'http://purl.org/coar/access_right/c_f1cf',
    label: 'embargoed access',
  },
  RESTRICTED_ACCESS: {
    uri: 'http://purl.org/coar/access_right/c_16ec',
    label: 'restricted access',
  },
  METADATA_ONLY: {
    uri: 'http://purl.org/coar/access_right/c_14cb',
    label: 'metadata only access',
  },
};

// Identificadores institucionales UNMSM
export const UNMSM_IDENTIFIERS = {
  ROR: 'https://ror.org/026zsd177',
  RUC: '20106897914',
  ISNI: '0000 0001 2107 4242',
  GRID: 'grid.412881.4',
  SCOPUS_AFFILIATION_ID: '60012091',
};

// Códigos geográficos y de clasificación UNMSM
export const UNMSM_CODES = {
  UBIGEO_LIMA: '150000', // Código INEI para Lima
  CIIU_EDUCACION_SUPERIOR: '8530', // CIIU Rev. 4 - Educación universitaria
  SECTOR_OCDE: '09', // Sector OCDE: Educación
};

// Roles en proyectos
export const PROJECT_ROLES = {
  PRINCIPAL_INVESTIGATOR: 'PrincipalInvestigator',
  CONTACT: 'Contact',
  MEMBER: 'Member',
  COORDINATOR: 'Coordinator',
  CONTRACTOR: 'Contractor',
  PARTNER: 'Partner',
};

// Estados de proyecto
export const PROJECT_STATUS = {
  1: 'http://purl.org/cerif/vocab/ProjectStatus#Ongoing',
  2: 'http://purl.org/cerif/vocab/ProjectStatus#Completed',
  0: 'http://purl.org/cerif/vocab/ProjectStatus#Cancelled',
};

export const CONCYTEC_PROJECT_STATUS_MAP = {
  0: `${VOCABULARIES.CONCYTEC_PROJECT_STATUS}#suspendido`,
  1: `${VOCABULARIES.CONCYTEC_PROJECT_STATUS}#activo`,
  2: `${VOCABULARIES.CONCYTEC_PROJECT_STATUS}#concluido`,
};

export const PROJECT_TYPE_OCDE_MAP = {
  PCONFIGI: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  'PCONFIGI-INV': 'https://purl.org/pe-repo/ocde/tipoProyecto#innovacionTecnologica',
  PSINFINV: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionBasica',
  PSINFIPU: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  PICV: 'https://purl.org/pe-repo/ocde/tipoProyecto#innovacionTecnologica',
  PMULTI: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  PINVPOS: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  PFEX: 'https://purl.org/pe-repo/ocde/tipoProyecto#desarrolloExperimental',
  ECI: 'https://purl.org/pe-repo/ocde/tipoProyecto#innovacionTecnologica',
  'PRO-CTIE': 'https://purl.org/pe-repo/ocde/tipoProyecto#innovacionTecnologica',
  PTPGRADO: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  PTPMAEST: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  PTPDOCTO: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
  PTPBACHILLER: 'https://purl.org/pe-repo/ocde/tipoProyecto#investigacionAplicada',
};

export const PROJECT_TYPE_CONCYTEC_MAP = {
  ECI: 'http://purl.org/pe-repo/concytec/terminos#equipamientoCientifico',
};

export const ORGUNIT_TYPE_VALUES = {
  ROOT: 'Institución principal',
  DEPENDENCY: 'Dependencia',
};

export const ORGUNIT_SUBTYPE_VALUES = {
  RESEARCH_UNIT: `${VOCABULARIES.ORGUNIT_SUBTYPE}#unidadDeInvestigacionOInnovacion`,
  RESEARCH_GROUP: `${VOCABULARIES.ORGUNIT_SUBTYPE}#grupoDeInvestigacion`,
  RESEARCH_LINE: `${VOCABULARIES.ORGUNIT_SUBTYPE}#lineaDeInvestigacion`,
};

export const UNMSM_ORGUNIT_TYPED_VALUES = {
  SECTOR: `${VOCABULARIES.ORGUNIT_SECTOR_INSTITUTIONAL}#ensenanzaSuperior`,
  HIGHER_EDUCATION: `${VOCABULARIES.ORGUNIT_HIGHER_EDUCATION_TYPE}#06`,
  NATURE: `${VOCABULARIES.ORGUNIT_NATURE}#publica`,
};

export const FUNDING_TYPE_VALUES = {
  PROGRAMME: `${VOCABULARIES.OPENAIRE_FUNDING_TYPES}#FundingProgramme`,
  CALL: `${VOCABULARIES.OPENAIRE_FUNDING_TYPES}#Call`,
  GRANT: `${VOCABULARIES.OPENAIRE_FUNDING_TYPES}#Grant`,
  INTERNAL: `${VOCABULARIES.OPENAIRE_FUNDING_TYPES}#InternalFunding`,
};

export const EQUIPMENT_TYPE_KEYWORDS = [
  ['centrif', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#centrifugadoras`],
  ['computadora', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#computadorasDeAltoDesempeno`],
  ['servidor', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#computadorasDeAltoDesempeno`],
  ['cromatograf', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#cromatografos`],
  ['drone', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#drones`],
  ['gps', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeGPS`],
  ['ecogra', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeImagenesMedicas`],
  ['tomogra', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeImagenesMedicas`],
  ['resonancia', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeImagenesMedicas`],
  ['rayos x', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeRayosX`],
  ['difract', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeRayosX`],
  ['fluorescencia', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeRayosX`],
  ['espectrom', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#espectrometros`],
  ['microscop', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#microscopios`],
  ['radar', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#radares`],
  ['refriger', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#refrigeradores`],
  ['congelador', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#refrigeradores`],
  ['freezer', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#refrigeradores`],
  ['transceptor', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#transceptores`],
  ['radio', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#transceptores`],
  ['pcr', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#instrumentosBioanaliticos`],
  ['secuenci', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#instrumentosBioanaliticos`],
  ['citomet', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#instrumentosBioanaliticos`],
  ['bioseguridad', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#instrumentosBioanaliticos`],
  ['laminar', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#instrumentosBioanaliticos`],
  ['materiales', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeProcesamientoyEnsayoDeMateriales`],
  ['molienda', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeProcesamientoyEnsayoDeMateriales`],
  ['horno', `${VOCABULARIES.CONCYTEC_EQUIPMENT_TYPES}#equiposDeProcesamientoyEnsayoDeMateriales`],
];

export const PROJECT_MEMBER_OCCUPATION_RULES = [
  ['tesista', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['asesor', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['co-investigador', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['coinvestigador', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['colaborador', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['miembro', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['responsable', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['co responsable', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['coordinador', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#investigadorOInnovadorMiembro`],
  ['tecnico', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#tecnicosYPersonalEquivalente`],
  ['auxiliar', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#personalAuxiliarODeApoyo`],
  ['apoyo', `${VOCABULARIES.OCDE_OCCUPATION_TYPES}#personalAuxiliarODeApoyo`],
];

// Codigos de error OAI-PMH
export const OAI_ERRORS = {
  badVerb: 'The value of the verb argument is not a legal OAI-PMH verb',
  badArgument: 'The request includes illegal arguments or is missing required arguments',
  cannotDisseminateFormat: 'The metadata format is not supported by this repository',
  idDoesNotExist: 'The identifier does not exist in this repository',
  noRecordsMatch: 'No records match the request criteria',
  noSetHierarchy: 'The repository does not support sets or the set does not exist',
  badResumptionToken: 'The resumption token is invalid or has expired',
};
