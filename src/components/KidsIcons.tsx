import React from 'react';
import {
  House, Store, ShoppingBasket, Heart, User,
  Shirt, Footprints, Crown, Backpack, Baby, Gift, ToyBrick, SwatchBook,
  Info, Mail, CircleHelp, Truck, Package, LogIn, LogOut, ShieldCheck, Sparkles,
  Banknote, CreditCard, Undo2, Ruler, Flame, PartyPopper, Star, Zap, Smartphone,
  type LucideIcon,
} from 'lucide-react';

/**
 * The shop's icon set: Lucide, wearing the brand palette.
 *
 * Lucide draws a single even stroke, which is what keeps a row of icons
 * looking like one family. Colour carries the meaning instead of weight: each
 * icon has a standing tint from the brand palette, and callers can override it
 * where a section has its own accent.
 *
 * Imported by name, one icon at a time — a namespace import here would defeat
 * tree-shaking and drag the whole package into the bundle.
 *
 * They are icons, not decoration, so they take a label from the caller: pass
 * `title` when the icon stands alone, and leave it off when a text label sits
 * beside it (as in the tab bar), so a screen reader is not told twice.
 */

export type KidsIconName =
  | 'home' | 'shop' | 'basket' | 'heart' | 'user'
  | 'shirt' | 'dress' | 'shoes' | 'hat' | 'socks' | 'trousers' | 'jacket'
  | 'toy' | 'baby' | 'bag' | 'gift'
  | 'info' | 'mail' | 'help' | 'truck' | 'box' | 'login' | 'logout'
  | 'shield' | 'register' | 'sparkle'
  | 'cash' | 'card' | 'return' | 'fabric' | 'ruler' | 'flame' | 'balloon'
  | 'star' | 'bolt' | 'phone';

const GLYPHS: Record<KidsIconName, LucideIcon> = {
  home: House,
  shop: Store,
  basket: ShoppingBasket,
  heart: Heart,
  user: User,

  // Lucide's clothing set is small, so a few of these are the nearest
  // sensible stand-in rather than the garment itself.
  shirt: Shirt,
  dress: Shirt,
  shoes: Footprints,
  hat: Crown,
  socks: Footprints,
  trousers: Shirt,
  jacket: Shirt,

  toy: ToyBrick,
  baby: Baby,
  bag: Backpack,
  gift: Gift,

  info: Info,
  mail: Mail,
  help: CircleHelp,
  truck: Truck,
  box: Package,
  login: LogIn,
  logout: LogOut,
  shield: ShieldCheck,
  register: Store,
  sparkle: Sparkles,

  cash: Banknote,
  card: CreditCard,
  return: Undo2,
  fabric: SwatchBook,
  ruler: Ruler,
  flame: Flame,
  balloon: PartyPopper,
  star: Star,
  bolt: Zap,
  phone: Smartphone,
};

/** The brand palette, as the single colour each duotone glyph is drawn in. */
const TINTS = {
  pink: '#C0506A',
  rose: '#E0607A',
  sun: '#B87F14',
  sky: '#3E93AE',
  grape: '#8E5CB4',
  mint: '#06805F',
  sand: '#C07A3E',
  ink: '#6E7391',
} as const;

export type KidsIconTint = keyof typeof TINTS;

/** Which colour each icon wears by default. */
const DEFAULT_TINT: Record<KidsIconName, KidsIconTint> = {
  home: 'rose', shop: 'sky', basket: 'sun', heart: 'pink', user: 'grape',
  shirt: 'sky', dress: 'pink', shoes: 'sand', hat: 'sun', socks: 'mint',
  trousers: 'grape', jacket: 'sky', toy: 'mint', baby: 'pink', bag: 'sand', gift: 'rose',
  info: 'sky', mail: 'grape', help: 'sun', truck: 'mint', box: 'sand',
  login: 'mint', logout: 'rose', shield: 'grape', register: 'sky', sparkle: 'sun',
  cash: 'mint', card: 'sky', return: 'grape', fabric: 'pink', ruler: 'sun',
  flame: 'rose', balloon: 'pink', star: 'sun', bolt: 'sun', phone: 'sky',
};

export interface KidsIconProps {
  name: KidsIconName;
  className?: string;
  /** Override the default colour, e.g. to match a section's accent. */
  tint?: KidsIconTint;
  /**
   * Take the surrounding text colour instead of a brand one — for places
   * where the icon sits inside an already-coloured control.
   */
  inherit?: boolean;
  /** Accessible name. Omit when a visible label sits beside the icon. */
  title?: string;
}

export const KidsIcon: React.FC<KidsIconProps> = ({
  name, className = 'w-6 h-6', tint, inherit, title,
}) => {
  const Glyph = GLYPHS[name];
  if (!Glyph) return null;

  return (
    <Glyph
      className={className}
      color={inherit ? undefined : TINTS[tint ?? DEFAULT_TINT[name]]}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    />
  );
};

/**
 * Best-effort mapping from a category's stored icon name (or its own name) to
 * one of the drawn icons. Anything unrecognised returns null so the caller can
 * fall back rather than showing the wrong garment.
 */
export function kidsIconForCategory(raw?: string): KidsIconName | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();

  const match: [KidsIconName, string[]][] = [
    ['shoes', ['shoe', 'foot', 'sneaker', 'boot', 'حذاء', 'أحذية', 'پێڵاو', 'pilaw']],
    ['socks', ['sock', 'جورب', 'گۆرەوی', 'gorawi']],
    ['hat', ['hat', 'cap', 'crown', 'قبعة', 'کڵاو', 'klaw']],
    ['dress', ['dress', 'skirt', 'frock', 'girl', 'فستان', 'تنورة', 'بنات', 'کراس', 'کچ', 'kras']],
    ['jacket', ['jacket', 'coat', 'hoodie', 'معطف', 'جاكيت', 'چاکەت', 'کۆت', 'chaket']],
    ['trousers', ['trouser', 'pant', 'jean', 'short', 'بنطال', 'جينز', 'پانتۆڵ', 'جین']],
    ['shirt', ['shirt', 'tshirt', 't-shirt', 'polo', 'top', 'blouse', 'cloth', 'boy', 'قميص', 'ملابس', 'أولاد', 'تیشێرت', 'پۆشاک', 'کوڕ']],
    ['baby', ['baby', 'newborn', 'infant', 'طفل', 'رضيع', 'ساوا', 'نۆزاد', 'mndal']],
    ['toy', ['toy', 'game', 'play', 'car', 'لعبة', 'ألعاب', 'یاری', 'بازی', 'yari']],
    ['bag', ['bag', 'backpack', 'حقيبة', 'چانتە', 'chant']],
    ['gift', ['gift', 'accessor', 'هدية', 'إكسسوار', 'دیاری', 'پێداویستی']],
  ];

  for (const [icon, keys] of match) {
    if (keys.some(k => n.includes(k))) return icon;
  }
  return null;
}
