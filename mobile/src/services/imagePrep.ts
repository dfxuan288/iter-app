import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

/**
 * Shrinks photos before they are stored or sent (brief §5.3: about 1,500 px on the long edge
 * keeps scans cheap and fast without losing the small print).
 */

export interface PreparedImage {
  /** JPEG, base64 without a data: prefix. */
  base64: string;
  width: number;
  height: number;
}

/** Long edge for the copy sent to the AI. */
export const SCAN_LONG_EDGE = 1500;
/** Long edge for the copy kept with the expense: readable on a phone, small to store. */
export const KEEP_LONG_EDGE = 900;

/** Shrinks an already-loaded photo so its long edge is at most `longEdge`, and saves it as JPEG. */
async function resized(original: ImageRef, longEdge: number, compress: number): Promise<PreparedImage> {
  const { width, height } = original;
  let image = original;
  if (Math.max(width, height) > longEdge) {
    image = await ImageManipulator.manipulate(original)
      .resize(width >= height ? { width: longEdge } : { height: longEdge })
      .renderAsync();
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
  if (!saved.base64) throw new Error('The photo could not be converted');
  return { base64: saved.base64.replace(/^data:image\/[a-z]+;base64,/, ''), width: saved.width, height: saved.height };
}

/** Makes the copy sent for scanning and the smaller copy kept with the expense. The photo is loaded once. */
export async function prepareReceiptPhoto(uri: string): Promise<{ scan: PreparedImage; keep: PreparedImage }> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const [scan, keep] = await Promise.all([resized(original, SCAN_LONG_EDGE, 0.8), resized(original, KEEP_LONG_EDGE, 0.65)]);
  return { scan, keep };
}
