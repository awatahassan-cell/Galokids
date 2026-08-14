import React from 'react';
import {
  House, Store, ShoppingBasket, Heart, User,
  Shirt, Footprints, Crown, Backpack, Baby, Gift, ToyBrick, SwatchBook,
  Info, Mail, CircleHelp, Truck, Package, LogIn, LogOut, ShieldCheck, Sparkles,
  Banknote, CreditCard, Undo2, Ruler, Flame, PartyPopper, Star, Zap, Smartphone,
  Glasses, Watch, Blocks, Bike, GraduationCap, Sun, Snowflake, Umbrella,
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


/**
 * The garments and playthings Lucide does not draw.
 *
 * Lucide's clothing set is one shirt. Everything else in a children's shop was
 * pointed at it, so a dress, a pair of trousers and a jacket all appeared as
 * the same shirt — three categories, one picture. These are drawn on Lucide's
 * own grid: 24×24, 2px stroke, round caps and joins, `currentColor`, no fill,
 * so a row mixing the two sets still reads as one family.
 */
type Glyph = React.FC<{ className?: string; color?: string; [key: string]: any }>;

const draw = (paths: React.ReactNode): Glyph => ({ className, color, ...rest }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {paths}
  </svg>
);

/** A-line dress: straps, bodice, flared skirt. */
const DressGlyph = draw(
  <>
    <path d="M9.5 3 8 7h8L14.5 3" />
    <path d="M8 7 5.5 20h13L16 7" />
    <path d="M9.5 3a2.5 2.5 0 0 0 5 0" />
  </>
);

/** Skirt: waistband over a flare, with one pleat. */
const SkirtGlyph = draw(
  <>
    <path d="M6.5 8h11" />
    <path d="M7 5h10v3H7z" />
    <path d="M6.5 8 4 20h16L17.5 8" />
    <path d="M12 8v12" />
  </>
);

/** Trousers: waistband and two legs. */
const TrousersGlyph = draw(
  <>
    <path d="M7 3h10v3H7z" />
    <path d="M7 6l-.5 15h4l1.5-10 1.5 10h4L17 6" />
    <path d="M12 6v5" />
  </>
);

/** Jacket: collar, open front, two panels. */
const JacketGlyph = draw(
  <>
    <path d="M9 3 4 5.5V21h16V5.5L15 3" />
    <path d="M9 3l3 3 3-3" />
    <path d="M12 6v15" />
    <path d="M4 9h3M17 9h3" />
  </>
);

/** Sock: a tube with a turned foot. */
const SockGlyph = draw(
  <>
    <path d="M9 3h5v10l3.5 3.5a3.5 3.5 0 0 1-5 5L7 16V3z" />
    <path d="M9 6h5" />
  </>
);

/** Baseball cap: dome and peak. */
const CapGlyph = draw(
  <>
    <path d="M4 15a8 8 0 0 1 16 0z" />
    <path d="M20 15h1.5a2 2 0 0 1-2 2H4" />
    <path d="M12 7v8" />
  </>
);

/** Hair bow: two loops and a knot. */
const BowGlyph = draw(
  <>
    <path d="M10.5 12 4 8v8z" />
    <path d="M13.5 12 20 8v8z" />
    <circle cx="12" cy="12" r="2" />
  </>
);

/** Teddy bear: head and two ears. */
const TeddyGlyph = draw(
  <>
    <circle cx="12" cy="14" r="6.5" />
    <circle cx="5.5" cy="6.5" r="2.8" />
    <circle cx="18.5" cy="6.5" r="2.8" />
    <path d="M10 13h.01M14 13h.01" />
    <path d="M10.5 16.5a2 2 0 0 0 3 0" />
  </>
);

/**
 * Football: a centre panel with seams running to the edge.
 *
 * A circle crossed by an equator and two meridians is the globe icon every
 * site uses for language — drawn that way, the toy category looked like a
 * language switch.
 */
const BallGlyph = draw(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.4l3.4 2.5-1.3 4h-4.2l-1.3-4z" />
    <path d="M12 3v4.4M4.5 9.4l4.1 3M19.5 9.4l-4.1 3M7.6 19.7l2.3-3.8M16.4 19.7l-2.3-3.8" />
  </>
);

/** Baby bottle: teat, collar and body. */
const BottleGlyph = draw(
  <>
    <path d="M10 2h4v2.5h-4z" />
    <path d="M8.5 4.5h7V7h-7z" />
    <path d="M9 7h6l.8 3v9a2 2 0 0 1-2 2h-3.6a2 2 0 0 1-2-2v-9z" />
    <path d="M9 13h6M9 16h6" />
  </>
);

export type KidsIconName =
  | 'home' | 'shop' | 'basket' | 'heart' | 'user'
  // Clothing
  | 'shirt' | 'dress' | 'skirt' | 'trousers' | 'jacket' | 'socks'
  // Footwear
  | 'shoes'
  // Accessories
  | 'hat' | 'cap' | 'bow' | 'bag' | 'glasses' | 'watch'
  // Toys & play
  | 'toy' | 'teddy' | 'ball' | 'blocks' | 'bike'
  // Baby
  | 'baby' | 'bottle'
  // Occasions & seasons
  | 'gift' | 'school' | 'party' | 'summer' | 'winter' | 'rain'
  | 'info' | 'mail' | 'help' | 'truck' | 'box' | 'login' | 'logout'
  | 'shield' | 'register' | 'sparkle'
  | 'cash' | 'card' | 'return' | 'fabric' | 'ruler' | 'flame' | 'balloon'
  | 'star' | 'bolt' | 'phone';

const GLYPHS: Record<KidsIconName, LucideIcon | Glyph> = {
  home: House,
  shop: Store,
  basket: ShoppingBasket,
  heart: Heart,
  user: User,

  // Clothing. Only the shirt comes from Lucide; the rest are drawn above,
  // because pointing them all at the one shirt Lucide has meant a dress, a
  // pair of trousers and a jacket were the same picture.
  shirt: Shirt,
  dress: DressGlyph,
  skirt: SkirtGlyph,
  trousers: TrousersGlyph,
  jacket: JacketGlyph,
  socks: SockGlyph,

  shoes: Footprints,

  hat: Crown,
  cap: CapGlyph,
  bow: BowGlyph,
  bag: Backpack,
  glasses: Glasses,
  watch: Watch,

  toy: ToyBrick,
  teddy: TeddyGlyph,
  ball: BallGlyph,
  blocks: Blocks,
  bike: Bike,

  baby: Baby,
  bottle: BottleGlyph,

  gift: Gift,
  school: GraduationCap,
  party: PartyPopper,
  summer: Sun,
  winter: Snowflake,
  rain: Umbrella,

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
  shirt: 'sky', dress: 'pink', skirt: 'rose', trousers: 'grape', jacket: 'sky',
  socks: 'mint', shoes: 'sand',
  hat: 'sun', cap: 'sky', bow: 'pink', bag: 'sand', glasses: 'ink', watch: 'grape',
  toy: 'mint', teddy: 'sand', ball: 'rose', blocks: 'sky', bike: 'mint',
  baby: 'pink', bottle: 'sky',
  gift: 'rose', school: 'grape', party: 'pink', summer: 'sun', winter: 'sky', rain: 'mint',
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

  // Longer, more specific words first: "کراسی زستان" should find the coat, not
  // the dress, and "school bag" the backpack rather than the graduation cap.
  const match: [KidsIconName, string[]][] = [
    ['winter', ['winter', 'زستان', 'شتاء', 'شتوي']],
    ['summer', ['summer', 'beach', 'هاوین', 'صيف', 'صيفي']],
    ['rain', ['rain', 'umbrella', 'باران', 'مطر', 'مظلة']],
    ['school', ['school', 'uniform', 'قوتابخانە', 'خوێندن', 'مدرسة', 'مدرسي', 'زي']],
    ['party', ['party', 'festive', 'eid', 'ئاهەنگ', 'جەژن', 'حفل', 'عيد', 'مناسب']],

    ['bottle', ['bottle', 'feeding', 'شووشە', 'رضاعة', 'زجاجة']],
    ['baby', ['baby', 'newborn', 'infant', 'toddler', 'طفل', 'رضيع', 'أطفال رضع', 'ساوا', 'نۆزاد', 'mndal']],

    ['socks', ['sock', 'tights', 'جورب', 'جوارب', 'گۆرەوی', 'gorawi']],
    ['shoes', ['shoe', 'foot', 'sneaker', 'boot', 'sandal', 'slipper', 'حذاء', 'أحذية', 'صندل', 'پێڵاو', 'pilaw', 'سەندەل']],

    ['cap', ['cap', 'قبعة', 'كاب']],
    ['hat', ['hat', 'crown', 'beanie', 'قبعات', 'کڵاو', 'klaw', 'تاج']],
    ['bow', ['bow', 'hairband', 'hair', 'ribbon', 'clip', 'ربطة', 'شريطة', 'گوڵ', 'قژ', 'سەربەند']],
    ['glasses', ['glass', 'sunglass', 'نەزارە', 'نظار', 'شمسية']],
    ['watch', ['watch', 'کاتژمێر', 'ساعة', 'ساعات']],
    ['bag', ['bag', 'backpack', 'purse', 'حقيبة', 'حقائب', 'جانتا', 'چانتە', 'chant']],

    ['teddy', ['teddy', 'plush', 'bear', 'doll', 'دمية', 'دبدوب', 'ورچ', 'بووکەڵە']],
    ['ball', ['ball', 'sport', 'كرة', 'ریاضە', 'تۆپ']],
    ['bike', ['bike', 'cycle', 'scooter', 'دراجة', 'پاسکیل']],
    ['blocks', ['block', 'brick', 'puzzle', 'lego', 'مكعبات', 'أحجية', 'یاریگە']],
    ['toy', ['toy', 'game', 'play', 'car', 'لعبة', 'ألعاب', 'یاری', 'بازی', 'yari']],

    ['jacket', ['jacket', 'coat', 'hoodie', 'sweater', 'cardigan', 'معطف', 'جاكيت', 'سترة', 'چاکەت', 'کۆت', 'chaket']],
    ['trousers', ['trouser', 'pant', 'jean', 'short', 'legging', 'بنطال', 'جينز', 'شورت', 'پانتۆڵ', 'جین']],
    ['skirt', ['skirt', 'تنورة', 'دامێن']],
    ['dress', ['dress', 'frock', 'gown', 'girl', 'فستان', 'فساتين', 'بنات', 'کراس', 'کچ', 'kras']],
    ['shirt', ['shirt', 'tshirt', 't-shirt', 'polo', 'top', 'blouse', 'cloth', 'apparel', 'boy', 'قميص', 'ملابس', 'أولاد', 'تیشێرت', 'پۆشاک', 'جل', 'کوڕ']],

    ['gift', ['gift', 'accessor', 'هدية', 'إكسسوار', 'اكسسوار', 'دیاری', 'پێداویستی', 'ئەکسسوار']],
  ];

  for (const [icon, keys] of match) {
    if (keys.some(k => n.includes(k))) return icon;
  }
  return null;
}

/**
 * What the admin's category icon picker offers, in the order it shows them.
 *
 * Grouped, because thirty icons in one undifferentiated grid is a worse choice
 * than sixteen — the shop owner is looking for "the dress one", not scanning.
 * The labels are here rather than in the modal so the list and its names
 * cannot drift apart.
 */
export interface CategoryIconChoice {
  name: KidsIconName;
  ku: string;
  ar: string;
  en: string;
}

export interface CategoryIconGroup {
  ku: string;
  ar: string;
  en: string;
  icons: CategoryIconChoice[];
}

export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  {
    ku: 'جل و بەرگ', ar: 'الملابس', en: 'Clothing',
    icons: [
      { name: 'shirt', ku: 'تیشێرت', ar: 'قميص', en: 'Shirt' },
      { name: 'dress', ku: 'کراس', ar: 'فستان', en: 'Dress' },
      { name: 'skirt', ku: 'دامێن', ar: 'تنورة', en: 'Skirt' },
      { name: 'trousers', ku: 'پانتۆڵ', ar: 'بنطال', en: 'Trousers' },
      { name: 'jacket', ku: 'چاکەت', ar: 'جاكيت', en: 'Jacket' },
      { name: 'socks', ku: 'گۆرەوی', ar: 'جوارب', en: 'Socks' },
    ],
  },
  {
    ku: 'پێڵاو', ar: 'الأحذية', en: 'Footwear',
    icons: [
      { name: 'shoes', ku: 'پێڵاو', ar: 'حذاء', en: 'Shoes' },
    ],
  },
  {
    ku: 'ئەکسسوارات', ar: 'إكسسوارات', en: 'Accessories',
    icons: [
      { name: 'bag', ku: 'جانتا', ar: 'حقيبة', en: 'Bag' },
      { name: 'hat', ku: 'کڵاو', ar: 'قبعة', en: 'Hat' },
      { name: 'cap', ku: 'کڵاوی وەرزشی', ar: 'كاب', en: 'Cap' },
      { name: 'bow', ku: 'گوڵی قژ', ar: 'ربطة شعر', en: 'Hair bow' },
      { name: 'glasses', ku: 'نەزارە', ar: 'نظارة', en: 'Glasses' },
      { name: 'watch', ku: 'کاتژمێر', ar: 'ساعة', en: 'Watch' },
    ],
  },
  {
    ku: 'یاری', ar: 'الألعاب', en: 'Toys',
    icons: [
      { name: 'teddy', ku: 'ورچی یاری', ar: 'دبدوب', en: 'Teddy' },
      { name: 'ball', ku: 'تۆپ', ar: 'كرة', en: 'Ball' },
      { name: 'blocks', ku: 'یاریگە', ar: 'مكعبات', en: 'Blocks' },
      { name: 'bike', ku: 'پاسکیل', ar: 'دراجة', en: 'Bike' },
      { name: 'toy', ku: 'یاری', ar: 'لعبة', en: 'Toy' },
    ],
  },
  {
    ku: 'شتی منداڵان', ar: 'مستلزمات الأطفال', en: 'Baby',
    icons: [
      { name: 'baby', ku: 'ساوا', ar: 'رضيع', en: 'Baby' },
      { name: 'bottle', ku: 'شووشەی شیر', ar: 'رضاعة', en: 'Bottle' },
    ],
  },
  {
    ku: 'وەرز و بۆنە', ar: 'المواسم والمناسبات', en: 'Seasons & occasions',
    icons: [
      { name: 'school', ku: 'قوتابخانە', ar: 'المدرسة', en: 'School' },
      { name: 'party', ku: 'ئاهەنگ', ar: 'حفلات', en: 'Party' },
      { name: 'summer', ku: 'هاوین', ar: 'صيف', en: 'Summer' },
      { name: 'winter', ku: 'زستان', ar: 'شتاء', en: 'Winter' },
      { name: 'rain', ku: 'باران', ar: 'مطر', en: 'Rain' },
      { name: 'gift', ku: 'دیاری', ar: 'هدية', en: 'Gift' },
      { name: 'sparkle', ku: 'گشتی', ar: 'عام', en: 'General' },
    ],
  },
];

/** Every choosable icon name, flattened — for validation and lookups. */
export const CATEGORY_ICON_NAMES: KidsIconName[] =
  CATEGORY_ICON_GROUPS.flatMap(group => group.icons.map(icon => icon.name));

/** True when a stored value is one of the names the picker offers. */
export const isCategoryIconName = (value?: string): value is KidsIconName =>
  !!value && (CATEGORY_ICON_NAMES as string[]).includes(value);
