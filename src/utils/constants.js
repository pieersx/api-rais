/**
 * URIs y Vocabularios Controlados para CERIF PeruCRIS
 * Basado en Directrices #PeruCRIS v1.1 (CONCYTEC, Junio 2024)
 */

// Namespaces
export const NAMESPACES = {
  OAI_PMH: 'http://www.openarchives.org/OAI/2.0/',
  PERUCRIS_CERIF: 'https://purl.org/pe-repo/perucris/cerif',
  CERIF_MODEL: 'https://w3id.org/cerif/model',
};

// Metadata Prefixes soportados
export const METADATA_FORMATS = {
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
  { setSpec: 'patents', setName: 'Patentes' },
];

export const VALID_SETS = SETS.map(s => s.setSpec);

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

  // Patente COAR
  COAR_PATENT: 'http://purl.org/coar/resource_type/9DKX-KSAF',
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
  'M': 'https://w3id.org/cerif/vocab/Genders#Male',
  'F': 'https://w3id.org/cerif/vocab/Genders#Female',
};

// Mapeo de tipos de patente
export const PATENT_TYPE_MAP = {
  'Patente de invención': 'http://purl.org/coar/resource_type/9DKX-KSAF',
  'Modelo de utilidad': 'http://purl.org/coar/resource_type/9DKX-KSAF',
  'default': 'http://purl.org/coar/resource_type/9DKX-KSAF',
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
