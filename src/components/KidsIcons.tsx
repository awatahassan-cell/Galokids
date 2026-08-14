import React from 'react';
import {
  House, Store, ShoppingBasket, Heart, User,
  Info, Mail, CircleHelp, Truck, Package, LogIn, LogOut, ShieldCheck, Sparkles,
  Banknote, CreditCard, Undo2, SwatchBook, Ruler, Flame, PartyPopper, Star, Zap, Smartphone,
} from 'lucide-react';
import {
  PiTShirtBold as TShirt,
  PiDressBold as Dress,
  PiPantsBold as Pants,
  PiHoodieBold as Hoodie,
  PiCoatHangerBold as CoatHanger,
  PiSockBold as Sock,
  PiSneakerBold as Sneaker,
  PiBootBold as BootIcon,
  PiHandbagBold as Handbag,
  PiBackpackBold as BackpackIcon,
  PiBaseballCapBold as BaseballCap,
  PiBeanieBold as Beanie,
  PiButterflyBold as Butterfly,
  PiSunglassesBold as Sunglasses,
  PiWatchBold as WatchIcon,
  PiRabbitBold as Rabbit,
  PiLegoBold as Lego,
  PiSoccerBallBold as SoccerBall,
  PiBicycleBold as Bicycle,
  PiPuzzlePieceBold as PuzzlePiece,
  PiBabyBold as BabyIcon,
  PiBabyCarriageBold as BabyCarriage,
  PiGiftBold as GiftIcon,
  PiGraduationCapBold as GraduationCap,
  PiConfettiBold as Confetti,
  PiSunBold as SunIcon,
  PiSnowflakeBold as Snowflake,
  PiUmbrellaBold as Umbrella,
} from 'react-icons/pi';

/**
 * The shop's icon set, wearing the brand palette.
 *
 * Two libraries, split by what each is good at. Lucide draws the interface —
 * post, delivery, sign in, a receipt — and Phosphor draws the merchandise: a
 * dress, a pair of trousers, a sneaker, a pram. Lucide's whole clothing set is
 * one shirt, so every garment category in a children's shop pointed at it and
 * came out as the same picture; Phosphor draws each of them properly.
 *
 * Nothing here is hand-drawn. An icon nobody at a shop will ever look twice at
 * is not worth a bespoke SVG, and a bespoke SVG never quite sits in a row
 * beside a real family's.
 *
 * Colour carries the meaning rather than weight: each icon has a standing tint
 * from the brand palette, and callers can override it where a section has its
 * own accent.
 *
 * Both sets are imported by name, one icon at a time. A namespace import —
 * `import * as Icons` with a runtime key — defeats tree-shaking and drags the
 * entire package into the bundle for the sake of thirty glyphs. Phosphor is
 * taken through `react-icons` for the same reason: its own package ships all
 * six weights of every icon in one file, ten times the weight of the one
 * weight actually used.
 *
 * They are icons, not decoration, so they take a label from the caller: pass
 * `title` when the icon stands alone, and leave it off when a text label sits
 * beside it (as in the tab bar), so a screen reader is not told twice.
 */

export type KidsIconName =
  | 'home' | 'shop' | 'basket' | 'heart' | 'user'
  // Clothing
  | 'shirt' | 'dress' | 'skirt' | 'trousers' | 'jacket' | 'clothes' | 'socks'
  // Footwear
  | 'shoes' | 'boots'
  // Accessories
  | 'hat' | 'cap' | 'bow' | 'bag' | 'backpack' | 'glasses' | 'watch'
  // Toys & play
  | 'toy' | 'teddy' | 'ball' | 'blocks' | 'puzzle' | 'bike'
  // Baby
  | 'baby' | 'pram' | 'bottle'
  // Occasions & seasons
  | 'gift' | 'school' | 'party' | 'summer' | 'winter' | 'rain'
  | 'info' | 'mail' | 'help' | 'truck' | 'box' | 'login' | 'logout'
  | 'shield' | 'register' | 'sparkle'
  | 'cash' | 'card' | 'return' | 'fabric' | 'ruler' | 'flame' | 'balloon'
  | 'star' | 'bolt' | 'phone';

