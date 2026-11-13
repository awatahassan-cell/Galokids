import type { ComponentType } from 'react';
import {
  Banknote,
  CircleHelp,
  CreditCard,
  Flame,
  House,
  Info,
  LogIn,
  LogOut,
  Mail,
  Package,
  PartyPopper,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Star,
  Store,
  SwatchBook,
  Truck,
  Undo2,
  User,
  Zap,
  Heart,
} from 'lucide-react-native';
import {
  Baby as BabyIcon,
  BabyCarriage,
  Backpack as BackpackIcon,
  BaseballCap,
  Beanie,
  Bicycle,
  Boot as BootIcon,
  Butterfly,
  CoatHanger,
  Confetti,
  Dress,
  Gift as GiftIcon,
  GraduationCap,
  Handbag,
  Hoodie,
  Lego,
  Pants,
  PuzzlePiece,
  Rabbit,
  Sneaker,
  Snowflake,
  SoccerBall,
  Sock,
  Sun as SunIcon,
  TShirt,
  Umbrella,
  Watch as WatchIcon,
  Sunglasses,
} from 'phosphor-react-native';

/**
 * The shop's icon set, wearing the brand palette.
 *
 * The same two families the website draws with, in their React Native
 * editions, under the same names and the same default tints — so a category
 * that shows a pram on galokids.com shows the same pram here, not an emoji
 * approximation of one.
 *
 * Lucide draws the interface — post, delivery, sign in, a receipt — and
 * Phosphor draws the merchandise: a dress, a pair of trousers, a sneaker, a
 * pram. Lucide's whole clothing set is one shirt, so every garment category in
 * a children's shop pointed at it and came out as the same picture; Phosphor
 * draws each of them properly.
 *
 * Colour carries the meaning rather than weight: each icon has a standing tint
 * from the brand palette, and callers can override it where a section has its
 * own accent.
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
  | 'star' | 'bolt' | 'phone' | 'search';

/**
 * Loose on purpose: the two libraries type their components differently, and
 * both accept the size, colour and weight passed below.
 */
type AnyIcon = ComponentType<{ size?: number; color?: string; [key: string]: unknown }>;

const GLYPHS: Record<KidsIconName, AnyIcon> = {
  home: House as AnyIcon,
  shop: Store as AnyIcon,
  basket: ShoppingBasket as AnyIcon,
  heart: Heart as AnyIcon,
  user: User as AnyIcon,

  shirt: TShirt as AnyIcon,
  dress: Dress as AnyIcon,
  // Phosphor draws no skirt. A dress is the closest garment, and this name is
  // only still here so categories saved under the old picker keep resolving.
  skirt: Dress as AnyIcon,
  trousers: Pants as AnyIcon,
  jacket: Hoodie as AnyIcon,
  clothes: CoatHanger as AnyIcon,
  socks: Sock as AnyIcon,

  shoes: Sneaker as AnyIcon,
  boots: BootIcon as AnyIcon,

  hat: Beanie as AnyIcon,
  cap: BaseballCap as AnyIcon,
  bow: Butterfly as AnyIcon,
  bag: Handbag as AnyIcon,
  backpack: BackpackIcon as AnyIcon,
  glasses: Sunglasses as AnyIcon,
  watch: WatchIcon as AnyIcon,

  toy: Rabbit as AnyIcon,
  teddy: Rabbit as AnyIcon,
  ball: SoccerBall as AnyIcon,
  blocks: Lego as AnyIcon,
  puzzle: PuzzlePiece as AnyIcon,
  bike: Bicycle as AnyIcon,

  baby: BabyIcon as AnyIcon,
  pram: BabyCarriage as AnyIcon,
  // As with the skirt: kept for categories saved before, nearest thing drawn.
  bottle: BabyCarriage as AnyIcon,

  gift: GiftIcon as AnyIcon,
  school: GraduationCap as AnyIcon,
  party: Confetti as AnyIcon,
  summer: SunIcon as AnyIcon,
  winter: Snowflake as AnyIcon,
  rain: Umbrella as AnyIcon,

  info: Info as AnyIcon,
  mail: Mail as AnyIcon,
  help: CircleHelp as AnyIcon,
  truck: Truck as AnyIcon,
  box: Package as AnyIcon,
  login: LogIn as AnyIcon,
  logout: LogOut as AnyIcon,
  shield: ShieldCheck as AnyIcon,
  register: Store as AnyIcon,
  sparkle: Sparkles as AnyIcon,

  cash: Banknote as AnyIcon,
  card: CreditCard as AnyIcon,
  return: Undo2 as AnyIcon,
  fabric: SwatchBook as AnyIcon,
  ruler: Ruler as AnyIcon,
  flame: Flame as AnyIcon,
  balloon: PartyPopper as AnyIcon,
  star: Star as AnyIcon,
  bolt: Zap as AnyIcon,
  phone: Smartphone as AnyIcon,
  search: Search as AnyIcon,
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
  flame: 'rose', balloon: 'pink', star: 'sun', bolt: 'sun', phone: 'sky', search: 'ink',
};

