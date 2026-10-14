import type { ImageSourcePropType } from 'react-native';

/**
 * Demo sample receipts (brief §7 demo controls: "inject a sample receipt image"), for showing
 * scanning without a real receipt. They are read by the real AI; if the AI cannot be reached the
 * backend answers with their printed contents (backend/scan/samples.ts). Drawn by
 * scripts/make-samples.ts and marked SAMPLE.
 */
export interface SampleReceipt {
  /** Must match an id in backend/scan/samples.ts. */
  id: string;
  title: string;
  detail: string;
  image: ImageSourcePropType;
}

export const sampleReceipts: SampleReceipt[] = [
  {
    id: 'drugstore-ginza',
    title: 'Drugstore, Ginza',
    detail: 'Over ¥5,000, at a tax-free shop',
    image: require('@/assets/samples/receipt-drugstore-ginza.jpg'),
  },
  {
    id: 'convenience-store-shibuya',
    title: 'Convenience store',
    detail: 'Breakfast, tax already included',
    image: require('@/assets/samples/receipt-convenience-store-shibuya.jpg'),
  },
];
