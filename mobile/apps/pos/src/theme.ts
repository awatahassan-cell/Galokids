/**
 * How the till looks.
 *
 * The web back office's palette, so a shopkeeper moving between the panel on a
 * laptop and the till on the counter is looking at one system: slate for the
 * page and the text, near-black for the thing that is selected, and indigo as
 * the single accent. Red stays a danger signal and is never decoration.
 *
 * Built for a counter rather than a pocket: large touch targets because a
 * cashier is working fast and sometimes one-handed, and strong contrast
 * because shop lighting is unpredictable and a screen gets glare.
 */
export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',

  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',

  /** The accent. Icons, links, the selected chip. */
  brand: '#4f46e5',
  brandDark: '#4338ca',
  brandSoft: '#eef2ff',
  /** Lighter indigo, for an icon sitting on the near-black selected row. */
  brandOnDark: '#a5b4fc',

  /**
   * The panel's selected state is slate-900, not indigo: a dark row reads as
   * "you are here" without spending the accent colour, which is then free to
   * mean something on the screen itself.
   */
  ink: '#0f172a',

  success: '#059669',
  successSoft: '#ecfdf5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  danger: '#e11d48',
  dangerSoft: '#fff1f2',

  /** The channels, coloured the way the panel's revenue cards are. */
  channelPos: '#0f172a',
  channelWeb: '#6d28d9',
  channelSocial: '#e11d48',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** The panel rounds at 16 for rows and cards, 24 for panels. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

/** Nothing the cashier taps is smaller than this. */
export const TOUCH_TARGET = 48;

/**
 * IBM Plex Sans Arabic.
 *
 * Each weight is named explicitly rather than set with `fontWeight`, because
 * React Native does not synthesize weights for a bundled font: asking for
 * `fontWeight: '800'` on a family that only ships Regular gives you Regular,
 * silently, and the app looks flat with no error anywhere.
 */
export const fonts = {
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  semibold: 'IBMPlexSansArabic-SemiBold',
  bold: 'IBMPlexSansArabic-Bold',
} as const;

export const typography = {
  display: { fontSize: 26, fontFamily: fonts.bold, lineHeight: 38 },
  title: { fontSize: 18, fontFamily: fonts.bold, lineHeight: 28 },
  heading: { fontSize: 15, fontFamily: fonts.semibold, lineHeight: 24 },
  body: { fontSize: 14, fontFamily: fonts.medium, lineHeight: 23 },
  small: { fontSize: 12.5, fontFamily: fonts.medium, lineHeight: 20 },
  /**
   * Arabic script needs more line height than Latin at the same size, or the
   * descenders of a word like "داواکاری" are clipped on a badge.
   */
  tiny: { fontSize: 10.5, fontFamily: fonts.semibold, lineHeight: 17 },
  /** The panel's section headings: small, spaced, quiet. */
  eyebrow: { fontSize: 10, fontFamily: fonts.bold, lineHeight: 16, letterSpacing: 1.2 },
  /** Totals and barcodes: a column of numbers has to line up to be read. */
  mono: { fontFamily: 'monospace' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
