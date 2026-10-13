import { AA_LARGE_TEXT, AA_NORMAL_TEXT, contrastRatio, relativeLuminance } from '../contrast';
import { colors, MIN_TOUCH_TARGET } from '../tokens';

describe('contrastRatio', () => {
  it('gives 21:1 for black on white and 1:1 for identical colours', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#176B87', '#176B87')).toBeCloseTo(1, 5);
  });

  it('is the same whichever colour is in front', () => {
    expect(contrastRatio(colors.navy, colors.card)).toBeCloseTo(contrastRatio(colors.card, colors.navy), 10);
  });

  it('rejects colours that are not #RRGGBB', () => {
    expect(() => relativeLuminance('teal')).toThrow();
    expect(() => relativeLuminance('#FFF')).toThrow();
  });

  it('matches the ratios quoted in the project brief', () => {
    expect(contrastRatio(colors.textMuted, colors.card)).toBeCloseTo(5.68, 1);
    expect(contrastRatio(colors.aqua, colors.card)).toBeCloseTo(1.91, 1);
  });
});

describe('ITER palette meets WCAG AA', () => {
  const textPairs: [name: string, foreground: string, background: string][] = [
    ['primary text on cards', colors.navy, colors.card],
    ['primary text on the page', colors.navy, colors.surface],
    ['primary text on sunken tiles', colors.navy, colors.surfaceSunken],
    ['muted text on cards', colors.textMuted, colors.card],
    ['muted text on the page', colors.textMuted, colors.surface],
    ['muted text on sunken tiles', colors.textMuted, colors.surfaceSunken],
    ['white text on the navy button', colors.white, colors.navy],
    ['white text on teal (lightest text area of the gradient)', colors.white, colors.teal],
    ['navy text on the accent fill', colors.navy, colors.accent],
    ['accent text on cards', colors.accentText, colors.card],
    ['accent text on the page', colors.accentText, colors.surface],
    ['accent text on the soft accent fill', colors.accentText, colors.accentSoft],
    ['teal links on cards', colors.teal, colors.card],
    ['warning text on warning surface', colors.warning, colors.warningSurface],
    ['danger text on danger surface', colors.danger, colors.dangerSurface],
  ];

  it.each(textPairs)('%s is at least 4.5:1', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('keeps aqua and the accent as fills only: both fail as text on white', () => {
    expect(contrastRatio(colors.aqua, colors.card)).toBeLessThan(AA_LARGE_TEXT);
    expect(contrastRatio(colors.accent, colors.card)).toBeLessThan(AA_LARGE_TEXT);
  });

  it('never puts white text on the accent fill', () => {
    expect(contrastRatio(colors.white, colors.accent)).toBeLessThan(AA_NORMAL_TEXT);
  });

  it('uses a touch target of at least 44 points', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });
});
