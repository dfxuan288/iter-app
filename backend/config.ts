import { z } from 'zod';

const envSchema = z.object({
  /** Server-side only. Never sent to the app. Needed from the scanning phase onwards. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** The Supabase project's address, e.g. https://abcd1234.supabase.co */
  SUPABASE_URL: z.string().optional(),
  /** Supabase secret (service role) key. Server-side only: it can read and write every table. */
  SUPABASE_SECRET_KEY: z.string().optional(),
  /** Set automatically by Vercel on deployed functions. */
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

export interface SupabaseConfig {
  url: string;
  secretKey: string;
}

export interface Config {
  anthropicApiKey: string | undefined;
  /** Undefined until both Supabase settings are present. The backend still works without it. */
  supabase: SupabaseConfig | undefined;
  /** Where the backend is running. */
  platform: 'vercel' | 'local';
}

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

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
  const url = clean(parsed.data.SUPABASE_URL)?.replace(/\/+$/, '');
  const secretKey = clean(parsed.data.SUPABASE_SECRET_KEY);
  return {
    anthropicApiKey: clean(parsed.data.ANTHROPIC_API_KEY),
    supabase: url && secretKey ? { url, secretKey } : undefined,
    platform: parsed.data.VERCEL_ENV ? 'vercel' : 'local',
  };
}
