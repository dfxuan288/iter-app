import { normalizeCurrency, toMinor, type CurrencyCode } from './currency.js';
import type { MenuExtraction, ReceiptExtraction } from './schema.js';

/**
 * Turns what the AI read into ITER's format (integers in minor units) and checks it in code
 * (brief §9.4 step 3). The AI never does the maths: this file decides whether the numbers add up.
 */

/** Below this, a scan is retried with the stronger model (brief §9.4 step 4). */
export const CONFIDENCE_THRESHOLD = 0.7;

export type CheckCode =
  | 'not_a_receipt'
  | 'not_a_menu'
  | 'currency_unsupported'
  | 'currency_assumed'
  | 'total_missing'
  | 'total_not_positive'
  | 'items_missing'
  | 'items_do_not_add_up'
  | 'total_does_not_add_up'
  | 'date_missing'
  | 'date_outside_trip'
  | 'low_confidence'
  | 'no_dishes';

export interface ScanCheck {
  code: CheckCode;
  /** The field the review screen should highlight. */
  field: string;
  /** `error` means the reading is probably wrong and is worth retrying with the stronger model. */
  severity: 'error' | 'warning';
  message: string;
}

export interface ScanContext {
  /** The trip's local currency, used when the receipt does not show one. */
  currencyHint?: CurrencyCode;
  tripStart?: string;
  tripEnd?: string;
}

export interface ScannedReceipt {
  merchantName: string;
  merchantNameOriginal: string | null;
  purchaseDate: string | null;
  currency: CurrencyCode;
  items: {
    name: string;
    nameOriginal: string | null;
    quantity: number | null;
    unitPriceMinor: number | null;
    lineTotalMinor: number;
    taxRatePercent: number | null;
  }[];
  subtotalMinor: number | null;
  taxLines: { ratePercent: number | null; amountMinor: number }[];
  serviceChargeMinor: number | null;
  /** Always present: when the receipt has no readable total, it is added up from the parts and flagged. */
  totalMinor: number;
  taxIncluded: boolean;
  suggestedCategory: ReceiptExtraction['suggestedCategory'];
  taxFreeShop: ReceiptExtraction['taxFreeShop'];
  language: string;
  confidence: number;
}

export interface ScannedMenu {
  restaurantName: string | null;
  currency: CurrencyCode;
  language: string;
  dishes: {
    original: string;
    translation: string;
    description: string;
    priceMinor: number | null;
    containsPork: 'yes' | 'no' | 'unknown';
    containsAlcohol: 'yes' | 'no' | 'unknown';
  }[];
  pricesExcludeTax: boolean;
  addedTaxPercent: number | null;
  serviceChargePercent: number | null;
  notes: string[];
  confidence: number;
}

export interface Checked<T> {
  /** Null when the image could not be used at all (not a receipt, or an unsupported currency). */
  result: T | null;
  checks: ScanCheck[];
  /** Fields to highlight on the review screen: the AI's own doubts plus what failed a check. */
  uncertainFields: string[];
}

const RECEIPT_FIELDS = ['merchantName', 'purchaseDate', 'currency', 'items', 'subtotal', 'taxLines', 'serviceCharge', 'total', 'suggestedCategory'];

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const isIsoDate = (value: string | null): value is string =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

function resolveCurrency(raw: string | null, context: ScanContext, checks: ScanCheck[]): CurrencyCode | null {
  const read = normalizeCurrency(raw);
  if (read) return read;
  // The receipt shows a currency ITER does not support: do not guess.
  if (raw && raw.trim() !== '') {
    checks.push({ code: 'currency_unsupported', field: 'currency', severity: 'error', message: `ITER cannot handle prices in ${raw} yet.` });
    return null;
  }
  if (context.currencyHint) {
    checks.push({
      code: 'currency_assumed',
      field: 'currency',
      severity: 'warning',
      message: `The receipt does not show a currency, so ${context.currencyHint} was assumed.`,
    });
    return context.currencyHint;
  }
  checks.push({ code: 'currency_unsupported', field: 'currency', severity: 'error', message: 'The currency could not be read.' });
  return null;
}

