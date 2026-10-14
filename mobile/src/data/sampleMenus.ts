import type { ImageSourcePropType } from 'react-native';

import type { CurrencyCode } from '@/domain/money';

/**
 * Demo sample menus (brief §11: a Japanese ramen menu, and a Thai menu with "++" pricing).
 * Read by the real AI; if it cannot be reached, the backend answers with their printed contents
 * (backend/scan/samples.ts). Drawn by scripts/make-samples.ts and marked SAMPLE.
 */
export interface SampleMenu {
  /** Must match an id in backend/scan/samples.ts. */
  id: string;
  title: string;
  detail: string;
  /** The menu's currency, which may differ from the trip's (the Thai sample on a Tokyo trip). */
  currency: CurrencyCode;
  image: ImageSourcePropType;
}

export const sampleMenus: SampleMenu[] = [
  {
    id: 'ramen-menu',
    title: 'Ramen shop, Tokyo',
    detail: 'Prices before 10% tax',
    currency: 'JPY',
    image: require('@/assets/samples/menu-ramen.jpg'),
  },
  {
    id: 'thai-menu',
    title: 'Thai restaurant',
    detail: '"++": service and VAT added',
    currency: 'THB',
    image: require('@/assets/samples/menu-thai.jpg'),
  },
];
