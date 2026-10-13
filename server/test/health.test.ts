import { afterEach, describe, expect, it } from 'vitest';

import { buildApp, type HealthResponse } from '../src/app.js';
import { loadConfig } from '../src/config.js';

describe('GET /api/health', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  async function start(env: Record<string, string>) {
    const app = await buildApp(loadConfig({ NODE_ENV: 'test', ...env }));
    close = () => app.close();
    return app;
  }

  it('reports ok and that AI is not configured when no key is set', async () => {
    const app = await start({});
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json<HealthResponse>();
    expect(body.status).toBe('ok');
    expect(body.aiConfigured).toBe(false);
  });

  it('reports AI as configured without ever returning the key', async () => {
    const app = await start({ ANTHROPIC_API_KEY: 'test-key-value' });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.json<HealthResponse>().aiConfigured).toBe(true);
    expect(res.body).not.toContain('test-key-value');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const app = await start({});
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: 'not_found' });
  });
});

describe('loadConfig', () => {
  it('uses safe defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(8080);
    expect(config.corsOrigins).toBe('*');
    expect(config.anthropicApiKey).toBeUndefined();
  });

  it('parses a list of allowed origins', () => {
    const config = loadConfig({ CORS_ORIGIN: 'https://a.example, https://b.example' });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
  });

  it('treats a blank key as missing', () => {
    expect(loadConfig({ ANTHROPIC_API_KEY: '   ' }).anthropicApiKey).toBeUndefined();
  });

  it('rejects an invalid port with a readable message', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid server configuration/);
  });
});
