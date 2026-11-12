/**
 * How the shop looks.
 *
 * A children's clothes shop, so warmer and softer than the till — this is a
 * place to browse, not a tool to work fast with. Kurdish and Arabic read
 * right to left, so every row that pairs a label with a value is laid out
 * `row-reverse` rather than mirrored case by case.
 */
export const colors = {
  background: '#fffdfb',
  surface: '#ffffff',
  border: '#f1e8ea',

  text: '#1f1420',
  textMuted: '#7c6b7a',
  textFaint: '#b3a6b1',

  brand: '#e11d74',
  brandDark: '#be185d',
  brandSoft: '#fdf2f8',

  accent: '#7c3aed',
  success: '#059669',
  successSoft: '#ecfdf5',
  danger: '#e11d48',
  dangerSoft: '#fff1f2',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const TOUCH_TARGET = 48;

export const typography = {
  display: { fontSize: 26, fontWeight: '800' as const },
  title: { fontSize: 19, fontWeight: '800' as const },
  heading: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '600' as const },
  tiny: { fontSize: 11, fontWeight: '700' as const },
} as const;
