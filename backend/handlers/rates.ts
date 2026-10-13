import { loadConfig } from '../config.js';
import { HISTORY_DAYS, historyFromSeries, isQuote, latestFromSeries, loadSeries, supabaseRateStore, type RateSeries } from '../fx/rates.js';
import { errorResponse, json, safely } from '../http.js';

/**
 * Lets Vercel's network answer repeat requests for half an hour without running the function,
 * and keep serving the last answer while a fresh one is fetched.
 */
const CACHE = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' };

async function series(): Promise<RateSeries | Response> {
  const config = loadConfig();
  try {
    return await loadSeries({ store: config.supabase ? supabaseRateStore(config.supabase) : undefined });
  } catch {
    return errorResponse(503, 'rates_unavailable', 'Exchange rates are not available right now. Please try again shortly.');
  }
}

/** GET /api/rates: today's rates against the Ringgit, plus the previous market day's. */
export const getRates = safely(async () => {
  const result = await series();
  if (result instanceof Response) return result;
  return json(latestFromSeries(result), 200, result.stale ? {} : CACHE);
});

/** GET /api/rate-history?quote=JPY&days=30: one currency's rate over the last 7 to 30 days. */
export const getRateHistory = safely(async (request) => {
  const params = new URL(request.url).searchParams;
  const quote = params.get('quote')?.toUpperCase();
  if (!isQuote(quote)) return errorResponse(400, 'bad_request', 'Choose one of the supported currencies with ?quote=.');
  const requested = Number(params.get('days') ?? HISTORY_DAYS);
  const days = Number.isFinite(requested) ? Math.min(HISTORY_DAYS, Math.max(2, Math.round(requested))) : HISTORY_DAYS;

  const result = await series();
  if (result instanceof Response) return result;
  return json(historyFromSeries(result, quote, days), 200, result.stale ? {} : CACHE);
});
