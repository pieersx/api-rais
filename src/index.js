import express from 'express'
import { env } from './config/env.js'
import { oaiErrorHandler } from './middleware/errorHandler.js'
import oaiRoutes from './routes/oai.routes.js'

const app = express()

// Middleware basico
app.use(express.json())

// Headers para JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  next()
})

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rutas OAI-PMH
app.use('/oai', oaiRoutes)

// Ruta raiz con info
app.get('/', (req, res) => {
  res.json({
    name: 'RAIS-API',
    description: 'OAI-PMH 2.0 API con perfil CERIF PeruCRIS',
    version: '1.0.0',
    protocol: 'OAI-PMH 2.0',
    metadataPrefix: 'perucris-cerif',
    endpoints: {
      oai: '/oai',
      health: '/health',
    },
    documentation: 'https://purl.org/pe-repo/perucris/cerif',
    sets: ['persons', 'orgunits', 'publications', 'projects', 'patents'],
  })
})

// Manejo de errores
app.use(oaiErrorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    hint: 'Use /oai endpoint for OAI-PMH requests',
  })
})

// Iniciar servidor
const PORT = env.PORT
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      RAIS-API v1.0.0                      ║
╠═══════════════════════════════════════════════════════════╣
║  Protocol:     OAI-PMH 2.0                                ║
║  Format:       CERIF JSON (PeruCRIS)                      ║
║  Namespace:    https://purl.org/pe-repo/perucris/cerif    ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                   ║
║  OAI endpoint: http://localhost:${PORT}/oai                   ║
╚═══════════════════════════════════════════════════════════╝
  `)
})

export default app
