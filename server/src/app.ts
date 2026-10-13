import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import type { Config } from './config.js';

export const SERVICE_NAME = 'iter-server';
export const SERVICE_VERSION = '0.1.0';

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  time: string;
  /** True when an AI key is present on the server. The key itself is never returned. */
  aiConfigured: boolean;
}

/** The HTTP status carried by a request error (e.g. 400 for bad JSON), if it has a valid one. */
function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined;
  const { statusCode } = error;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600 ? statusCode : undefined;
}

export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.nodeEnv === 'test' ? false : { level: 'info' },
    // Receipt photos are resized by the app before upload; this is the hard ceiling.
    bodyLimit: 8 * 1024 * 1024,
  });

  await app.register(cors, { origin: config.corsOrigins === '*' ? true : config.corsOrigins });

  app.get('/api/health', async (): Promise<HealthResponse> => ({
    status: 'ok',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    time: new Date().toISOString(),
    aiConfigured: config.anthropicApiKey !== undefined,
  }));

  app.setNotFoundHandler((_request, reply) => {
    void reply.code(404).send({ error: 'not_found', message: 'No such endpoint.' });
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    request.log.error(error);
    const statusCode = clientErrorStatus(error) ?? 500;
    void reply.code(statusCode).send({
      error: statusCode >= 500 ? 'server_error' : 'bad_request',
      message: statusCode >= 500 || !(error instanceof Error) ? 'Something went wrong on the server.' : error.message,
    });
  });

  return app;
}
