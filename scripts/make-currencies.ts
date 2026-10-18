/**
 * Builds the currency and country lists used by the app and the server, from one source, so the
 * two can never disagree. Run after changing the country list below:
 *
 *   npx tsx scripts/make-currencies.ts
 *
 * It asks Frankfurter (the rate source) which currencies it publishes, keeps the countries whose
 * currency it covers, and writes:
 *   - mobile/src/domain/currencyList.ts   names, symbols and decimal places of every currency
 *   - mobile/src/data/countries.ts        the "Somewhere else?" country list
 *   - backend/currencyList.ts             decimal places, for the server's scan checks and rates
 */
import { writeFileSync } from 'node:fs';

/** [country code, country name, currency]. Countries Malaysian travellers commonly visit. */
const COUNTRIES: [string, string, string][] = [
  // Asia
  ['JP', 'Japan', 'JPY'], ['KR', 'South Korea', 'KRW'], ['CN', 'China', 'CNY'], ['HK', 'Hong Kong', 'HKD'], ['MO', 'Macau', 'MOP'],
  ['TW', 'Taiwan', 'TWD'], ['TH', 'Thailand', 'THB'], ['SG', 'Singapore', 'SGD'], ['ID', 'Indonesia', 'IDR'], ['VN', 'Vietnam', 'VND'],
  ['PH', 'Philippines', 'PHP'], ['KH', 'Cambodia', 'KHR'], ['LA', 'Laos', 'LAK'], ['MM', 'Myanmar', 'MMK'], ['BN', 'Brunei', 'BND'],
  ['IN', 'India', 'INR'], ['LK', 'Sri Lanka', 'LKR'], ['MV', 'Maldives', 'MVR'], ['NP', 'Nepal', 'NPR'], ['BD', 'Bangladesh', 'BDT'],
  ['PK', 'Pakistan', 'PKR'], ['MN', 'Mongolia', 'MNT'], ['KZ', 'Kazakhstan', 'KZT'], ['UZ', 'Uzbekistan', 'UZS'], ['KG', 'Kyrgyzstan', 'KGS'],
  // Middle East
  ['AE', 'United Arab Emirates', 'AED'], ['SA', 'Saudi Arabia', 'SAR'], ['QA', 'Qatar', 'QAR'], ['OM', 'Oman', 'OMR'], ['BH', 'Bahrain', 'BHD'],
  ['KW', 'Kuwait', 'KWD'], ['JO', 'Jordan', 'JOD'], ['TR', 'Turkey', 'TRY'], ['IL', 'Israel', 'ILS'],
  // Europe
  ['GB', 'United Kingdom', 'GBP'], ['IE', 'Ireland', 'EUR'], ['FR', 'France', 'EUR'], ['DE', 'Germany', 'EUR'], ['IT', 'Italy', 'EUR'],
  ['ES', 'Spain', 'EUR'], ['PT', 'Portugal', 'EUR'], ['NL', 'Netherlands', 'EUR'], ['BE', 'Belgium', 'EUR'], ['AT', 'Austria', 'EUR'],
  ['CH', 'Switzerland', 'CHF'], ['GR', 'Greece', 'EUR'], ['FI', 'Finland', 'EUR'], ['HR', 'Croatia', 'EUR'], ['SI', 'Slovenia', 'EUR'],
  ['SK', 'Slovakia', 'EUR'], ['EE', 'Estonia', 'EUR'], ['LV', 'Latvia', 'EUR'], ['LT', 'Lithuania', 'EUR'], ['LU', 'Luxembourg', 'EUR'],
  ['MT', 'Malta', 'EUR'], ['CY', 'Cyprus', 'EUR'], ['MC', 'Monaco', 'EUR'], ['ME', 'Montenegro', 'EUR'], ['BG', 'Bulgaria', 'EUR'],
  ['NO', 'Norway', 'NOK'], ['SE', 'Sweden', 'SEK'], ['DK', 'Denmark', 'DKK'], ['IS', 'Iceland', 'ISK'], ['PL', 'Poland', 'PLN'],
  ['CZ', 'Czechia', 'CZK'], ['HU', 'Hungary', 'HUF'], ['RO', 'Romania', 'RON'], ['RS', 'Serbia', 'RSD'], ['BA', 'Bosnia and Herzegovina', 'BAM'],
  ['AL', 'Albania', 'ALL'], ['MK', 'North Macedonia', 'MKD'], ['GE', 'Georgia', 'GEL'], ['AM', 'Armenia', 'AMD'], ['AZ', 'Azerbaijan', 'AZN'],
  ['UA', 'Ukraine', 'UAH'],
  // Americas
  ['US', 'United States', 'USD'], ['CA', 'Canada', 'CAD'], ['MX', 'Mexico', 'MXN'], ['BR', 'Brazil', 'BRL'], ['AR', 'Argentina', 'ARS'],
  ['CL', 'Chile', 'CLP'], ['PE', 'Peru', 'PEN'], ['CO', 'Colombia', 'COP'], ['UY', 'Uruguay', 'UYU'], ['CR', 'Costa Rica', 'CRC'],
  ['PA', 'Panama', 'USD'], ['EC', 'Ecuador', 'USD'], ['BO', 'Bolivia', 'BOB'], ['DO', 'Dominican Republic', 'DOP'], ['JM', 'Jamaica', 'JMD'],
  ['GT', 'Guatemala', 'GTQ'],
  // Oceania
  ['AU', 'Australia', 'AUD'], ['NZ', 'New Zealand', 'NZD'], ['FJ', 'Fiji', 'FJD'],
  // Africa
  ['ZA', 'South Africa', 'ZAR'], ['EG', 'Egypt', 'EGP'], ['MA', 'Morocco', 'MAD'], ['TN', 'Tunisia', 'TND'], ['KE', 'Kenya', 'KES'],
  ['TZ', 'Tanzania', 'TZS'], ['MU', 'Mauritius', 'MUR'], ['SC', 'Seychelles', 'SCR'], ['NG', 'Nigeria', 'NGN'], ['GH', 'Ghana', 'GHS'],
  ['ET', 'Ethiopia', 'ETB'], ['NA', 'Namibia', 'NAD'], ['BW', 'Botswana', 'BWP'], ['RW', 'Rwanda', 'RWF'], ['UG', 'Uganda', 'UGX'],
  ['ZM', 'Zambia', 'ZMW'],
];

