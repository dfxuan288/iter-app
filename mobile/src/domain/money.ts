/**
 * Money maths. Every amount in the app is an integer in the currency's smallest unit
 * (sen for MYR, whole yen for JPY), stored next to its currency. Nothing here uses AI:
 * the AI only reads receipts, this code does the calculating.
 */

export type CurrencyCode = 'MYR' | 'JPY' | 'THB' | 'SGD' | 'IDR' | 'VND' | 'USD' | 'EUR' | 'KRW';

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  /** How many decimal places the smallest unit represents: 2 means cents or sen, 0 means none. */
  minorDigits: 0 | 2;
}

export const currencies: Record<CurrencyCode, CurrencyInfo> = {
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', minorDigits: 2 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', minorDigits: 0 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', minorDigits: 2 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorDigits: 2 },
  // Rupiah and dong have no coins in everyday use, so they are handled as whole units.
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', minorDigits: 0 },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', minorDigits: 0 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', minorDigits: 2 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', minorDigits: 2 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', minorDigits: 0 },
};

export const HOME_CURRENCY: CurrencyCode = 'MYR';

function minorPerMajor(currency: CurrencyCode): number {
  return 10 ** currencies[currency].minorDigits;
}

/** Turns whole units into the smallest unit, e.g. RM 4,200 into 420000 sen. */
export function toMinor(major: number, currency: CurrencyCode): number {
  return Math.round(major * minorPerMajor(currency));
}

export interface FormatMoneyOptions {
  /** Drop ".00" from whole amounts: "RM 200" instead of "RM 200.00". */
  trimZeros?: boolean;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formats an amount in minor units for display, e.g. 24713 sen as "RM 247.13". */
export function formatMoney(amountMinor: number, currency: CurrencyCode, options: FormatMoneyOptions = {}): string {
  const { symbol, minorDigits } = currencies[currency];
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(amountMinor));
  const per = minorPerMajor(currency);
  const whole = groupThousands(String(Math.floor(absolute / per)));
  const fraction = absolute % per;
  const showFraction = minorDigits > 0 && !(options.trimZeros && fraction === 0);
  const decimals = showFraction ? `.${String(fraction).padStart(minorDigits, '0')}` : '';
  // "RM 247.13" reads better with a space; single-character symbols sit against the number.
  const gap = symbol.length > 1 ? ' ' : '';
  return `${sign}${symbol}${gap}${whole}${decimals}`;
}

/**
 * Converts a foreign amount to Ringgit.
 * `ratePerMyr` is how many foreign units one Ringgit buys (the Frankfurter convention), so
 * amountMYR = amountForeign / rate. Example: ¥100 at 38.725 is RM 2.58.
 */
export function convertToMyr(amountMinor: number, currency: CurrencyCode, ratePerMyr: number): number {
  if (currency === HOME_CURRENCY) return Math.round(amountMinor);
  if (!Number.isFinite(ratePerMyr) || ratePerMyr <= 0) {
    throw new Error(`Exchange rate must be a positive number, got ${ratePerMyr}`);
  }
  const foreignMajor = amountMinor / minorPerMajor(currency);
  return Math.round((foreignMajor / ratePerMyr) * minorPerMajor(HOME_CURRENCY));
}

/** Converts a Ringgit amount (sen) into a foreign currency's smallest unit. */
export function convertFromMyr(amountSen: number, currency: CurrencyCode, ratePerMyr: number): number {
  if (currency === HOME_CURRENCY) return Math.round(amountSen);
  if (!Number.isFinite(ratePerMyr) || ratePerMyr <= 0) {
    throw new Error(`Exchange rate must be a positive number, got ${ratePerMyr}`);
  }
  return Math.round((amountSen / minorPerMajor(HOME_CURRENCY)) * ratePerMyr * minorPerMajor(currency));
}

/**
 * Reads an amount typed by the user ("4,200", "1200.50", " 80 ") into minor units.
 * Returns null when it is not a valid, non-negative amount, so forms can show an error
 * instead of saving a wrong number.
 */
export function parseMoneyInput(text: string, currency: CurrencyCode): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const { minorDigits } = currencies[currency];
  if (fraction.length > minorDigits) return null;
  const minor = Number(whole) * minorPerMajor(currency) + Number(fraction.padEnd(minorDigits, '0') || '0');
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Adds up amounts that are already in the same currency. */
export function sumMinor(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
