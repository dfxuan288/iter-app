import { taxRuleFor, type TaxRule } from '@/config/taxRules';
import { diffDays, type IsoDate } from '@/domain/dates';
import { convertToMyr, formatMoney, sumMinor, type CurrencyCode } from '@/domain/money';
import type { Expense, ReceiptDetails, RefundStatus, Trip } from '@/domain/types';

/**
 * The tax refund check (brief §9.6). For every scanned receipt ITER answers: is it refundable,
 * and how much can be collected. Pure functions; the rules come from config/taxRules.ts.
 *
 *   eligible  = registered tax-free shop (the user confirms when the receipt does not say)
 *               AND the shop's total that day meets the minimum
 *               AND bought within the claim window, under the current system
 *   estRefund = tax × (1 − handling fee)
 */

export type RefundEligibility =
  /** Refundable: counts towards "to collect". */
  | 'eligible'
  /** Refundable if the shop is a registered tax-free shop, which the receipt does not show. */
  | 'possible'
  | 'not_eligible'
  /** No scanned receipt, or no verified rules for this country yet: nothing is shown. */
  | 'not_checked';

export interface RefundCheck {
  eligibility: RefundEligibility;
  /** One plain sentence: why it is or is not refundable. */
  reason: string;
  currency: CurrencyCode;
  /** Tax paid, in the minor unit of `currency`. */
  tax: number;
  /** True when the receipt did not print its tax and it was worked out from the standard rate. */
  taxEstimated: boolean;
  /** What can be collected, before any handling fee is known: "up to". */
  estRefund: number;
  estRefundMyr: number;
}

const notChecked = (currency: CurrencyCode, reason = ''): RefundCheck => ({
  eligibility: 'not_checked',
  reason,
  currency,
  tax: 0,
  taxEstimated: false,
  estRefund: 0,
  estRefundMyr: 0,
});

/** Tax on a receipt: the printed tax lines, or an estimate from the standard rate when none are printed. */
export function receiptTax(receipt: ReceiptDetails, rule: Pick<TaxRule, 'standardRatePercent'>): { tax: number; estimated: boolean } {
  if (receipt.taxLines.length > 0) return { tax: sumMinor(receipt.taxLines.map((line) => line.amount)), estimated: false };
  const rate = rule.standardRatePercent;
  const service = receipt.serviceCharge ?? 0;
  const tax = receipt.taxIncluded
    ? Math.round(((receipt.total - service) * rate) / (100 + rate))
    : Math.round(((receipt.subtotal ?? receipt.total - service) * rate) / 100);
  return { tax, estimated: true };
}

/** The amount the minimum is measured against. */
export function amountForMinimum(receipt: ReceiptDetails, rule: Pick<TaxRule, 'minPurchaseBasis' | 'standardRatePercent'>): number {
  if (rule.minPurchaseBasis === 'incl_tax') return receipt.total;
  const { tax } = receiptTax(receipt, rule);
  const service = receipt.serviceCharge ?? 0;
  return receipt.taxIncluded ? receipt.total - tax - service : (receipt.subtotal ?? receipt.total - tax - service);
}

const sameShop = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The shop's total towards the minimum that day, counting every scanned receipt from it (brief: "same store, same day"). */
export function shopDayTotal(expense: Expense, others: readonly Expense[], rule: TaxRule): number {
  if (!expense.receipt) return 0;
  if (!rule.sameStoreSameDay) return amountForMinimum(expense.receipt, rule);
  const group = [expense, ...others.filter((other) => other.id !== expense.id)].filter(
    (e) => e.receipt && e.receipt.currency === rule.currency && e.purchaseDate === expense.purchaseDate && sameShop(e.merchantName, expense.merchantName),
  );
  return sumMinor(group.map((e) => amountForMinimum(e.receipt as ReceiptDetails, rule)));
}

/**
 * Checks one expense. `others` are the trip's other expenses (for the same-shop-same-day total),
 * and `departure` is the last day of the trip.
 */
