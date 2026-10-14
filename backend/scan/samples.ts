import type { ExtractionByKind, ScanKind } from './claude.js';
import type { MenuExtraction, ReceiptExtraction } from './schema.js';

/**
 * Demo safety net (brief §5.2). The app ships sample receipt and menu photos for demos
 * (mobile/assets/samples). Each sample is still read by the real AI; only if the AI cannot be
 * reached, or today's limit is used up, does the backend answer with what is printed on it here.
 * These must match the sample images exactly.
 */

const drugstore: ReceiptExtraction = {
  isReceipt: true,
  merchantName: 'Matsumoto Kiyoshi Ginza',
  merchantNameOriginal: 'マツモトキヨシ 銀座店',
  purchaseDate: '2026-11-15',
  currency: 'JPY',
  items: [
    { name: 'Anessa sunscreen', nameOriginal: 'アネッサ 日焼け止め', quantity: 1, unitPrice: 2980, lineTotal: 2980, taxRatePercent: 10 },
    { name: 'Hada Labo lotion', nameOriginal: '肌ラボ 化粧水', quantity: 2, unitPrice: 1280, lineTotal: 2560, taxRatePercent: 10 },
    { name: 'Rohto eye drops', nameOriginal: 'ロート 目薬', quantity: 1, unitPrice: 680, lineTotal: 680, taxRatePercent: 10 },
    { name: 'Pocky chocolate', nameOriginal: 'ポッキー チョコ', quantity: 3, unitPrice: 150, lineTotal: 450, taxRatePercent: 8 },
  ],
  subtotal: 6670,
  taxLines: [
    { ratePercent: 10, amount: 622 },
    { ratePercent: 8, amount: 36 },
  ],
  serviceCharge: null,
  total: 7328,
  taxIncluded: false,
  suggestedCategory: 'shopping',
  taxFreeShop: 'yes',
  language: 'ja',
  confidence: 1,
  uncertainFields: [],
};

const convenienceStore: ReceiptExtraction = {
  isReceipt: true,
  merchantName: 'FamilyMart Shibuya',
  merchantNameOriginal: 'ファミリーマート 渋谷店',
  purchaseDate: '2026-11-15',
  currency: 'JPY',
  items: [
    { name: 'Salmon onigiri', nameOriginal: 'おにぎり 鮭', quantity: 2, unitPrice: 172, lineTotal: 344, taxRatePercent: 8 },
    { name: 'Green tea', nameOriginal: 'お〜いお茶', quantity: 1, unitPrice: 162, lineTotal: 162, taxRatePercent: 8 },
    { name: 'Egg sandwich', nameOriginal: 'たまごサンド', quantity: 1, unitPrice: 336, lineTotal: 336, taxRatePercent: 8 },
  ],
  subtotal: 842,
  taxLines: [{ ratePercent: 8, amount: 62 }],
  serviceCharge: null,
  total: 842,
  taxIncluded: true,
  suggestedCategory: 'food',
  taxFreeShop: 'unknown',
  language: 'ja',
  confidence: 1,
  uncertainFields: [],
};

const ramenMenu: MenuExtraction = {
  isMenu: true,
  restaurantName: 'Sakuraya Ramen',
  currency: 'JPY',
  language: 'ja',
  dishes: [
    { original: '豚骨らーめん', translation: 'Tonkotsu ramen', description: 'Noodles in a rich pork-bone broth.', price: 1000, containsPork: 'yes', containsAlcohol: 'unknown' },
    { original: '醤油らーめん', translation: 'Soy sauce ramen', description: 'Noodles in a soy-sauce flavoured broth.', price: 900, containsPork: 'unknown', containsAlcohol: 'unknown' },
    { original: '鶏塩らーめん', translation: 'Chicken salt ramen', description: 'Noodles in a light, salt-seasoned chicken broth.', price: 950, containsPork: 'unknown', containsAlcohol: 'unknown' },
    { original: '野菜らーめん', translation: 'Vegetable ramen', description: 'Noodles topped with stir-fried vegetables.', price: 900, containsPork: 'unknown', containsAlcohol: 'unknown' },
    { original: '餃子 (6個)', translation: 'Gyoza (6 pieces)', description: 'Pan-fried dumplings.', price: 450, containsPork: 'unknown', containsAlcohol: 'no' },
    { original: '生ビール', translation: 'Draught beer', description: 'A glass of draught beer.', price: 600, containsPork: 'no', containsAlcohol: 'yes' },
    { original: 'ウーロン茶', translation: 'Oolong tea', description: 'Chilled oolong tea.', price: 300, containsPork: 'no', containsAlcohol: 'no' },
  ],
  pricesExcludeTax: true,
  addedTaxPercent: 10,
  serviceChargePercent: null,
  notes: ['Prices shown are before tax; 10% is added at the till.'],
  confidence: 1,
};

const thaiMenu: MenuExtraction = {
  isMenu: true,
  restaurantName: 'Krua Thai',
  currency: 'THB',
  language: 'th',
  dishes: [
    { original: 'ผัดไทยกุ้ง', translation: 'Pad Thai with prawns', description: 'Stir-fried rice noodles with prawns, egg and peanuts.', price: 180, containsPork: 'no', containsAlcohol: 'no' },
    { original: 'ต้มยำกุ้ง', translation: 'Tom yum goong', description: 'Hot and sour prawn soup with lemongrass.', price: 220, containsPork: 'no', containsAlcohol: 'no' },
    { original: 'ข้าวผัดสับปะรด', translation: 'Pineapple fried rice', description: 'Fried rice with pineapple, cashews and raisins.', price: 160, containsPork: 'unknown', containsAlcohol: 'no' },
    { original: 'หมูสะเต๊ะ', translation: 'Pork satay', description: 'Grilled pork skewers with peanut sauce.', price: 150, containsPork: 'yes', containsAlcohol: 'no' },
    { original: 'ส้มตำ', translation: 'Papaya salad', description: 'Spicy green papaya salad with lime and chilli.', price: 120, containsPork: 'unknown', containsAlcohol: 'no' },
    { original: 'เบียร์สิงห์', translation: 'Singha beer', description: 'A bottle of Thai lager.', price: 140, containsPork: 'no', containsAlcohol: 'yes' },
    { original: 'ชาไทยเย็น', translation: 'Thai iced tea', description: 'Sweet iced tea with milk.', price: 80, containsPork: 'no', containsAlcohol: 'no' },
  ],
  pricesExcludeTax: true,
  addedTaxPercent: 7,
  serviceChargePercent: 10,
  notes: ['Prices are "++": a 10% service charge and 7% VAT are added to the bill.'],
  confidence: 1,
};

export const SAMPLE_RECEIPTS = { 'drugstore-ginza': drugstore, 'convenience-store-shibuya': convenienceStore } as const;
export const SAMPLE_MENUS = { 'ramen-menu': ramenMenu, 'thai-menu': thaiMenu } as const;

export type SampleId = keyof typeof SAMPLE_RECEIPTS | keyof typeof SAMPLE_MENUS;

/** The printed contents of a sample, or null when the id is not a sample of that kind. */
export function sampleExtraction<K extends ScanKind>(kind: K, sampleId: string | undefined): ExtractionByKind[K] | null {
  if (!sampleId) return null;
  const table: Record<string, ExtractionByKind[ScanKind]> = kind === 'receipt' ? SAMPLE_RECEIPTS : SAMPLE_MENUS;
  return (Object.hasOwn(table, sampleId) ? table[sampleId] : null) as ExtractionByKind[K] | null;
}
