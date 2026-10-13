/**
 * ITER design tokens (project brief §10). Screens and components read colours, spacing and
 * type sizes from here so the look can be changed in one place.
 */

export const colors = {
  /** Primary text, primary buttons, gradient base. */
  navy: '#053B50',
  /** Interactive elements and charts. */
  teal: '#176B87',
  /** Glows and highlights only. Never use for text on white (contrast 1.91:1). */
  aqua: '#64CCC5',
  /** Deeper aqua, used inside gradients. */
  aquaDeep: '#3F9FB0',
  /** Section background. */
  surface: '#EEEEEE',
  /** Cards. */
  card: '#FFFFFF',
  /** Secondary text. */
  textMuted: '#4E6B78',
  /** Chip background, paired with `chipText`. */
  chip: '#E6F5F4',
  chipText: '#0E5265',
  white: '#FFFFFF',
  border: '#D9E2E6',
  success: '#11634A',
  warning: '#8A5A00',
  warningSurface: '#FFF4D6',
  danger: '#B3261E',
  dangerSurface: '#FCE8E6',
  /** Shown around the app when it is opened on a wide desktop screen. */
  backdrop: '#DDE5E8',
} as const;

export const gradients = {
  /** Home header and Scan screen. */
  ocean: [colors.navy, colors.teal] as const,
  oceanDeep: [colors.navy, colors.teal, colors.aquaDeep] as const,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 44, lineHeight: 48, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Smallest allowed tap area, in points (WCAG 2.5.5 / brief §10). */
export const MIN_TOUCH_TARGET = 44;

/** On wide screens the app is shown as a phone-width column. */
export const MAX_APP_WIDTH = 480;

export const shadow = {
  card: {
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;