export function checkRefund(expense: Expense, trip: Pick<Trip, 'country' | 'endDate'>, others: readonly Expense[] = []): RefundCheck {
  const receipt = expense.receipt;
  if (!receipt) return notChecked(expense.currency);
  const rule = taxRuleFor(trip.country, receipt.currency);
  if (!rule) return notChecked(receipt.currency, `Tax refunds in ${trip.country} are not supported yet.`);

  const { tax, estimated } = receiptTax(receipt, rule);
  const estRefund = Math.floor((tax * (100 - rule.estHandlingFeePct)) / 100);
  // Converted at the rate saved with the expense, so the figure does not drift with today's rates.
  const estRefundMyr =
    expense.currency === receipt.currency
      ? convertToMyr(estRefund, receipt.currency, expense.rateUsed)
      : Math.round((estRefund / Math.max(1, receipt.total)) * expense.amountMyr);
  const result = (eligibility: RefundEligibility, reason: string): RefundCheck => ({
    eligibility,
    reason,
    currency: receipt.currency,
    tax,
    taxEstimated: estimated,
    estRefund,
    estRefundMyr,
  });

  if (expense.purchaseDate < rule.effectiveFrom) return result('not_eligible', rule.effectiveFromNote);
  const excluded = rule.notRefundable[expense.category];
  if (excluded) return result('not_eligible', excluded);

  const shop = expense.taxRefund?.shopIsTaxFree === undefined ? receipt.taxFreeShop : expense.taxRefund.shopIsTaxFree ? 'yes' : 'no';
  if (expense.category === 'food' && shop !== 'yes') return result('not_eligible', rule.mealsNote);
  if (shop === 'no') return result('not_eligible', 'This shop is not a registered tax-free shop.');

  if (shopDayTotal(expense, others, rule) < rule.minPurchase) {
    const basis = rule.minPurchaseBasis === 'pre_tax' ? ' before tax' : '';
    return result('not_eligible', `Not eligible: below the ${formatMoney(rule.minPurchase, rule.currency)} minimum${basis} in one shop on one day.`);
  }
  if (diffDays(expense.purchaseDate, trip.endDate) > rule.claimWindowDays) {
    return result('not_eligible', `Bought more than ${rule.claimWindowDays} days before you leave, so it can no longer be claimed.`);
  }
  if (shop === 'unknown') return result('possible', 'Possibly refundable · check for a Tax-Free sign at the shop.');
  return result('eligible', 'Tax refund eligible.');
}

export interface RefundLine {
  expense: Expense;
  check: RefundCheck;
  status: RefundStatus;
}

export interface RefundSummary {
  /** Eligible purchases, newest first. */
  eligible: RefundLine[];
  /** Refundable only if the shop turns out to be tax-free. */
  possible: RefundLine[];
  /** Checked and not refundable, with the reason. */
  notEligible: RefundLine[];
  /** "Up to" this much still to come: eligible and not yet received or missed. Sen. */
  toCollectMyr: number;
  receivedMyr: number;
  rule: TaxRule | undefined;
}

/**
 * Every scanned purchase on a trip, sorted into refundable, possible and not refundable.
 * The "to collect" total is kept apart from the budget: it never raises safe-to-spend, because
 * the money only arrives at or after departure (brief §9.6).
 */
export function summarizeRefunds(trip: Trip, expenses: readonly Expense[]): RefundSummary {
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const lines = tripExpenses
    .filter((e) => e.receipt)
    .map((expense) => ({ expense, check: checkRefund(expense, trip, tripExpenses), status: expense.taxRefund?.status ?? 'to_claim' }))
    .sort((a, b) => b.expense.purchaseDate.localeCompare(a.expense.purchaseDate));
  const eligible = lines.filter((line) => line.check.eligibility === 'eligible');
  return {
    eligible,
    possible: lines.filter((line) => line.check.eligibility === 'possible'),
    notEligible: lines.filter((line) => line.check.eligibility === 'not_eligible'),
    toCollectMyr: sumMinor(eligible.filter((l) => l.status === 'to_claim' || l.status === 'claimed').map((l) => l.check.estRefundMyr)),
    receivedMyr: sumMinor(eligible.filter((l) => l.status === 'received').map((l) => l.check.estRefundMyr)),
    rule: taxRuleFor(trip.country, trip.localCurrency),
  };
}

/** True on the last days of a trip with refunds still to claim, so Home can remind the user (brief §7.7). */
export function shouldRemindToClaim(summary: RefundSummary, today: IsoDate, trip: Pick<Trip, 'endDate'>): boolean {
  const daysToGo = diffDays(today, trip.endDate);
  return daysToGo >= 0 && daysToGo <= 1 && summary.eligible.some((line) => line.status === 'to_claim');
}
