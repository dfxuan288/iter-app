import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';
import { route } from '../dev-server.js';
import { getHealth, healthBody, type HealthResponse } from '../handlers/health.js';
import { safely } from '../http.js';
import { routes } from '../routes.js';

describe('loadConfig', () => {
  it('runs locally with no key by default', () => {
    expect(loadConfig({})).toEqual({ anthropicApiKey: undefined, platform: 'local' });
  });

  it('recognises Vercel and reads the key', () => {
    const config = loadConfig({ VERCEL_ENV: 'production', ANTHROPIC_API_KEY: ' test-key-value ' });
    expect(config).toEqual({ anthropicApiKey: 'test-key-value', platform: 'vercel' });
  });

  it('treats a blank key as missing', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: '   ' }).anthropicApiKey).toBeUndefined();
  });
});

describe('GET /api/health', () => {
  it('reports ok as JSON that is never cached', async () => {
    const response = await getHealth(new Request('http://localhost/api/health'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as HealthResponse;
    expect(body.status).toBe('ok');
    expect(body.service).toBe('iter-api');
  });

  it('says whether AI is configured without ever returning the key', () => {
    const body = healthBody(loadConfig({ ANTHROPIC_API_KEY: 'test-key-value' }));
    expect(body.aiConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain('test-key-value');
    expect(healthBody(loadConfig({})).aiConfigured).toBe(false);
  });
});

describe('routing', () => {
  it('answers a known endpoint', async () => {
    expect((await route(new Request('http://localhost/api/health'))).status).toBe(200);
  });

  it('returns a JSON 404 for an unknown endpoint', async () => {
    const response = await route(new Request('http://localhost/api/nope'));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: 'not_found' });
  });

  it('returns 405 for a method the endpoint does not support', async () => {
    const response = await route(new Request('http://localhost/api/health', { method: 'POST' }));
    expect(response.status).toBe(405);
  });

  it('has a Vercel file in /api for every endpoint in the route table', () => {
    const files = readdirSync(new URL('../../api', import.meta.url)).map((name) => `/api/${name.replace(/\.ts$/, '')}`);
    expect(files.sort()).toEqual(Object.keys(routes).sort());
  });
});

describe('safely', () => {
  it('turns an unexpected failure into a JSON 500 without leaking the details', async () => {
    const handler = safely(() => {
      throw new Error('database password is hunter2');
    });
    const response = await handler(new Request('http://localhost/api/boom'));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toContain('server_error');
    expect(text).not.toContain('hunter2');
  });
});
