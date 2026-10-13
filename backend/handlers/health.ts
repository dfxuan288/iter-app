import { loadConfig, type Config } from '../config.js';
import { json, safely } from '../http.js';

export const SERVICE_NAME = 'iter-api';
export const SERVICE_VERSION = '0.2.0';

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  time: string;
  /** True when an AI key is present on the server. The key itself is never returned. */
  aiConfigured: boolean;
  platform: Config['platform'];
}

export function healthBody(config: Config, now: Date = new Date()): HealthResponse {
  return {
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    time: now.toISOString(),
    aiConfigured: config.anthropicApiKey !== undefined,
    platform: config.platform,
  };
}

/** GET /api/health: lets the app check that the backend is reachable. */
export const getHealth = safely(() => json(healthBody(loadConfig())));