/** The symbols ITER already used, kept as they were. Others come from the standard (Intl) English symbol, e.g. "£", "A$", "AED". */
const SYMBOLS: Record<string, string> = { MYR: 'RM', JPY: '¥', THB: '฿', SGD: 'S$', IDR: 'Rp', VND: '₫', USD: '$', EUR: '€', KRW: '₩' };
/** Currencies with no coins in everyday use, handled as whole units (ITER's existing choice for rupiah and dong). */
const WHOLE_UNITS = new Set(['IDR', 'VND', 'JPY', 'KRW']);

/** A string literal in the project's style (single quotes). */
const q = (text: string) => `'${text.split('\\').join('\\\\').split("'").join("\\'")}'`;

interface FrankfurterCurrency {
  iso_code: string;
  name: string;
}

async function main() {
  const response = await fetch('https://api.frankfurter.dev/v2/currencies');
  if (!response.ok) throw new Error(`Frankfurter replied ${response.status}`);
  const published = new Map(((await response.json()) as FrankfurterCurrency[]).map((c) => [c.iso_code, c.name]));

  const countries = COUNTRIES.filter(([, name, currency]) => {
    const ok = published.has(currency);
    if (!ok) console.warn(`Skipped ${name}: Frankfurter does not publish ${currency}`);
    return ok;
  }).sort((a, b) => a[1].localeCompare(b[1]));

  const codes = [...new Set(['MYR', ...Object.keys(SYMBOLS), ...countries.map(([, , currency]) => currency)])];
  const info = codes.map((code) => {
    const format = new Intl.NumberFormat('en', { style: 'currency', currency: code });
    const digits = WHOLE_UNITS.has(code) ? 0 : format.resolvedOptions().maximumFractionDigits;
    if (digits !== 0 && digits !== 2 && digits !== 3) throw new Error(`${code} has ${digits} decimal places`);
    const symbol = SYMBOLS[code] ?? format.formatToParts(0).find((part) => part.type === 'currency')?.value ?? code;
    const name = code === 'MYR' ? 'Malaysian Ringgit' : (published.get(code) ?? code);
    return { code, name, symbol, digits };
  });

  const header = '// Generated by scripts/make-currencies.ts from Frankfurter\'s currency list. Do not edit by hand.\n';
  writeFileSync(
    'mobile/src/domain/currencyList.ts',
    `${header}\n/** Every currency ITER handles: its name, symbol and decimal places. */\nexport const CURRENCY_LIST = {\n${info
      .map((c) => `  ${c.code}: { name: ${q(c.name)}, symbol: ${q(c.symbol)}, minorDigits: ${c.digits} },`)
      .join('\n')}\n} as const;\n`,
  );
  writeFileSync(
    'mobile/src/data/countries.ts',
    `${header}import type { CurrencyCode } from '@/domain/money';\n\nexport interface Country {\n  /** ISO country code, e.g. "GB". */\n  code: string;\n  name: string;\n  currency: CurrencyCode;\n}\n\n/** The "Somewhere else?" list: countries a trip can be planned for, A to Z. */\nexport const COUNTRIES: readonly Country[] = [\n${countries
      .map(([code, name, currency]) => `  { code: '${code}', name: ${q(name)}, currency: '${currency}' },`)
      .join('\n')}\n];\n`,
  );
  writeFileSync(
    'backend/currencyList.ts',
    `${header}\n/** Decimal places of every currency ITER handles. Matches mobile/src/domain/currencyList.ts. */\nexport const MINOR_DIGITS = {\n${info
      .map((c) => `  ${c.code}: ${c.digits},`)
      .join('\n')}\n} as const;\n`,
  );
  console.log(`${countries.length} countries, ${info.length} currencies`);
}

void main();
