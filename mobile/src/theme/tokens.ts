/**
 * ITER design tokens. Screens and components read colours, spacing and type from here so the
 * look can be changed in one place. The direction is described in docs/DESIGN.md.
 */

export const colors = {
  /** Primary text and the main (pill) button. */
  navy: '#053B50',
  /** Brand secondary. Used inside the ocean gradient and for links. */
  teal: '#176B87',
  /** Glows inside the ocean gradient only. Never text on white (contrast 1.91:1). */
  aqua: '#64CCC5',
  aquaDeep: '#3F9FB0',
  /** The single bright accent (the logo's green). A fill colour: put navy text on it, never white. */
  accent: '#00B894',
  accentSoft: '#D6F3EC',
  /** Accent-coloured text that is readable on white and on the page background. */
  accentText: '#00735E',
  /** Page background: a soft aqua tint rather than plain grey. */
  surface: '#EDF5F4',
  /** Tiles and chips that sit on a white card. */
  surfaceSunken: '#E1EDEC',
  card: '#FFFFFF',
  textMuted: '#4E6B78',
  white: '#FFFFFF',
  border: '#D3E0E0',
  warning: '#8A5A00',
  warningSurface: '#FFF4D6',
  danger: '#B3261E',
  dangerSurface: '#FCE8E6',
  /** Shown around the app when it is opened on a wide desktop screen. */
  backdrop: '#D5E3E2',
  /** Frosted-glass surfaces. Only ever used on top of the ocean gradient. */
  glass: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.34)',
  glassText: 'rgba(255,255,255,0.86)',
  /** Chips placed directly on a photo. */
  photoChip: 'rgba(5,59,80,0.62)',
} as const;

export const gradients = {
  /** Safe-to-spend card and the Scan screen. */
  ocean: [colors.navy, colors.teal, colors.aquaDeep] as const,
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

/**
 * One shape rule for the whole app: anything you tap is a pill, containers are `card`,
 * and blocks nested inside a container are `tile`.
 */
export const radius = {
  tile: 20,
  card: 28,
  pill: 999,
} as const;

/** Outfit for headings and numbers; the phone's own font for reading text. */
export const fonts = {
  displayMedium: 'Outfit_500Medium',
  displaySemiBold: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.displaySemiBold, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  title: { fontFamily: fonts.displaySemiBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.displaySemiBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  number: { fontFamily: fonts.displaySemiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Smallest allowed tap area, in points (WCAG 2.5.5). */
export const MIN_TOUCH_TARGET = 44;

/** On wide screens the app is shown as a phone-width column. */
export const MAX_APP_WIDTH = 480;

/** Space screens leave at the bottom so content clears the floating tab bar. */
export const TAB_BAR_CLEARANCE = 148;

/** Shadows are tinted navy, never pure black. */
export const shadow = {
  card: {
    shadowColor: colors.navy,
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  raised: {
    shadowColor: colors.navy,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

/** Motion timings shared by every animation, so the app moves as one. */
export const motion = {
  enterMs: 420,
  staggerMs: 70,
  pressSpring: { damping: 22, stiffness: 320 },
  /** The spring back after a tap: quick, with a small bounce so the release is felt. */
  releaseSpring: { damping: 11, stiffness: 420, mass: 0.7 },
} as const;
