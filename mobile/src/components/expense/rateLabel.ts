import { formatFullDate } from '@/domain/dates';
import type { RatesSnapshot } from '@/services/fxService';

/**
 * How the age of an exchange rate is described to the user (brief §9.7): a live rate is simply
 * dated, anything else is called "Indicative" so nobody mistakes it for today's rate.
 */
export function rateLabel(snapshot: Pick<RatesSnapshot, 'origin' | 'date'>): string {
  const date = formatFullDate(snapshot.date);
  return snapshot.origin === 'live' ? `Rate from ${date}` : `Indicative rate · ${date}`;
}
