import { z } from 'zod';

/**
 * What the AI must send back, as strict JSON. The AI only copies what is printed: amounts are
 * the numbers on the paper in the receipt's own currency, never converted or calculated.
 * Code turns them into minor units and checks that they add up (see normalize.ts).
 *
 * Bump PROMPT_VERSION whenever these shapes or the prompts change, so cached results made by an
 * older prompt are not reused.
 */
export const PROMPT_VERSION = 'v4';

/** Everyday spending only: ITER does not track hotels or flights (team decision, 15 Oct 2026). */
export const CATEGORY_VALUES = ['food', 'transport', 'activities', 'shopping'] as const;

const receiptItem = z.object({
  /** In English. */
  name: z.string(),
  /** As printed, if it was in another language; otherwise null. */
  nameOriginal: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  /** Negative for a discount line. */
  lineTotal: z.number(),
  /** e.g. 8 or 10 in Japan, when the receipt marks it. */
  taxRatePercent: z.number().nullable(),
});

export const receiptExtraction = z.object({
  isReceipt: z.boolean(),
  merchantName: z.string(),
  merchantNameOriginal: z.string().nullable(),
  /** YYYY-MM-DD, or null when it cannot be read. */
  purchaseDate: z.string().nullable(),
  /** ISO 4217 code such as JPY, or the symbol as printed when unsure. */
  currency: z.string().nullable(),
  items: z.array(receiptItem),
  subtotal: z.number().nullable(),
  taxLines: z.array(
    z.object({
      ratePercent: z.number().nullable(),
      amount: z.number(),
    }),
  ),
  serviceCharge: z.number().nullable(),
  total: z.number().nullable(),
  /** True when the item prices already include the tax (common in Japan: 内税 / 税込). */
  taxIncluded: z.boolean(),
  suggestedCategory: z.enum(CATEGORY_VALUES),
  /** Whether the receipt shows the shop is a registered tax-free shop. */
  taxFreeShop: z.enum(['yes', 'no', 'unknown']),
  /** Main language of the receipt, as an ISO 639-1 code such as ja. */
  language: z.string(),
  /** 0 to 1: how sure the AI is that it read everything correctly. */
  confidence: z.number(),
  /** Names of fields it could not read clearly, e.g. ["purchaseDate", "items"]. */
  uncertainFields: z.array(z.string()),
});

export type ReceiptExtraction = z.infer<typeof receiptExtraction>;

const dish = z.object({
  /** As printed. */
  original: z.string(),
  /** In English. */
  translation: z.string(),
  /** One short sentence on what it is. */
  description: z.string(),
  /** As printed, or null when the dish has no price. */
  price: z.number().nullable(),
  containsPork: z.enum(['yes', 'no', 'unknown']),
  containsAlcohol: z.enum(['yes', 'no', 'unknown']),
});

export const menuExtraction = z.object({
  isMenu: z.boolean(),
  restaurantName: z.string().nullable(),
  currency: z.string().nullable(),
  language: z.string(),
  dishes: z.array(dish),
  /** True when the menu says prices are before tax, e.g. 税抜 or 税別 in Japan. */
  pricesExcludeTax: z.boolean(),
  /** Tax that is added to the printed prices, e.g. 10, or 7 in Thailand. Null if none or unknown. */
  addedTaxPercent: z.number().nullable(),
  /** Service charge added to the printed prices, e.g. 10 for Thai "++". Null if none. */
  serviceChargePercent: z.number().nullable(),
  /** Anything else a traveller should know about the prices, in one sentence each. */
  notes: z.array(z.string()),
  confidence: z.number(),
});

export type MenuExtraction = z.infer<typeof menuExtraction>;
