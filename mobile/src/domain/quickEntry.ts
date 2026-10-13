import { currencies, toMinor, type CurrencyCode } from '@/domain/money';
import type { Category } from '@/domain/types';

/**
 * Reads a quick note like "1200 yen ramen" into an expense. Plain pattern matching, no AI:
 * it must work offline and give the same answer every time.
 */

export interface QuickEntry {
  /** In the minor unit of `currency`. */
  amountMinor: number;
  currency: CurrencyCode;
  /** True when the text named a currency; false when the trip's currency was assumed. */
  currencyStated: boolean;
  /** What is left of the text once the amount and currency are removed. */
  description: string;
  /** A category guessed from the description, if a keyword matched. */
  category: Category | null;
}

const currencyWords: Record<CurrencyCode, string[]> = {
  MYR: ['myr', 'rm', 'ringgit'],
  JPY: ['jpy', 'yen', '¥', '円'],
  THB: ['thb', 'baht', '฿'],
  SGD: ['sgd', 's$', 'sing dollars', 'sing dollar'],
  IDR: ['idr', 'rupiah', 'rp'],
  VND: ['vnd', 'dong', '₫'],
  USD: ['usd', 'us$', 'dollars', 'dollar', '$'],
  EUR: ['eur', 'euros', 'euro', '€'],
  KRW: ['krw', 'won', '₩'],
};

const categoryWords: Record<Category, string[]> = {
  food: [
    'ramen', 'sushi', 'lunch', 'dinner', 'breakfast', 'brunch', 'coffee', 'cafe', 'tea', 'snack', 'snacks', 'food',
    'meal', 'restaurant', 'drink', 'drinks', 'beer', 'bar', 'noodle', 'noodles', 'rice', 'curry', 'pizza', 'burger',
    'bakery', 'dessert', 'supper', 'bubble tea', 'boba', 'street food', 'convenience store', 'groceries',
  ],
  transport: [
    'train', 'metro', 'subway', 'mrt', 'bus', 'taxi', 'grab', 'uber', 'flight', 'ferry', 'boat', 'tram', 'fare',
    'suica', 'pasmo', 'top-up', 'topup', 'top up', 'petrol', 'fuel', 'parking', 'toll', 'shinkansen', 'tuk tuk', 'tuktuk',
  ],
  stay: ['hotel', 'hostel', 'airbnb', 'guesthouse', 'ryokan', 'resort', 'room', 'accommodation', 'lodging', 'villa'],
  activities: [
    'ticket', 'tickets', 'museum', 'tour', 'temple', 'shrine', 'show', 'concert', 'park', 'zoo', 'aquarium', 'onsen',
    'spa', 'massage', 'cinema', 'movie', 'karaoke', 'entrance', 'admission', 'class', 'diving', 'snorkeling', 'hike',
  ],
  shopping: [
    'souvenir', 'souvenirs', 'gift', 'gifts', 'clothes', 'shirt', 'shoes', 'bag', 'uniqlo', 'cosmetics', 'skincare',
    'electronics', 'camera', 'shopping', 'mall', 'market', 'pharmacy', 'toy', 'toys', 'book', 'books', 'jacket',
  ],
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Matches a word that is not part of a longer word, so "bar" is not found inside "barber". */
const wholeWord = (word: string) => new RegExp(`(^|[^a-z])${escapeRegExp(word)}($|[^a-z])`, 'i');

/** Finds a currency word or symbol, preferring longer matches so "s$" wins over "$". */
function findCurrency(text: string): { currency: CurrencyCode; match: string } | null {
  const candidates = (Object.keys(currencyWords) as CurrencyCode[])
    .flatMap((currency) => currencyWords[currency].map((word) => ({ currency, word })))
    .sort((a, b) => b.word.length - a.word.length);
  for (const { currency, word } of candidates) {
    const isSymbol = !/[a-z]/i.test(word.replace(/\$/g, '')) || word.endsWith('$');
    // A symbol can touch the number ("¥1200"); a word must stand alone, or directly follow digits ("1200yen").
    const pattern = isSymbol ? new RegExp(escapeRegExp(word), 'i') : new RegExp(`(^|[^a-z])${escapeRegExp(word)}($|[^a-z])`, 'i');
    if (pattern.test(text)) return { currency, match: word };
  }
  return null;
}

export function guessCategory(description: string): Category | null {
  const text = description.toLowerCase();
  for (const category of Object.keys(categoryWords) as Category[]) {
    if (categoryWords[category].some((word) => wholeWord(word).test(text))) return category;
  }
  return null;
}

/**
 * Returns null when no amount can be found. `defaultCurrency` (the trip's currency) is used when
 * the text does not name one.
 */
export function parseQuickEntry(input: string, defaultCurrency: CurrencyCode): QuickEntry | null {
  const text = input.trim();
  if (text === '') return null;

  const found = findCurrency(text);
  const currency = found?.currency ?? defaultCurrency;
  let rest = text;
  if (found) {
    rest = rest.replace(new RegExp(escapeRegExp(found.match), 'i'), ' ');
  }

  // First number in the text: "1,200", "1200.50", or a short form such as "1.2k".
  const amountMatch = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(k)?(?![a-z])/i.exec(rest);
  if (!amountMatch) return null;
  const value = Number(`${(amountMatch[1] ?? '').replace(/,/g, '')}${amountMatch[2] ?? ''}`) * (amountMatch[3] ? 1000 : 1);
  if (!Number.isFinite(value) || value <= 0) return null;

  const amountMinor = toMinor(value, currency);
  // A fraction of the smallest unit ("12.5 yen") is not a real amount.
  if (currencies[currency].minorDigits === 0 && !Number.isInteger(value)) return null;
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;

  const description = rest
    .replace(amountMatch[0], ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,:;-]+|[\s,:;-]+$/g, '');

  return { amountMinor, currency, currencyStated: found !== null, description, category: guessCategory(description) };
}
