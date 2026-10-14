import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { MENU_PROMPT, RECEIPT_PROMPT, contextLine } from './prompts.js';
import { menuExtraction, receiptExtraction, type MenuExtraction, type ReceiptExtraction } from './schema.js';
import type { ScanContext } from './normalize.js';

/**
 * Calls Claude to read an image. Haiku reads every scan; Sonnet is only asked when Haiku's
 * reading looks doubtful (brief §5.3). The API key comes from the server's environment only.
 */

export const MODELS = {
  /** Fast and cheap: reads every scan first. */
  first: 'claude-haiku-5-5',
  /** More careful: a second look when the first reading is unsure or does not add up. */
  careful: 'claude-sonnet-5-5',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
export type ScanKind = 'receipt' | 'menu';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export interface ScanImage {
  /** Base64, without a data: prefix. */
  data: string;
  mediaType: ImageType;
}

export interface ExtractionByKind {
  receipt: ReceiptExtraction;
  menu: MenuExtraction;
}

/** Reads one image with one model. Throws when the model cannot give a usable answer. */
export type ReadImage = <K extends ScanKind>(kind: K, model: ModelId, image: ScanImage, context: ScanContext) => Promise<ExtractionByKind[K]>;

/** Seconds are precious during a demo: give up on a slow answer rather than hang. */
const TIMEOUT_MS = 40_000;

export function claudeReader(apiKey: string): ReadImage {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });

  return async (kind, model, image, context) => {
    const careful = model === MODELS.careful;
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 12_000,
      // Thinking is adaptive on both models; effort sets how hard they look.
      output_config: {
        effort: careful ? 'medium' : 'low',
        format: betaZodOutputFormat(kind === 'receipt' ? receiptExtraction : menuExtraction),
      },
      // If Sonnet declines (very unlikely for a receipt), the API retries on another model by itself.
      ...(careful ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      system: kind === 'receipt' ? RECEIPT_PROMPT : MENU_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: contextLine(context) },
          ],
        },
      ],
    });
    // For checking the cost estimate in brief §5.3 against real scans (Vercel -> Logs).
    console.info(`[scan] ${kind} ${response.model}: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out, ${response.stop_reason}`);
    if (response.stop_reason === 'refusal') throw new Error(`${model} declined to read the image`);
    if (response.stop_reason === 'max_tokens') throw new Error(`${model} ran out of room before finishing`);
    if (!response.parsed_output) throw new Error(`${model} did not return the expected JSON`);
    return response.parsed_output as ExtractionByKind[typeof kind];
  };
}