export function checkReceipt(extraction: ReceiptExtraction, context: ScanContext = {}): Checked<ScannedReceipt> {
  const checks: ScanCheck[] = [];
  const aiDoubts = extraction.uncertainFields.filter((field) => RECEIPT_FIELDS.includes(field));

  if (!extraction.isReceipt) {
    checks.push({ code: 'not_a_receipt', field: 'image', severity: 'error', message: 'This does not look like a receipt.' });
    return { result: null, checks, uncertainFields: [] };
  }
  const currency = resolveCurrency(extraction.currency, context, checks);
  if (!currency) return { result: null, checks, uncertainFields: ['currency'] };

  const minor = (value: number) => toMinor(value, currency);
  const items = extraction.items.map((item) => ({
    name: item.name.trim() || 'Item',
    nameOriginal: item.nameOriginal?.trim() || null,
    quantity: item.quantity,
    unitPriceMinor: item.unitPrice === null ? null : minor(item.unitPrice),
    lineTotalMinor: minor(item.lineTotal),
    taxRatePercent: item.taxRatePercent,
  }));
  const taxLines = extraction.taxLines.map((line) => ({ ratePercent: line.ratePercent, amountMinor: minor(line.amount) }));
  const subtotalMinor = extraction.subtotal === null ? null : minor(extraction.subtotal);
  const serviceChargeMinor = extraction.serviceCharge === null ? null : minor(extraction.serviceCharge);
  const itemsSum = sum(items.map((item) => item.lineTotalMinor));
  // Tax shown "included" (内税) is already inside the prices, so it is not added again.
  const addedTax = extraction.taxIncluded ? 0 : sum(taxLines.map((line) => line.amountMinor));
  const service = serviceChargeMinor ?? 0;
  // Each printed figure may have been rounded once, so allow one smallest unit per figure.
  const tolerance = items.length + taxLines.length + 1;

  let totalMinor: number;
  if (extraction.total !== null) {
    totalMinor = minor(extraction.total);
  } else {
    totalMinor = (subtotalMinor ?? itemsSum) + addedTax + service;
    checks.push({ code: 'total_missing', field: 'total', severity: 'error', message: 'The total could not be read, so it was added up from the items.' });
  }
  if (totalMinor <= 0) {
    checks.push({ code: 'total_not_positive', field: 'total', severity: 'error', message: 'The total must be more than zero.' });
  }

  if (items.length === 0) {
    checks.push({ code: 'items_missing', field: 'items', severity: 'warning', message: 'No items could be read. The total is still saved.' });
  } else {
    const expectedItems = subtotalMinor ?? totalMinor - addedTax - service;
    if (Math.abs(itemsSum - expectedItems) > tolerance) {
      checks.push({
        code: 'items_do_not_add_up',
        field: 'items',
        severity: 'error',
        message: subtotalMinor === null ? 'The items do not add up to the total.' : 'The items do not add up to the subtotal.',
      });
    }
  }
  if (subtotalMinor !== null && extraction.total !== null && Math.abs(subtotalMinor + addedTax + service - totalMinor) > tolerance) {
    checks.push({
      code: 'total_does_not_add_up',
      field: 'total',
      severity: 'error',
      message: 'The subtotal, tax and service charge do not add up to the total.',
    });
  }

  const purchaseDate = isIsoDate(extraction.purchaseDate) ? extraction.purchaseDate : null;
  if (!purchaseDate) {
    checks.push({ code: 'date_missing', field: 'purchaseDate', severity: 'warning', message: 'The date could not be read.' });
  } else if ((context.tripStart && purchaseDate < context.tripStart) || (context.tripEnd && purchaseDate > context.tripEnd)) {
    checks.push({ code: 'date_outside_trip', field: 'purchaseDate', severity: 'warning', message: 'This date is outside your trip. Check it.' });
  }

  const confidence = clamp01(extraction.confidence);
  if (confidence < CONFIDENCE_THRESHOLD) {
    checks.push({ code: 'low_confidence', field: 'image', severity: 'warning', message: 'Parts of this receipt were hard to read.' });
  }

  const uncertainFields = [...new Set([...aiDoubts, ...checks.map((check) => check.field).filter((field) => field !== 'image')])];
  return {
    result: {
      merchantName: extraction.merchantName.trim() || 'Receipt',
      merchantNameOriginal: extraction.merchantNameOriginal?.trim() || null,
      purchaseDate,
      currency,
      items,
      subtotalMinor,
      taxLines,
      serviceChargeMinor,
      totalMinor,
      taxIncluded: extraction.taxIncluded,
      suggestedCategory: extraction.suggestedCategory,
      taxFreeShop: extraction.taxFreeShop,
      language: extraction.language,
      confidence,
    },
    checks,
    uncertainFields,
  };
}

