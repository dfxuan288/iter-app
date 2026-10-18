import { Asset } from 'expo-asset';

/**
 * Photos of the demo trip's four scanned receipts, bundled with the app (drawn by
 * scripts/make-samples.ts to match the receipt details in data/seed.ts). Their image ids start with
 * "demo:", so they load from the app itself rather than the phone's photo store.
 */
const PHOTOS: Record<string, number> = {
  'demo:uniqlo-ginza': require('@/assets/demo-receipts/uniqlo-ginza.jpg'),
  'demo:bic-camera-shinjuku': require('@/assets/demo-receipts/bic-camera-shinjuku.jpg'),
  'demo:ichiran-shibuya': require('@/assets/demo-receipts/ichiran-shibuya.jpg'),
  'demo:don-quijote-shibuya': require('@/assets/demo-receipts/don-quijote-shibuya.jpg'),
};

/** The demo photo id for a demo merchant, e.g. "UNIQLO Ginza" → "demo:uniqlo-ginza". */
export const demoReceiptPhotoId = (merchantName: string): string | null => {
  const id = `demo:${merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return id in PHOTOS ? id : null;
};

export const isDemoPhotoId = (id: string) => id.startsWith('demo:');

/** The address of a bundled demo photo, or null for any other id. */
export function demoPhotoUri(id: string): string | null {
  const photo = PHOTOS[id];
  return photo === undefined ? null : Asset.fromModule(photo).uri;
}
