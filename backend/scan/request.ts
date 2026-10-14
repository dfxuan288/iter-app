import { z } from 'zod';

import { IMAGE_TYPES, type ScanImage } from './claude.js';
import { isCurrency } from './currency.js';
import type { ScanContext } from './normalize.js';

/**
 * Reads and checks a scan request from the app. Anything that does not look right is turned
 * away here, before it can cost money.
 */

/** The app shrinks photos to about 1,500 px first, which is far below this. */
export const MAX_IMAGE_BYTES = 3_000_000;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const bodySchema = z.object({
  /** Base64 image, with or without a `data:image/...;base64,` prefix. */
  image: z.string().min(16),
  mediaType: z.enum(IMAGE_TYPES),
  /** Set by the app when the image is one of the bundled demo samples. */
  sampleId: z.string().max(64).optional(),
  currencyHint: z.string().optional(),
  tripStart: isoDate.optional(),
  tripEnd: isoDate.optional(),
});

export interface ScanRequest {
  deviceId: string;
  image: ScanImage;
  bytes: Buffer;
  sampleId: string | undefined;
  context: ScanContext;
}

export type ParseResult = { ok: true; request: ScanRequest } | { ok: false; status: number; error: string; message: string };

/** Checks the first bytes of the file, so a file renamed to .jpg is not sent to the AI. */
function matchesType(bytes: Buffer, mediaType: ScanImage['mediaType']): boolean {
  switch (mediaType) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP';
  }
}

const bad = (message: string, error = 'bad_request', status = 400): ParseResult => ({ ok: false, status, error, message });

export async function parseScanRequest(request: Request): Promise<ParseResult> {
  const deviceId = request.headers.get('x-device-id')?.trim() ?? '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) return bad('This app could not identify itself. Reload the page and try again.');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad('The request was not valid JSON.');
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return bad('The photo could not be sent. Use a JPEG, PNG or WebP image.');
  const body = parsed.data;

  const data = body.image.replace(/^data:image\/[a-z]+;base64,/, '').replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return bad('The photo could not be read.');
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) return bad('That photo is too large. Try again with a smaller one.', 'too_large', 413);
  if (bytes.length < 100 || !matchesType(bytes, body.mediaType)) return bad('The photo could not be read. Use a JPEG, PNG or WebP image.');

  return {
    ok: true,
    request: {
      deviceId,
      image: { data, mediaType: body.mediaType },
      bytes,
      sampleId: body.sampleId,
      context: {
        currencyHint: isCurrency(body.currencyHint) ? body.currencyHint : undefined,
        tripStart: body.tripStart,
        tripEnd: body.tripEnd,
      },
    },
  };
}
