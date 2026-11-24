import type { LookSlot, Product, ProductVariation } from '../types';

/**
 * The small decisions "Try the Look" makes for the shopper and the admin, so
 * neither has to: which size fits the whole outfit, which slot a garment is,
 * and where its dot belongs on the model.
 */

/** "2-3", "4-5", "10" … in the order a parent reads them, not alphabetically. */
export const sortSizes = (sizes: string[]): string[] =>
  [...sizes].sort((a, b) => {
    const na = parseFloat(a.replace(/[^\d.]/g, ''));
    const nb = parseFloat(b.replace(/[^\d.]/g, ''));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });

export const inStock = (v?: ProductVariation | null): v is ProductVariation => !!v && v.stockQuantity > 0;

/** Every size any piece of the outfit comes in, once each. */
export const sizesOf = (products: Product[]): string[] =>
  sortSizes([...new Set(products.flatMap(p => (p.variations ?? []).map(v => v.size)).filter(Boolean))]);

export interface Choice {
  color: string;
  size: string;
  variation?: ProductVariation;
}

/**
 * What a piece resolves to, given the shopper's choices.
 *
 * `childSize` is the one size they picked for the whole outfit; it wins over a
 * piece's own size, and when the shopper has not chosen a colour for a piece
 * it picks one that actually has that size in stock rather than leaving the
 * piece "sold out" in a colour nobody asked for.
 */
export const resolveChoice = (
  product: Product,
  own: { color?: string; size?: string } | undefined,
  childSize: string | null
): Choice => {
  const list = product.variations ?? [];

  const color =
    own?.color ??
    (childSize ? list.find(v => v.size === childSize && inStock(v))?.color : undefined) ??
    (list.find(inStock) ?? list[0])?.color ??
    '';

  const ofColor = list.filter(v => v.color === color);
  const fallbackSize = (ofColor.find(inStock) ?? ofColor[0])?.size ?? '';
  const ownSize = own?.size && ofColor.some(v => v.size === own.size) ? own.size : undefined;
  const size = childSize ?? ownSize ?? fallbackSize;

  return { color, size, variation: list.find(v => v.color === color && v.size === size) };
};

/** Guess what a garment is from its name, so the admin rarely has to say. */
export const guessSlot = (name: string): LookSlot => {
  const n = name.toLowerCase();
  if (/shoe|boot|sandal|sneaker|slipper|trainer|پێڵاو|بووت|حذاء|جزمة|صندل/.test(n)) return 'shoes';
  if (/\bhat\b|\bcap\b|beanie|bonnet|کڵاو|قبعة|طاقية/.test(n)) return 'hat';
  if (/pant|jean|trouser|short|skirt|legging|jogger|شاڵوار|دەرپێ|بنطلون|تنورة|شورت/.test(n)) return 'bottom';
  if (/shirt|tee|top|dress|jacket|coat|jumper|sweater|hoodie|romper|pyjama|pajama|بلوز|تیشێرت|کراس|چاکەت|قات|قميص|فستان|جاكيت/.test(n)) return 'top';
  return 'other';
};

/**
 * Where a slot's dot sits on a full-length model, as a percentage. The second
 * and third piece in one slot step sideways so two jackets do not stack.
 */
export const defaultHotspot = (slot: LookSlot, nth = 0): { x: number; y: number } => {
  const y = { hat: 9, top: 32, other: 45, bottom: 60, shoes: 90 }[slot];
  const x = [50, 32, 68][nth % 3]!;
  return { x, y };
};
