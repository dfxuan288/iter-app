/** WCAG 2.x contrast maths, used by tests to keep the colour palette accessible. */

function channelToLinear(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#RRGGBB` colour, from 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #RRGGBB colour, got "${hex}"`);
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => channelToLinear(parseInt(part as string, 16)));
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** WCAG AA minimum for normal-size text. */
export const AA_NORMAL_TEXT = 4.5;
/** WCAG AA minimum for large text (24px+, or 18.66px+ bold) and UI graphics. */
export const AA_LARGE_TEXT = 3;
