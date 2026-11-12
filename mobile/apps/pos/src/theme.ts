/**
 * How the till looks.
 *
 * Built for a counter, not a phone in a pocket: large touch targets because a
 * cashier is working fast and sometimes one-handed, and strong contrast
 * because shop lighting is unpredictable and a screen gets glare.
 */
export const colors = {
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',

  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',

  brand: '#4f46e5',
  brandDark: '#4338ca',
  brandSoft: '#eef2ff',

  success: '#059669',
  successSoft: '#ecfdf5',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  danger: '#e11d48',
  dangerSoft: '#fff1f2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Nothing the cashier taps is smaller than this. */
export const TOUCH_TARGET = 48;

export const typography = {
  display: { fontSize: 30, fontWeight: '800' as const },
  title: { fontSize: 20, fontWeight: '800' as const },
  heading: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '600' as const },
  tiny: { fontSize: 11, fontWeight: '700' as const },
  /** Totals and barcodes: a column of numbers has to line up to be read. */
  mono: { fontFamily: 'monospace' as const },
} as const;
