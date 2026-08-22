/**
 * The shop's colours, lifted from the website's stylesheet so the two look
 * like one brand rather than two products that happen to share a logo.
 *
 * The names match the web palette (`candy`, `bubble`, `sunny`, `grape`, `ink`)
 * so a screen can be read next to its web counterpart without translating.
 */
export const colors = {
  candy: {
    50: '#FFF6F9',
    100: '#FFEBF2',
    200: '#FFD3E2',
    300: '#FFB3D9',
    400: '#FF9FC0',
    500: '#FF8FAB',
    600: '#E0607A',
    700: '#C0506A',
    800: '#9C3E54',
  },
  sunny: {
    50: '#FFFBF2',
    100: '#FFF6E0',
    200: '#FFECBE',
    400: '#FFB347',
    500: '#FFD166',
    600: '#E0A020',
    700: '#B87F14',
  },
  bubble: {
    50: '#F4FBFF',
    100: '#E7F7FE',
    200: '#CFEFFB',
    500: '#9EE5FF',
    600: '#5DB8D4',
    700: '#3E93AE',
  },
  grape: {
    50: '#FAF5FF',
    100: '#F5EBFF',
    200: '#EBD9FF',
    500: '#D4A5FF',
    600: '#B07FD4',
    700: '#8E5CB4',
  },
  mint: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    600: '#059669',
    700: '#06805F',
  },
  ink: {
    500: '#6E7391',
    900: '#2B2D42',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    600: '#E11D48',
    700: '#BE123C',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    700: '#B45309',
  },
  white: '#FFFFFF',
  black: '#000000',
  /** The page behind everything; the web uses a very soft pink-to-white wash. */
  background: '#FFFBFC',
  surface: '#FFFFFF',
  border: 'rgba(226,232,240,0.9)',
} as const;

/**
 * One radius scale, because the web's look comes largely from how round
 * everything is: pills for actions, deep rounding for cards.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

/**
 * Type sizes. Kurdish and Arabic sit lower on the line than Latin text, so
 * every size carries a line height rather than leaving it to the platform —
 * without one, descenders on Arabic script get clipped on Android.
 */
export const type = {
  xs: { fontSize: 11, lineHeight: 18 },
  sm: { fontSize: 13, lineHeight: 21 },
  base: { fontSize: 15, lineHeight: 24 },
  lg: { fontSize: 17, lineHeight: 27 },
  xl: { fontSize: 20, lineHeight: 30 },
  '2xl': { fontSize: 24, lineHeight: 34 },
  '3xl': { fontSize: 30, lineHeight: 40 },
} as const;

/**
 * Shadows. Android reads `elevation` and ignores the rest; iOS is the other
 * way round, so both are given.
 */
export const shadow = {
  sm: {
    shadowColor: '#8A94A6',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#8A94A6',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  candy: {
    shadowColor: colors.candy[600],
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const theme = { colors, radius, spacing, type, shadow };
export type Theme = typeof theme;
