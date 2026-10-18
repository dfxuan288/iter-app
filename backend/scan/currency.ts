import { MINOR_DIGITS } from '../currencyList.js';

/**
 * The currencies ITER supports and how many decimal places each one's smallest unit has, from
 * backend/currencyList.ts (generated with the app's list, scripts/make-currencies.ts; a test checks they match).
 */
export { MINOR_DIGITS };

export type CurrencyCode = keyof typeof MINOR_DIGITS;

export const CURRENCY_CODES = Object.keys(MINOR_DIGITS) as CurrencyCode[];

export const isCurrency = (value: unknown): value is CurrencyCode => typeof value === 'string' && value in MINOR_DIGITS;

/** Turns an amount as printed (e.g. 247.13 or 9570) into the currency's smallest unit. */
export function toMinor(major: number, currency: CurrencyCode): number {
  return Math.round(major * 10 ** MINOR_DIGITS[currency]);
}

/**
 * Reads a currency the AI wrote down. Accepts codes and the common symbols and words, so "¥",
 * "円" and "yen" all become JPY. Returns null for anything ITER does not support.
 */
export function normalizeCurrency(raw: string | null | undefined): CurrencyCode | null {
  if (!raw) return null;
  const text = raw.trim().toUpperCase();
  if (isCurrency(text)) return text;
  const aliases: Record<string, CurrencyCode> = {
    '¥': 'JPY',
    '円': 'JPY',
    YEN: 'JPY',
    RM: 'MYR',
    RINGGIT: 'MYR',
    '฿': 'THB',
    BAHT: 'THB',
    'S$': 'SGD',
    RP: 'IDR',
    RUPIAH: 'IDR',
    '₫': 'VND',
    DONG: 'VND',
    'US$': 'USD',
    '€': 'EUR',
    '₩': 'KRW',
    '원': 'KRW',
    WON: 'KRW',
    // Currencies of "Somewhere else?" trips, by their usual symbols.
    '£': 'GBP',
    'A$': 'AUD',
    'NZ$': 'NZD',
    'HK$': 'HKD',
    'NT$': 'TWD',
    'C$': 'CAD',
    'CA$': 'CAD',
    'CN¥': 'CNY',
    RMB: 'CNY',
    '₹': 'INR',
    '₱': 'PHP',
    '₺': 'TRY',
    'د.إ': 'AED',
  };
  return aliases[text] ?? null;
}
