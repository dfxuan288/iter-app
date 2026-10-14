import { MODELS, type ExtractionByKind, type ModelId, type ReadImage, type ScanImage, type ScanKind } from './claude.js';
import { checkMenu, checkReceipt, errorCount, needsSecondLook, type Checked, type ScanContext, type ScannedMenu, type ScannedReceipt } from './normalize.js';

/** The checked result for each kind of scan. */
export interface ResultByKind {
  receipt: ScannedReceipt;
  menu: ScannedMenu;
}

export function checkExtraction<K extends ScanKind>(kind: K, extraction: ExtractionByKind[K], context: ScanContext): Checked<ResultByKind[K]> {
  return (kind === 'receipt'
    ? checkReceipt(extraction as ExtractionByKind['receipt'], context)
    : checkMenu(extraction as ExtractionByKind['menu'], context)) as Checked<ResultByKind[K]>;
}

export interface ScanAttempt<K extends ScanKind> {
  extraction: ExtractionByKind[K];
  checked: Checked<ResultByKind[K]>;
  modelUsed: ModelId;
  /** True when Sonnet was asked for a second look, whichever reading was kept. */
  escalated: boolean;
}

/**
 * Reads an image with Haiku. If the reading is unsure or does not add up, asks Sonnet once and
 * keeps whichever reading has fewer problems (Sonnet's when they tie). Throws only when neither
 * model could give an answer.
 */
export async function scanWithSecondLook<K extends ScanKind>(kind: K, image: ScanImage, context: ScanContext, read: ReadImage): Promise<ScanAttempt<K>> {
  let first: ScanAttempt<K> | null = null;
  try {
    const extraction = await read(kind, MODELS.first, image, context);
    first = { extraction, checked: checkExtraction(kind, extraction, context), modelUsed: MODELS.first, escalated: false };
    if (!needsSecondLook(first.checked, extraction.confidence)) return first;
  } catch (error) {
    console.error(`[scan] ${MODELS.first} failed`, error);
  }

  try {
    const extraction = await read(kind, MODELS.careful, image, context);
    const second: ScanAttempt<K> = { extraction, checked: checkExtraction(kind, extraction, context), modelUsed: MODELS.careful, escalated: true };
    if (!first || errorCount(second.checked) <= errorCount(first.checked)) return second;
    return { ...first, escalated: true };
  } catch (error) {
    console.error(`[scan] ${MODELS.careful} failed`, error);
    if (first) return { ...first, escalated: true };
    throw new Error('Neither model could read the image', { cause: error });
  }
}