/**
 * Loose on purpose: the two libraries type their components differently, and
 * both accept the className, colour and ARIA attributes passed below.
 */
type AnyIcon = React.ComponentType<{ className?: string; color?: string; [key: string]: any }>;

const GLYPHS: Record<KidsIconName, AnyIcon> = {
  home: House,
  shop: Store,
  basket: ShoppingBasket,
  heart: Heart,
  user: User,

  shirt: TShirt,
  dress: Dress,
  // Phosphor draws no skirt. A dress is the closest garment, and this name is
  // only still here so categories saved under the old picker keep resolving.
  skirt: Dress,
  trousers: Pants,
  jacket: Hoodie,
  clothes: CoatHanger,
  socks: Sock,

  shoes: Sneaker,
  boots: BootIcon,

  hat: Beanie,
  cap: BaseballCap,
  bow: Butterfly,
  bag: Handbag,
  backpack: BackpackIcon,
  glasses: Sunglasses,
  watch: WatchIcon,

  toy: Rabbit,
  teddy: Rabbit,
  ball: SoccerBall,
  blocks: Lego,
  puzzle: PuzzlePiece,
  bike: Bicycle,

  baby: BabyIcon,
  pram: BabyCarriage,
  // As with the skirt: kept for categories saved before, nearest thing drawn.
  bottle: BabyCarriage,

  gift: GiftIcon,
  school: GraduationCap,
  party: Confetti,
  summer: SunIcon,
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

/** The brand palette, as the single colour each glyph is drawn in. */
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
  clothes: 'ink', socks: 'mint',
  shoes: 'sand', boots: 'sand',
  hat: 'sun', cap: 'sky', bow: 'pink', bag: 'sand', backpack: 'grape',
  glasses: 'ink', watch: 'grape',
  toy: 'mint', teddy: 'sand', ball: 'rose', blocks: 'sky', puzzle: 'grape', bike: 'mint',
  baby: 'pink', pram: 'sky', bottle: 'sky',
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
 * one of the icons. Anything unrecognised returns null so the caller can fall
 * back rather than showing the wrong garment.
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

    ['pram', ['pram', 'stroller', 'carriage', 'bottle', 'feeding', 'عربة', 'رضاعة', 'زجاجة', 'شووشە', 'عەرەبانە']],
    ['baby', ['baby', 'newborn', 'infant', 'toddler', 'طفل', 'رضيع', 'أطفال رضع', 'ساوا', 'نۆزاد', 'mndal']],

    ['socks', ['sock', 'tights', 'جورب', 'جوارب', 'گۆرەوی', 'gorawi']],
    ['boots', ['boot', 'wellington', 'بوت', 'جزمة', 'پۆتین']],
    ['shoes', ['shoe', 'foot', 'sneaker', 'sandal', 'slipper', 'حذاء', 'أحذية', 'صندل', 'پێڵاو', 'pilaw', 'سەندەل']],

    ['backpack', ['backpack', 'rucksack', 'حقيبة ظهر', 'جانتای پشت']],
    ['cap', ['cap', 'قبعة', 'كاب']],
    ['hat', ['hat', 'crown', 'beanie', 'قبعات', 'کڵاو', 'klaw', 'تاج']],
    ['bow', ['bow', 'hairband', 'hair', 'ribbon', 'clip', 'ربطة', 'شريطة', 'گوڵ', 'قژ', 'سەربەند']],
    ['glasses', ['glass', 'sunglass', 'نەزارە', 'نظار', 'شمسية']],
    ['watch', ['watch', 'کاتژمێر', 'ساعة', 'ساعات']],
    ['bag', ['bag', 'purse', 'حقيبة', 'حقائب', 'جانتا', 'چانتە', 'chant']],

    ['teddy', ['teddy', 'plush', 'bear', 'doll', 'دمية', 'دبدوب', 'ورچ', 'بووکەڵە']],
    ['ball', ['ball', 'sport', 'كرة', 'ریاضە', 'تۆپ']],
    ['bike', ['bike', 'cycle', 'scooter', 'دراجة', 'پاسکیل']],
    ['puzzle', ['puzzle', 'أحجية', 'ماتەماتیک']],
    ['blocks', ['block', 'brick', 'lego', 'مكعبات', 'یاریگە']],
    ['toy', ['toy', 'game', 'play', 'car', 'لعبة', 'ألعاب', 'یاری', 'بازی', 'yari']],

    ['jacket', ['jacket', 'coat', 'hoodie', 'sweater', 'cardigan', 'معطف', 'جاكيت', 'سترة', 'چاکەت', 'کۆت', 'chaket']],
    ['trousers', ['trouser', 'pant', 'jean', 'short', 'legging', 'بنطال', 'جينز', 'شورت', 'پانتۆڵ', 'جین']],
    ['skirt', ['skirt', 'تنورة', 'دامێن']],
    ['dress', ['dress', 'frock', 'gown', 'girl', 'فستان', 'فساتين', 'بنات', 'کراس', 'کچ', 'kras']],
    ['shirt', ['shirt', 'tshirt', 't-shirt', 'polo', 'top', 'blouse', 'boy', 'قميص', 'أولاد', 'تیشێرت', 'کوڕ']],
    ['clothes', ['cloth', 'apparel', 'outfit', 'wear', 'ملابس', 'البسة', 'پۆشاک', 'جل']],

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
 *
 * A few names in the union above are missing here on purpose. They are the
 * ones kept only so categories saved under an older picker still resolve, and
 * they now share a picture with an entry that is offered; showing both would
 * put the same icon in the grid twice under two names.
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
      { name: 'trousers', ku: 'پانتۆڵ', ar: 'بنطال', en: 'Trousers' },
      { name: 'jacket', ku: 'چاکەت', ar: 'جاكيت', en: 'Jacket' },
      { name: 'clothes', ku: 'جل و بەرگ', ar: 'ملابس', en: 'Clothes' },
      { name: 'socks', ku: 'گۆرەوی', ar: 'جوارب', en: 'Socks' },
    ],
  },
  {
    ku: 'پێڵاو', ar: 'الأحذية', en: 'Footwear',
    icons: [
      { name: 'shoes', ku: 'پێڵاو', ar: 'حذاء', en: 'Shoes' },
      { name: 'boots', ku: 'پۆتین', ar: 'جزمة', en: 'Boots' },
    ],
  },
  {
    ku: 'ئەکسسوارات', ar: 'إكسسوارات', en: 'Accessories',
    icons: [
      { name: 'bag', ku: 'جانتا', ar: 'حقيبة', en: 'Bag' },
      { name: 'backpack', ku: 'جانتای پشت', ar: 'حقيبة ظهر', en: 'Backpack' },
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
      { name: 'toy', ku: 'یاری', ar: 'لعبة', en: 'Toy' },
      { name: 'ball', ku: 'تۆپ', ar: 'كرة', en: 'Ball' },
      { name: 'blocks', ku: 'یاریگە', ar: 'مكعبات', en: 'Blocks' },
      { name: 'puzzle', ku: 'پازڵ', ar: 'أحجية', en: 'Puzzle' },
      { name: 'bike', ku: 'پاسکیل', ar: 'دراجة', en: 'Bike' },
    ],
  },
  {
    ku: 'شتی منداڵان', ar: 'مستلزمات الأطفال', en: 'Baby',
    icons: [
      { name: 'baby', ku: 'ساوا', ar: 'رضيع', en: 'Baby' },
      { name: 'pram', ku: 'عەرەبانە', ar: 'عربة أطفال', en: 'Pram' },
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

/**
 * True when a stored value is one of the icon names, whether or not the picker
 * still offers it — a category saved under an older picker keeps its choice.
 */
export const isCategoryIconName = (value?: string): value is KidsIconName =>
  !!value && Object.prototype.hasOwnProperty.call(GLYPHS, value);
