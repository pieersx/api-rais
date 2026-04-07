# INFORME - MARZO 2026

**A:** Dr. Jose Segundo Nino Montero  
**DE:** [Tu nombre completo]  
**ASUNTO:** Informe de actividades realizadas como bolsista  
**FECHA:** Lima, marzo de 2026  

Me dirijo a usted para saludarlo cordialmente y, a la vez, informar las actividades realizadas durante el mes de marzo del presente ano, en la modalidad de bolsista para la Oficina del Registro de Actividades de Investigacion San Marcos (RAIS) - Direccion de Prospectiva y Gestion de la Investigacion del Vicerrectorado de Investigacion y Posgrado, conforme se detalla a continuacion:

1. Revision de documentacion tecnica y analisis de estandares para la interoperabilidad del sistema RAIS.
2. Diseno de la arquitectura base de la API para la exposicion de metadatos.
3. Configuracion del entorno de desarrollo con Node.js, Express, MySQL, Zod y pnpm.
4. Implementacion de la estructura modular inicial del proyecto.
5. Desarrollo preliminar de rutas, validaciones y servicios OAI-PMH.
6. Ejecucion de pruebas manuales iniciales del sistema.

**[Tu nombre completo]**  
**DNI:** [Tu DNI] - **Codigo:** [Tu codigo]

## SUSTENTO

### 1. Revision de documentacion tecnica y analisis de estandares

Durante el mes de marzo realice la revision de la documentacion tecnica vinculada al protocolo OAI-PMH 2.0 y al perfil PeruCRIS CERIF 1.1. Esta actividad permitio definir los lineamientos necesarios para orientar el desarrollo de la API del sistema RAIS. Asimismo, se identificaron las entidades principales que deben exponerse mediante el servicio. Este analisis sirvio como base para organizar el trabajo tecnico posterior. Se considero esta etapa como un avance inicial indispensable para asegurar compatibilidad e interoperabilidad.

**Evidencia sugerida 1:** captura de `README.md`, `Directrices_PeruCRIS_v1.1.pdf` o `Guia-para-creacion-apis-json.md`.

### 2. Diseno de la arquitectura base de la API

Se definio una arquitectura modular para organizar la API de manera ordenada y escalable. Para ello, se separaron responsabilidades en configuracion, rutas, middleware, servicios, repositorios, esquemas y utilidades. Esta estructura facilita el mantenimiento del sistema y permite incorporar nuevas funcionalidades sin alterar la base ya implementada. Ademas, la arquitectura contempla validacion de parametros, manejo de errores y futura paginacion mediante resumptionToken. Este avance corresponde a la etapa de organizacion tecnica del proyecto.

**Evidencia sugerida 2:** captura de la estructura de carpetas dentro de `src/`.

### 3. Configuracion del entorno de desarrollo

Se preparo el entorno de desarrollo del proyecto utilizando Node.js como base de ejecucion, Express para el servicio HTTP, mysql2 para la conexion a base de datos, Zod para validaciones y pnpm para la gestion de dependencias. Asimismo, se configuraron archivos principales como `package.json`, variables de entorno y scripts de ejecucion. Esto permitio dejar lista la base tecnica necesaria para continuar con la implementacion. La configuracion realizada asegura un entorno estable para el desarrollo progresivo de la API. Esta actividad marca el inicio formal de la construccion del sistema.

**Evidencia sugerida 3:** captura de `package.json`, `.env.example` o del proyecto ejecutandose.

### 4. Implementacion de la estructura modular inicial del proyecto

Como parte del avance del mes, se implemento la base estructural del sistema dentro de la carpeta `src`. Se organizo el proyecto por componentes para facilitar la integracion entre servidor, rutas, validaciones, servicios y acceso a datos. Tambien se implemento el archivo principal del servidor, incluyendo la ruta de verificacion de estado y el endpoint principal de la API. Esta base ya permite comprobar el funcionamiento general de la aplicacion. Por ello, representa un avance funcional y no solo una propuesta teorica.

**Evidencia sugerida 4:** captura de `src/index.js` o del proyecto abierto en el editor.

### 5. Desarrollo preliminar de rutas, validaciones y servicios OAI-PMH

Se avanzo en la implementacion de la ruta principal destinada a procesar solicitudes OAI-PMH. En esta etapa se trabajo de forma preliminar con verbos como `Identify`, `ListMetadataFormats`, `ListSets`, `ListIdentifiers`, `ListRecords` y `GetRecord`. Tambien se incorporaron validaciones de parametros y mecanismos iniciales de manejo de errores. Estas funciones constituyen el nucleo principal de la API y permiten encaminar el desarrollo hacia una version mas completa. El trabajo realizado en marzo corresponde a una fase de implementacion parcial y progresiva.

**Evidencia sugerida 5:** captura de `src/routes/oai.routes.js` o de una respuesta de `http://localhost:3000/oai?verb=Identify`.

### 6. Ejecucion de pruebas manuales iniciales del sistema

Durante el desarrollo se realizaron pruebas manuales iniciales para verificar el arranque del servidor y la respuesta de los endpoints principales. Estas pruebas permitieron revisar la estructura de las respuestas JSON, la recepcion de parametros y el flujo entre rutas, middleware y servicios. Asimismo, ayudaron a detectar puntos de mejora que deberan ajustarse en los siguientes meses. El objetivo de esta etapa fue validar el comportamiento general del sistema en una fase temprana. De esta manera, se asegura una evolucion ordenada del proyecto.

**Evidencia sugerida 6:** captura de `api.http`, `http://localhost:3000/health` o pruebas ejecutadas sobre la API.

## RESULTADOS OBTENIDOS

- Se reviso y organizo la documentacion tecnica necesaria para el desarrollo del proyecto.
- Se definio una arquitectura modular para la API RAIS.
- Se configuro el entorno de desarrollo con las tecnologias principales.
- Se implemento la estructura base del sistema y sus componentes iniciales.
- Se avanzo en rutas, validaciones y servicios del protocolo OAI-PMH.
- Se realizaron pruebas manuales preliminares de funcionamiento.

## CONCLUSIONES

Durante el mes de marzo se logro un avance importante en la base conceptual y tecnica de la API para el sistema RAIS. Las actividades realizadas permitieron organizar el proyecto, configurar el entorno e iniciar la implementacion funcional del servicio. En ese sentido, el trabajo desarrollado corresponde a una primera etapa de avance progresivo y verificable. Esta base permitira continuar en los siguientes meses con la integracion de datos, el refinamiento de metadatos y la consolidacion final del sistema.

## NOTAS PARA PERSONALIZAR

- Reemplaza `[Tu nombre completo]`, `[Tu DNI]` y `[Tu codigo]`.
- Inserta una imagen debajo de cada sustento para completar las 6 paginas.
- Agrega debajo de cada captura una leyenda corta, por ejemplo: `Figura 1. Estructura inicial del proyecto RAIS-API`.
