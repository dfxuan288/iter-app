import { z } from 'zod';

const envSchema = z.object({
  /** Server-side only. Never sent to the app. Needed from the scanning phase onwards. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Set automatically by Vercel on deployed functions. */
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

export interface Config {
  anthropicApiKey: string | undefined;
  /** Where the backend is running. */
  platform: 'vercel' | 'local';
}

/**
 * Reads the backend's settings from environment variables: Vercel's project settings when
 * deployed, or the local .env file during development.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid backend configuration (check the environment variables): ${problems}`);
  }
  const key = parsed.data.ANTHROPIC_API_KEY?.trim();
  return {
    anthropicApiKey: key ? key : undefined,
    platform: parsed.data.VERCEL_ENV ? 'vercel' : 'local',
  };
}
