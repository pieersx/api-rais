import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Servidor
  PORT: z.string().default('3000').transform(Number),

  // Base de datos MySQL
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('3306').transform(Number),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  // URL base del repositorio OAI
  BASE_URL: z.string().url(),

  // Paginacion
  PAGE_SIZE: z.string().default('100').transform(Number),

  // Admin email del repositorio
  ADMIN_EMAIL: z.string().email(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Extraer dominio OAI del BASE_URL
const urlObj = new URL(env.BASE_URL);
export const OAI_DOMAIN = urlObj.hostname;

// Configuración del repositorio
export const REPOSITORY_CONFIG = {
  repositoryName: 'RAIS (Registro de Actividades de Investigación San Marcos)',
  baseURL: env.BASE_URL,
  protocolVersion: '2.0',
  adminEmail: env.ADMIN_EMAIL,
  earliestDatestamp: '2014-01-01T00:00:00Z',
  deletedRecord: 'persistent',
  granularity: 'YYYY-MM-DDThh:mm:ssZ',
};
