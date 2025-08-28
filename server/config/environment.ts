import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.string().transform(Number).default('2'),
  CORS_ORIGIN: z.string().optional(),
});

// Validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  process.exit(1);
}

export const config = {
  ...env,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

export default config;