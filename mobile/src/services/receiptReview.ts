import { isIsoDate, type IsoDate } from '@/domain/dates';
import { convertToMyr } from '@/domain/money';
import type { Expense, ReceiptDetails, Trip } from '@/domain/types';
import { MAX_TEXT_LENGTH, type ExpenseDraft } from '@/services/expenseService';
import type { ReceiptScan } from '@/services/scanService';

/**
 * Turns an AI reading into the review screen's starting values, and back into what is kept with
 * the saved expense. The user always checks and confirms first (brief §9.4 step 5).
 */

export type ReviewField = 'amount' | 'currency' | 'merchant' | 'date' | 'category';

/** Which reading fields belong to which form field. */
const FIELD_FOR: Record<string, ReviewField> = {
  total: 'amount',
  subtotal: 'amount',
  items: 'amount',
  taxLines: 'amount',
  serviceCharge: 'amount',
  currency: 'currency',
  merchantName: 'merchant',
  purchaseDate: 'date',
  suggestedCategory: 'category',
};

export function draftFromScan(scan: ReceiptScan, today: IsoDate): ExpenseDraft {
  const { receipt } = scan;
  return {
    amountOriginal: receipt.totalMinor,
    currency: receipt.currency,
    category: receipt.suggestedCategory,
    merchantName: receipt.merchantName.slice(0, MAX_TEXT_LENGTH),
    note: '',
    purchaseDate: receipt.purchaseDate && isIsoDate(receipt.purchaseDate) ? receipt.purchaseDate : today,
  };
}

/** A short "check this" message for each form field the AI was unsure of or that failed a check. */
export function reviewHighlights(scan: ReceiptScan, trip: Pick<Trip, 'startDate' | 'endDate'>): Partial<Record<ReviewField, string>> {
  const highlights: Partial<Record<ReviewField, string>> = {};
  const note = (field: ReviewField, message: string) => {
    highlights[field] ??= message;
  };
  // Specific messages from the checks come first...
  for (const check of scan.checks) {
    const field = FIELD_FOR[check.field];
    if (field) note(field, check.message);
  }
  // ...then a general one for anything else the AI was unsure of.
  for (const name of scan.uncertainFields) {
    const field = FIELD_FOR[name];
    if (field) note(field, 'Hard to read. Check this.');
  }
  if (!scan.receipt.purchaseDate) note('date', 'No date could be read, so today was used. Check this.');
  else if (scan.receipt.purchaseDate < trip.startDate || scan.receipt.purchaseDate > trip.endDate) note('date', 'This date is outside your trip. Check it.');
  return highlights;
}

/**
 * The expense as it would be saved, so the tax refund check can run on the review screen before
 * anything is saved. `ratePerMyr` is today's rate for the receipt's currency, if known.
 */
export function previewExpense(scan: ReceiptScan, trip: Pick<Trip, 'id'>, today: IsoDate, details: ReceiptDetails, ratePerMyr: number | null): Expense {
  const draft = draftFromScan(scan, today);
  const rate = draft.currency === 'MYR' ? 1 : ratePerMyr;
  return {
    id: 'preview',
    tripId: trip.id,
    createdAt: '',
    note: '',
    amountOriginal: draft.amountOriginal,
    currency: draft.currency,
    rateUsed: rate ?? 1,
    rateDate: today,
    amountMyr: rate ? convertToMyr(draft.amountOriginal, draft.currency, rate) : 0,
    category: draft.category,
    source: 'scan',
    merchantName: draft.merchantName,
    purchaseDate: draft.purchaseDate,
    receipt: details,
  };
}

export function receiptDetailsFromScan(scan: ReceiptScan, imageId: string | null): ReceiptDetails {
  const { receipt } = scan;
  return {
    imageId,
    merchantNameOriginal: receipt.merchantNameOriginal,
    currency: receipt.currency,
    items: receipt.items.map((item) => ({ name: item.name, nameOriginal: item.nameOriginal, quantity: item.quantity, lineTotal: item.lineTotalMinor })),
    subtotal: receipt.subtotalMinor,
    taxLines: receipt.taxLines.map((line) => ({ ratePercent: line.ratePercent, amount: line.amountMinor })),
    serviceCharge: receipt.serviceChargeMinor,
    total: receipt.totalMinor,
    taxIncluded: receipt.taxIncluded,
    taxFreeShop: receipt.taxFreeShop,
    language: receipt.language,
    confidence: receipt.confidence,
    readBy: scan.readBy,
    modelUsed: scan.modelUsed,
  };
}
