import { getHealth } from './handlers/health.js';
import { getRateHistory, getRates } from './handlers/rates.js';
import { postScanMenu, postScanReceipt } from './handlers/scan.js';
import type { Handler } from './http.js';

type Method = 'GET' | 'POST';

/**
 * Every backend endpoint, used by the local development server.
 * On Vercel each endpoint is its own file in /api: when adding one here, add its file there too.
 */
export const routes: Record<string, Partial<Record<Method, Handler>>> = {
  '/api/health': { GET: getHealth },
  '/api/rates': { GET: getRates },
  '/api/rate-history': { GET: getRateHistory },
  '/api/scan-receipt': { POST: postScanReceipt },
  '/api/scan-menu': { POST: postScanMenu },
};