export function KidsIcon({
  name,
  size = 20,
  tint,
  color,
  filled,
}: {
  name: KidsIconName;
  size?: number;
  /** Override the default colour, e.g. to match a section's accent. */
  tint?: KidsIconTint;
  /** An exact colour, for a glyph inside an already-coloured control. */
  color?: string;
  /** Solid rather than outlined — the saved heart, the active tab. */
  filled?: boolean;
}) {
  const Glyph = GLYPHS[name];
  if (!Glyph) return null;

  const stroke = color ?? TINTS[tint ?? DEFAULT_TINT[name]];

  return (
    <Glyph
      size={size}
      color={stroke}
      // Lucide takes `fill`; Phosphor takes `weight`. Passing both is harmless
      // — each ignores the one it does not know — and saves having to track
      // which family every name came from.
      fill={filled ? stroke : 'none'}
      weight={filled ? 'fill' : 'regular'}
      strokeWidth={2}
    />
  );
}

/**
 * The icon a category should wear, worked out from its own name.
 *
 * The same matching the website does, so a category called "پێڵاو" gets the
 * sneaker in both places. A category with an icon saved against it in the back
 * office wins; this is the fallback for the ones nobody has set.
 */
export function kidsIconForCategory(raw?: string | null): KidsIconName | null {
  if (!raw) return null;

  const text = String(raw).trim().toLowerCase();
  if (!text) return null;

  if (isKidsIconName(text)) return text;

  const match: [KidsIconName, string[]][] = [
    ['shoes', ['shoe', 'sneaker', 'پێڵاو', 'حذاء', 'أحذية']],
    ['boots', ['boot', 'بووت']],
    ['dress', ['dress', 'کراس', 'فستان', 'girl', 'کچ', 'بنات']],
    ['shirt', ['shirt', 'tee', 'tshirt', 'بلوس', 'قەمیس', 'قميص']],
    ['trousers', ['pant', 'trouser', 'jean', 'پانتۆڵ', 'بنطال']],
    ['jacket', ['jacket', 'hoodie', 'coat', 'چاکەت', 'قات', 'معطف']],
    ['socks', ['sock', 'گۆرەوی', 'جوارب']],
    ['hat', ['hat', 'beanie', 'کڵاو', 'قبعة']],
    ['bag', ['bag', 'جانتا', 'حقيبة']],
    ['backpack', ['backpack', 'school bag', 'جانتای قوتابخانە']],
    ['glasses', ['glass', 'چاویلکە', 'نظارة']],
    ['watch', ['watch', 'کاتژمێر', 'ساعة']],
    ['toy', ['toy', 'یاری', 'لعب', 'ألعاب']],
    ['ball', ['ball', 'تۆپ', 'كرة']],
    ['baby', ['baby', 'infant', 'ساوا', 'رضع', 'أطفال رضع']],
    ['pram', ['pram', 'carriage', 'عەرەبانە']],
    ['gift', ['gift', 'دیاری', 'هدية', 'ئەکسسوار', 'accessor', 'اكسسوار']],
    ['school', ['school', 'قوتابخانە', 'مدرسة']],
    ['party', ['party', 'ئاهەنگ', 'حفلة']],
    ['summer', ['summer', 'هاوین', 'صيف']],
    ['winter', ['winter', 'زستان', 'شتاء']],
    ['shirt', ['boy', 'کوڕ', 'أولاد']],
  ];

  for (const [icon, needles] of match) {
    if (needles.some(needle => text.includes(needle))) return icon;
  }

  return null;
}

export const isKidsIconName = (value?: string): value is KidsIconName =>
  Boolean(value && Object.prototype.hasOwnProperty.call(GLYPHS, value));