const isPercent = (value: number | null): number | null => (value !== null && Number.isFinite(value) && value > 0 && value < 100 ? value : null);

export function checkMenu(extraction: MenuExtraction, context: ScanContext = {}): Checked<ScannedMenu> {
  const checks: ScanCheck[] = [];
  if (!extraction.isMenu) {
    checks.push({ code: 'not_a_menu', field: 'image', severity: 'error', message: 'This does not look like a menu.' });
    return { result: null, checks, uncertainFields: [] };
  }
  const currency = resolveCurrency(extraction.currency, context, checks);
  if (!currency) return { result: null, checks, uncertainFields: ['currency'] };

  const dishes = extraction.dishes.map((dish) => ({
    original: dish.original.trim(),
    translation: dish.translation.trim() || dish.original.trim(),
    description: dish.description.trim(),
    priceMinor: dish.price === null || dish.price < 0 ? null : toMinor(dish.price, currency),
    containsPork: dish.containsPork,
    containsAlcohol: dish.containsAlcohol,
  }));
  if (dishes.length === 0) {
    checks.push({ code: 'no_dishes', field: 'dishes', severity: 'error', message: 'No dishes could be read.' });
  }
  const confidence = clamp01(extraction.confidence);
  if (confidence < CONFIDENCE_THRESHOLD) {
    checks.push({ code: 'low_confidence', field: 'image', severity: 'warning', message: 'Parts of this menu were hard to read.' });
  }
  return {
    result: {
      restaurantName: extraction.restaurantName?.trim() || null,
      currency,
      language: extraction.language,
      dishes,
      pricesExcludeTax: extraction.pricesExcludeTax,
      addedTaxPercent: isPercent(extraction.addedTaxPercent),
      serviceChargePercent: isPercent(extraction.serviceChargePercent),
      notes: extraction.notes.map((note) => note.trim()).filter(Boolean),
      confidence,
    },
    checks,
    uncertainFields: [...new Set(checks.map((check) => check.field).filter((field) => field !== 'image'))],
  };
}

/** Whether a reading is worth a second, more careful attempt (brief §9.4 step 4). */
export function needsSecondLook(checked: Checked<unknown>, confidence: number): boolean {
  if (checked.checks.some((check) => check.code === 'not_a_receipt' || check.code === 'not_a_menu')) {
    // A confident "this is not a receipt" is accepted; a doubtful one gets a second look.
    return confidence < CONFIDENCE_THRESHOLD;
  }
  return confidence < CONFIDENCE_THRESHOLD || checked.checks.some((check) => check.severity === 'error');
}

/** Counts how wrong a reading looks, to choose between the first and second attempt. */
export function errorCount(checked: Checked<unknown>): number {
  return checked.checks.filter((check) => check.severity === 'error').length + (checked.result === null ? 10 : 0);
}
