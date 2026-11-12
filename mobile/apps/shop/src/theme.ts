/**
 * How the shop looks.
 *
 * Taken from the website rather than invented, so a customer who browsed on
 * galokids.com and then installed the app does not feel they have arrived
 * somewhere else. The values are the same ones `src/index.css` defines for the
 * storefront: the candy/sunny/bubble/grape pastels, ink for text, and the
 * near-white `#fafbfc` page.
 *
 * Kurdish and Arabic read right to left, so every row that pairs a label with
 * a value is laid out `row-reverse` rather than mirrored case by case.
 */

export const colors = {
  /** The storefront page colour, under the soft wash. */
  background: '#fafbfc',
  surface: '#ffffff',
  /** slate-100: the hairline every card on the website is drawn with. */
  border: '#f1f5f9',
  borderStrong: '#e2e8f0',

  /** ink-900 / ink-500 — the website's two text tones. */
  text: '#2B2D42',
  textMuted: '#6E7391',
  textFaint: '#9AA0B8',

  /**
   * Candy pink. 500 is the fill, 700 is the tone that actually passes
   * contrast on white — so a pink button gets `brand`, and pink *text* gets
   * `brandText`. Using 500 for both is what makes a pastel site look washed
   * out and unreadable.
   */
  brand: '#FF8FAB',
  brandDeep: '#E0607A',
  brandText: '#C0506A',
  brandSoft: '#FFF6F9',
  brandLine: '#FFD3E2',

  /**
   * The website's primary button is ink, not pink: a dark navy reads as the
   * action and leaves pink to be decorative.
   */
  ink: '#2B2D42',

  sunny: '#FFD166',
  sunnySoft: '#FFFBF2',
  sunnyLine: '#FFECBE',
  sunnyText: '#B87F14',

  bubble: '#9EE5FF',
  bubbleSoft: '#F4FBFF',
  bubbleLine: '#CFEFFB',
  bubbleText: '#3E93AE',

  grape: '#D4A5FF',
  grapeSoft: '#FAF5FF',
  grapeLine: '#EBD9FF',
  grapeText: '#8E5CB4',

  mint: '#06D6A0',
  mintSoft: '#ECFDF7',
  mintText: '#06805F',

  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** The website rounds generously: cards at 24, controls at 16, pills at 999. */
export const radius = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 } as const;

export const TOUCH_TARGET = 48;

/**
 * IBM Plex Sans Arabic.
 *
 * Each weight is named explicitly rather than set with `fontWeight`, because
 * React Native does not synthesize weights for a bundled font: asking for
 * `fontWeight: '800'` on a family that only ships Regular gives you Regular,
 * silently, and the app ends up looking flat with no error anywhere.
 */
export const fonts = {
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  semibold: 'IBMPlexSansArabic-SemiBold',
  bold: 'IBMPlexSansArabic-Bold',
} as const;

export const typography = {
  display: { fontSize: 25, fontFamily: fonts.bold, lineHeight: 36 },
  title: { fontSize: 18, fontFamily: fonts.bold, lineHeight: 28 },
  heading: { fontSize: 15, fontFamily: fonts.semibold, lineHeight: 24 },
  body: { fontSize: 14, fontFamily: fonts.medium, lineHeight: 23 },
  small: { fontSize: 12.5, fontFamily: fonts.medium, lineHeight: 20 },
  /**
   * The website's smallest label, used on badges and tab captions. Arabic
   * script needs more line height than Latin at the same size or the
   * descenders of a word like "داواکاری" are clipped.
   */
  tiny: { fontSize: 10.5, fontFamily: fonts.semibold, lineHeight: 17 },
  /** Prices and totals. */
  price: { fontSize: 15, fontFamily: fonts.bold, lineHeight: 24 },
  mono: { fontFamily: 'monospace' as const },
} as const;

/** The card lift the website gives every tile. */
export const shadow = {
  card: {
    shadowColor: '#2B2D42',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#2B2D42',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;

/**
 * The pastel wash behind a product photo.
 *
 * The website picks one of five per product from its id, so a grid reads as a
 * set rather than a row of grey boxes, and a product keeps the same colour
 * every time it is seen. Same list, same rule.
 */
const MEDIA_WASHES = [
  ['#FFF6F9', '#FFD3E2'],
  ['#F4FBFF', '#CFEFFB'],
  ['#FFFBF2', '#FFECBE'],
  ['#FAF5FF', '#EBD9FF'],
  ['#ECFDF7', '#E6FBF3'],
] as const;

export function mediaWash(seed: number | string): readonly [string, string] {
  const text = String(seed ?? '1');
  const sum = [...text].reduce((total, character) => total + character.charCodeAt(0), 0);

  return MEDIA_WASHES[sum % MEDIA_WASHES.length]!;
}
