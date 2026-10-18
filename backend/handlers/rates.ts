import { loadConfig } from '../config.js';
import {
  HISTORY_DAYS,
  historyFromSeries,
  isFeatured,
  isQuote,
  latestFromSeries,
  loadSeries,
  QUOTES,
  supabaseRateStore,
  type Quote,
  type RateSeries,
} from '../fx/rates.js';
import { errorResponse, json, safely } from '../http.js';

/**
 * Lets Vercel's network answer repeat requests for half an hour without running the function,
 * and keep serving the last answer while a fresh one is fetched.
 */
const CACHE = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' };

/** The featured currencies together, or one other currency on its own. */
async function series(quotes: readonly Quote[] = QUOTES): Promise<RateSeries | Response> {
  const config = loadConfig();
  try {
    return await loadSeries({ quotes, store: config.supabase ? supabaseRateStore(config.supabase) : undefined });
  } catch {
    return errorResponse(503, 'rates_unavailable', 'Exchange rates are not available right now. Please try again shortly.');
  }
}

/**
 * GET /api/rates: today's rates against the Ringgit, plus the previous market day's.
 * GET /api/rates?extra=GBP also includes one more currency (a trip to a country outside the featured list).
 * If that one currency cannot be fetched, the featured rates are still returned without it.
 */
export const getRates = safely(async (request) => {
  const extra = new URL(request.url).searchParams.get('extra')?.toUpperCase();
  const result = await series();
  if (result instanceof Response) return result;
  const latest = latestFromSeries(result);
  if (isQuote(extra) && !isFeatured(extra)) {
    const own = await series([extra]);
    if (!(own instanceof Response)) {
      try {
        const extraLatest = latestFromSeries(own, [extra]);
        latest.rates[extra] = extraLatest.rates[extra];
        latest.dates[extra] = extraLatest.dates[extra];
        const before = extraLatest.previous?.rates[extra];
        if (latest.previous && before !== undefined) latest.previous.rates[extra] = before;
      } catch {
        // No rate for this currency right now: the featured rates still go out.
      }
    }
  }
  const stale = result.stale;
  return json(latest, 200, stale ? {} : CACHE);
});

/** GET /api/rate-history?quote=JPY&days=30: one currency's rate over the last 7 to 30 days. */
export const getRateHistory = safely(async (request) => {
  const params = new URL(request.url).searchParams;
  const quote = params.get('quote')?.toUpperCase();
  if (!isQuote(quote)) return errorResponse(400, 'bad_request', 'Choose one of the supported currencies with ?quote=.');
  const requested = Number(params.get('days') ?? HISTORY_DAYS);
  const days = Number.isFinite(requested) ? Math.min(HISTORY_DAYS, Math.max(2, Math.round(requested))) : HISTORY_DAYS;

  const result = await series(isFeatured(quote) ? QUOTES : [quote]);
  if (result instanceof Response) return result;
  return json(historyFromSeries(result, quote, days), 200, result.stale ? {} : CACHE);
});
