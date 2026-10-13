import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  const shutdown = (signal: string): void => {
    app.log.info(`${signal} received, shutting down`);
    void app.close().then(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 0.0.0.0 so the server is reachable from outside its Docker container.
  await app.listen({ port: config.port, host: '0.0.0.0' });
  if (!config.anthropicApiKey) {
    app.log.warn('ANTHROPIC_API_KEY is not set: AI scanning will not work until it is added to .env');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
