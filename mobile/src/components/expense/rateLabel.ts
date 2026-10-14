import { formatFullDate } from '@/domain/dates';
import type { CurrencyCode } from '@/domain/money';
import { rateDateFor, type RatesSnapshot } from '@/services/fxService';

/**
 * How the age of an exchange rate is described to the user (brief §9.7): a live rate is simply
 * dated, anything else is called "Indicative" so nobody mistakes it for today's rate.
 */
export function rateLabel(snapshot: Pick<RatesSnapshot, 'origin' | 'date' | 'dates'>, currency: CurrencyCode): string {
  const date = formatFullDate(rateDateFor(snapshot, currency));
  return snapshot.origin === 'live' ? `Rate from ${date}` : `Indicative rate · ${date}`;
}
