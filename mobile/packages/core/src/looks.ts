import { apiRequest } from './client';
import type { Look, LookInput, LookSlot, Product, ProductVariation } from './types';

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

/* ------------------------------------------------------------------------
 * The small decisions the screens make for the shopper and the admin, so
 * neither has to. The website has the same rules in `src/utils/looks.ts`;
 * change one, change both.
 * --------------------------------------------------------------------- */

/** "2-3", "4-5", "10" … in the order a parent reads them, not alphabetically. */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const na = parseFloat(a.replace(/[^\d.]/g, ''));
    const nb = parseFloat(b.replace(/[^\d.]/g, ''));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

export const inStock = (v?: ProductVariation | null): v is ProductVariation =>
  !!v && v.stock_quantity > 0;

/** Every size any piece of the outfit comes in, once each. */
export function sizesOf(products: Product[]): string[] {
  const all = products.flatMap(p => p.variations.map(v => v.size).filter((s): s is string => !!s));
  return sortSizes([...new Set(all)]);
}

export interface Choice {
  color: string | null;
  size: string | null;
  variation?: ProductVariation;
}

/**
 * What a piece resolves to, given the shopper's choices.
 *
 * `childSize` is the one size picked for the whole outfit. It wins over a
 * piece's own size, and when no colour was chosen for the piece it picks one
 * that really has that size in stock, rather than leaving the piece "sold
 * out" in a colour nobody asked for.
 */
export function resolveChoice(
  product: Product,
  own: { color?: string | null; size?: string | null } | undefined,
  childSize: string | null
): Choice {
  const list = product.variations;

  const color =
    own?.color ??
    (childSize ? list.find(v => v.size === childSize && inStock(v))?.color : undefined) ??
    (list.find(inStock) ?? list[0])?.color ??
    null;

  const ofColor = list.filter(v => v.color === color);
  const fallbackSize = (ofColor.find(inStock) ?? ofColor[0])?.size ?? null;
  const ownSize = own?.size && ofColor.some(v => v.size === own.size) ? own.size : undefined;
  const size = childSize ?? ownSize ?? fallbackSize;

  return { color, size, variation: list.find(v => v.color === color && v.size === size) };
}

/** Guess what a garment is from its name, so the admin rarely has to say. */
export function guessSlot(name: string): LookSlot {
  const n = name.toLowerCase();
  if (/shoe|boot|sandal|sneaker|slipper|trainer|پێڵاو|بووت|حذاء|جزمة|صندل/.test(n)) return 'shoes';
  if (/\bhat\b|\bcap\b|beanie|bonnet|کڵاو|قبعة|طاقية/.test(n)) return 'hat';
  if (/pant|jean|trouser|short|skirt|legging|jogger|شاڵوار|دەرپێ|بنطلون|تنورة|شورت/.test(n)) return 'bottom';
  if (/shirt|tee|top|dress|jacket|coat|jumper|sweater|hoodie|romper|pyjama|pajama|بلوز|تیشێرت|کراس|چاکەت|قات|قميص|فستان|جاكيت/.test(n)) return 'top';
  return 'other';
}

/**
 * Where a slot's dot sits on a full-length model, in percent. The second and
 * third piece in one slot step sideways so two jackets do not stack.
 */
export function defaultHotspot(slot: LookSlot, nth = 0): { x: number; y: number } {
  const y = { hat: 9, top: 32, other: 45, bottom: 60, shoes: 90 }[slot];
  return { x: [50, 32, 68][nth % 3]!, y };
}
