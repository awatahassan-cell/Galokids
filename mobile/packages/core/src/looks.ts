import { apiRequest } from './client';
import type { Look, LookInput } from './types';

/**
 * "Try the Look".
 *
 * Shoppers get only the looks that are switched on and only the pieces that
 * are still on sale; the back office asks for everything with `all`.
 */
export const looks = {
  list: (all = false) =>
    apiRequest<Look[]>('looks', { query: { all: all ? 1 : undefined }, anonymous: !all }),

  create: (input: LookInput) => apiRequest<Look>('looks', { method: 'POST', body: input }),

  update: (id: number, input: LookInput) =>
    apiRequest<Look>(`looks/${id}`, { method: 'PUT', body: input }),

  remove: (id: number) => apiRequest<void>(`looks/${id}`, { method: 'DELETE' }),

  /** The order the shop shows them in. */
  reorder: (ids: number[]) =>
    apiRequest<void>('looks/reorder', { method: 'POST', body: { ids } }),
};

/** Turn a look the server sent into the body that saves it back unchanged. */
export function lookToInput(look: Look): LookInput {
  return {
    title: look.title,
    title_ku: look.title_ku,
    title_ar: look.title_ar,
    subtitle: look.subtitle,
    subtitle_ku: look.subtitle_ku,
    subtitle_ar: look.subtitle_ar,
    gender: look.gender,
    age_range: look.age_range,
    accent_color: look.accent_color,
    image_url: look.image_url,
    is_active: look.is_active,
    items: look.items.map(item => ({
      product_id: item.product_id,
      slot: item.slot,
      hotspot_x: item.hotspot_x,
      hotspot_y: item.hotspot_y,
    })),
  };
}

/**
 * A swatch for a colour name as the shop writes it — English, Kurdish or
 * Arabic — the same names the website draws. Anything unrecognised is a
 * neutral grey rather than a guess.
 */
export function colorHex(name: string | null | undefined): string {
  if (!name) return '#cbd5e1';
  const c = name.trim().toLowerCase();
  if (c.startsWith('#') || c.startsWith('rgb') || c.startsWith('hsl')) return c;

  const groups: [string, string[]][] = [
    ['#ef4444', ['red', 'سوور', 'أحمر']],
    ['#3b82f6', ['blue', 'شین', 'أزرق']],
    ['#22c55e', ['green', 'سەوز', 'أخضر']],
    ['#eab308', ['yellow', 'زەرد', 'أصفر']],
    ['#000000', ['black', 'ڕەش', 'أسود']],
    ['#ffffff', ['white', 'سپی', 'أبيض']],
    ['#fcfbf7', ['off-white', 'off white', 'offwhite']],
    ['#1e3a8a', ['navy', 'navy blue', 'indigo', 'نیلی', 'نيلي']],
    ['#c3b091', ['khaki', 'حاکی', 'خاکی', 'كاكي', 'خاكي']],
    ['#722f37', ['wine', 'burgundy', 'شرابی', 'شرابي', 'نبيذي', 'عنابي']],
    ['#800000', ['maroon', 'مارۆنی', 'ماروني']],
    ['#fffdd0', ['cream', 'کرێمی', 'كريمي']],
    ['#ec4899', ['pink', 'پەمەیی', 'وردي']],
    ['#a855f7', ['purple', 'مۆر', 'بنفسجي']],
    ['#f97316', ['orange', 'پڕتەقاڵی', 'برتقالي']],
    ['#6b7280', ['gray', 'grey', 'ڕەساسی', 'رمادي']],
    ['#92400e', ['brown', 'قاوەیی', 'بني']],
    ['#fef3c7', ['beige', 'بێژ', 'بيج']],
    ['#38bdf8', ['sky', 'sky blue', 'شینی ئاسمانی', 'أزرق سماوي']],
  ];

  return groups.find(([, names]) => names.includes(c))?.[0] ?? '#cbd5e1';
}
