import type { Language } from '../i18n/strings';

/**
 * Colours and sizes, named the way the website names them.
 *
 * Shops type a colour in whichever language they were working in, so the same
 * variation arrives as "Red", "سوور" or "أحمر". These tables are copied from
 * the website's `utils/colors.ts` so a swatch is the same shade and the same
 * word in both places.
 */

const COLOURS: Record<string, { hex: string; ku: string; ar: string; en: string }> = {
  red: { hex: '#ef4444', ku: 'سوور', ar: 'أحمر', en: 'Red' },
  blue: { hex: '#3b82f6', ku: 'شین', ar: 'أزرق', en: 'Blue' },
  green: { hex: '#22c55e', ku: 'سەوز', ar: 'أخضر', en: 'Green' },
  yellow: { hex: '#eab308', ku: 'زەرد', ar: 'أصفر', en: 'Yellow' },
  black: { hex: '#000000', ku: 'ڕەش', ar: 'أسود', en: 'Black' },
  white: { hex: '#ffffff', ku: 'سپی', ar: 'أبيض', en: 'White' },
  pink: { hex: '#ec4899', ku: 'پەمەیی', ar: 'وردي', en: 'Pink' },
  purple: { hex: '#a855f7', ku: 'مۆر', ar: 'بنفسجي', en: 'Purple' },
  orange: { hex: '#f97316', ku: 'پرتەقاڵی', ar: 'برتقالي', en: 'Orange' },
  gray: { hex: '#6b7280', ku: 'ڕەساسی', ar: 'رمادي', en: 'Gray' },
  grey: { hex: '#6b7280', ku: 'ڕەساسی', ar: 'رمادي', en: 'Grey' },
  brown: { hex: '#92400e', ku: 'قاوەیی', ar: 'بني', en: 'Brown' },
  navy: { hex: '#1e3a8a', ku: 'نیلی', ar: 'كحلي', en: 'Navy' },
  beige: { hex: '#fef3c7', ku: 'بێجی', ar: 'بيج', en: 'Beige' },
  sky: { hex: '#38bdf8', ku: 'شینی ئاسمانی', ar: 'أزرق سماوي', en: 'Sky blue' },
  'sky blue': { hex: '#38bdf8', ku: 'شینی ئاسمانی', ar: 'أزرق سماوي', en: 'Sky blue' },
};

/** Every spelling of a colour, in any of the three languages, to its entry. */
const BY_ANY_NAME = (() => {
  const index: Record<string, (typeof COLOURS)[string]> = {};
  Object.entries(COLOURS).forEach(([key, entry]) => {
    index[key] = entry;
    index[entry.ku] = entry;
    index[entry.ar] = entry;
    index[entry.en.toLowerCase()] = entry;
  });
  return index;
})();

export function colourHex(name?: string | null): string {
  if (!name) return '#cbd5e1';

  const trimmed = String(name).trim();
  // A shop that typed a hex code meant that exact colour.
  if (/^#|^rgb|^hsl/i.test(trimmed)) return trimmed;

  return BY_ANY_NAME[trimmed.toLowerCase()]?.hex ?? '#cbd5e1';
}

export function localisedColour(name: string | undefined, language: Language): string {
  if (!name) return '';
  const entry = BY_ANY_NAME[String(name).trim().toLowerCase()];
  if (!entry) return name;
  return language === 'ku' ? entry.ku : language === 'ar' ? entry.ar : entry.en;
}

/**
 * Sizes are mostly ranges a shop typed itself ("2-3", "4-5"), so they are
 * shown as written. Only the word-sizes have translations worth giving.
 */
const SIZES: Record<string, { ku: string; ar: string; en: string }> = {
  xs: { ku: 'زۆر بچووک', ar: 'صغير جداً', en: 'XS' },
  s: { ku: 'بچووک', ar: 'صغير', en: 'S' },
  m: { ku: 'ناوەند', ar: 'وسط', en: 'M' },
  l: { ku: 'گەورە', ar: 'كبير', en: 'L' },
  xl: { ku: 'زۆر گەورە', ar: 'كبير جداً', en: 'XL' },
  newborn: { ku: 'نۆزاد', ar: 'حديث الولادة', en: 'Newborn' },
};

export function localisedSize(size: string | undefined, language: Language): string {
  if (!size) return '';
  const entry = SIZES[String(size).trim().toLowerCase()];
  if (!entry) return size;
  return language === 'ku' ? entry.ku : language === 'ar' ? entry.ar : entry.en;
}

/** "Red / 2-3", for a cart line or a receipt. */
export function variationLabel(
  colour: string | undefined,
  size: string | undefined,
  language: Language
): string {
  return [localisedColour(colour, language), localisedSize(size, language)]
    .filter(Boolean)
    .join(' · ');
}
