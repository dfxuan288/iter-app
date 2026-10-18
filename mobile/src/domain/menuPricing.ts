import { sumMinor } from '@/domain/money';

/**
 * What a menu's prices really cost (brief §9.5). The AI reports the printed price and what the
 * menu says is added on top; this code does the adding, never the AI.
 *
 * - Japan, prices "before tax" (税抜): + 10% tax.
 * - Thailand "++": + 10% service charge, then 7% VAT on the price and the service charge together.
 */

export interface MenuCharges {
  /** The menu says its prices are before tax. */
  pricesExcludeTax: boolean;
  /** Tax added on top, when known. Applied only when `pricesExcludeTax` is true. */
  addedTaxPercent: number | null;
  /** Service charge added on top, when the menu says so. */
  serviceChargePercent: number | null;
}

export interface BillBreakdown {
  /** All in the minor unit of the menu's currency. */
  printed: number;
  service: number;
  tax: number;
  total: number;
}

/**
 * Adds the service charge, then tax on the price and service together (how a "++" bill is worked
 * out). Amounts are integers in the currency's smallest unit, so each charge is rounded to it.
 */
export function applyCharges(printed: number, charges: MenuCharges): BillBreakdown {
  const service = charges.serviceChargePercent ? Math.round((printed * charges.serviceChargePercent) / 100) : 0;
  const tax = charges.pricesExcludeTax && charges.addedTaxPercent ? Math.round(((printed + service) * charges.addedTaxPercent) / 100) : 0;
  return { printed, service, tax, total: printed + service + tax };
}

/** True when the menu says tax is extra but not how much, so ITER cannot add it for the user. */
export function taxUnknown(charges: MenuCharges): boolean {
  return charges.pricesExcludeTax && !charges.addedTaxPercent;
}

/** One line describing what is added to the printed prices, or null when nothing is. */
export function chargesSummary(charges: MenuCharges): string | null {
  const service = charges.serviceChargePercent ? `${charges.serviceChargePercent}% service charge` : null;
  const tax = charges.pricesExcludeTax && charges.addedTaxPercent ? `${charges.addedTaxPercent}% tax` : null;
  if (service && tax) return `Prices on this menu are before ${service} and ${tax}. Ringgit prices include both.`;
  if (tax) return `Prices on this menu are before ${tax}. Ringgit prices include it.`;
  if (service) return `A ${service} is added to the bill. Ringgit prices include it.`;
  if (taxUnknown(charges)) return 'This menu says tax is added, but not how much. Ringgit prices are as printed.';
  return null;
}

export interface OrderLine {
  printed: number;
  quantity: number;
}

/** The bill for a set of dishes. Charges are worked out on the whole order, like a real bill. */
export function orderBill(lines: readonly OrderLine[], charges: MenuCharges): BillBreakdown {
  const printed = sumMinor(lines.filter((line) => line.quantity > 0).map((line) => line.printed * line.quantity));
  return applyCharges(printed, charges);
}

/** Words that mark a note as being about tax or service, which chargesSummary already explains. */
const CHARGE_WORDS = /\b(tax|vat|gst|sst|service|charge|charged|exclud\w*|includ\w*|plus)\b|\+\+|税|ค่าบริการ/i;

/**
 * The AI's notes worth showing next to ITER's own charges line: when that line is shown, notes
 * that repeat the tax or service charge are left out; others (a cover charge, a minimum order) stay.
 */
export function extraMenuNotes(notes: readonly string[], charges: MenuCharges): string[] {
  if (!chargesSummary(charges)) return [...notes];
  return notes.filter((note) => !CHARGE_WORDS.test(note) || /cover|minimum|per person|seat/i.test(note));
}
