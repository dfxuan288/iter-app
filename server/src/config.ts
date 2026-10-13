import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  /** Comma-separated list of web origins allowed to call the API, or "*" for any. */
  CORS_ORIGIN: z.string().default('*'),
  /** Server-side only. Never sent to the app. Needed from the scanning phase onwards. */
  ANTHROPIC_API_KEY: z.string().optional(),
});

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigins: string[] | '*';
  anthropicApiKey: string | undefined;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid server configuration (check your .env file): ${problems}`);
  }
  const { NODE_ENV, PORT, CORS_ORIGIN, ANTHROPIC_API_KEY } = parsed.data;
  const origins = CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const key = ANTHROPIC_API_KEY?.trim();
  return {
    nodeEnv: NODE_ENV,
    port: PORT,
    corsOrigins: origins.length === 0 || origins.includes('*') ? '*' : origins,
    anthropicApiKey: key ? key : undefined,
  };
}
