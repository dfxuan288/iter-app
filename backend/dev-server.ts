import { createServer } from 'node:http';

import { errorResponse } from './http.js';
import { routes } from './routes.js';

/**
 * Runs the backend on your own computer (`npm run dev:api`). It calls exactly the same
 * handlers Vercel runs, so what works here works when deployed. Not used in production.
 */

const PORT = Number(process.env.PORT ?? 8080);
/** Matches Vercel's limit on request size, so an oversized upload fails here too. */
const MAX_BODY_BYTES = 4.5 * 1024 * 1024;

// During development the app is served from another port, so the browser needs permission to call this one.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
};

export async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const endpoint = routes[pathname];
  if (!endpoint) return errorResponse(404, 'not_found', 'No such endpoint.');
  const handler = endpoint[request.method as 'GET' | 'POST'];
  if (!handler) return errorResponse(405, 'method_not_allowed', `${request.method} is not supported here.`);
  return handler(request);
}

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  let size = 0;
  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size <= MAX_BODY_BYTES) chunks.push(chunk);
  });
  req.on('end', () => {
    void (async () => {
      const method = req.method ?? 'GET';
      let response: Response;
      if (method === 'OPTIONS') {
        response = new Response(null, { status: 204 });
      } else if (size > MAX_BODY_BYTES) {
        response = errorResponse(413, 'too_large', 'That upload is too large.');
      } else {
        const headers = new Headers();
        for (const [name, value] of Object.entries(req.headers)) {
          if (typeof value === 'string') headers.set(name, value);
        }
        const hasBody = method !== 'GET' && method !== 'HEAD' && size > 0;
        const request = new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
          method,
          headers,
          body: hasBody ? Buffer.concat(chunks) : undefined,
        });
        response = await route(request);
      }
      res.writeHead(response.status, { ...Object.fromEntries(response.headers), ...corsHeaders });
      res.end(Buffer.from(await response.arrayBuffer()));
      console.log(`${method} ${req.url} -> ${response.status}`);
    })();
  });
});

// Only start listening when run directly, so tests can import `route` without opening a port.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('backend/dev-server.ts')) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ITER backend running at http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY is not set: AI scanning will not work until it is added to .env');
    }
  });
}
