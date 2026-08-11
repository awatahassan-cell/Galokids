import React from 'react';
import {
  PiHouseSimpleDuotone, PiStorefrontDuotone, PiBasketDuotone, PiHeartDuotone, PiUserDuotone,
  PiTShirtDuotone, PiDressDuotone, PiSneakerDuotone, PiBaseballCapDuotone, PiSockDuotone,
  PiPantsDuotone, PiHoodieDuotone, PiPuzzlePieceDuotone, PiBabyDuotone, PiHandbagDuotone,
  PiGiftDuotone, PiInfoDuotone, PiEnvelopeSimpleDuotone, PiQuestionDuotone, PiTruckDuotone,
  PiPackageDuotone, PiSignInDuotone, PiSignOutDuotone, PiShieldCheckDuotone,
  PiCashRegisterDuotone, PiSparkleDuotone, PiMoneyWavyDuotone, PiCreditCardDuotone,
  PiArrowUUpLeftDuotone, PiYarnDuotone, PiRulerDuotone, PiFireSimpleDuotone, PiBalloonDuotone,
  PiStarDuotone, PiLightningDuotone, PiDeviceMobileDuotone,
} from 'react-icons/pi';
import type { IconType } from 'react-icons';

/**
 * The shop's icon set: Phosphor Duotone, wearing the brand palette.
 *
 * Duotone draws each glyph as a solid shape at low opacity with the detail
 * stroked over it, both in `currentColor` — so setting one colour gives the
 * pastel-fill-plus-darker-line look the storefront uses, from a maintained
 * library rather than paths drawn by hand.
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

const GLYPHS: Record<KidsIconName, IconType> = {
  home: PiHouseSimpleDuotone,
  shop: PiStorefrontDuotone,
  basket: PiBasketDuotone,
  heart: PiHeartDuotone,
  user: PiUserDuotone,

  shirt: PiTShirtDuotone,
  dress: PiDressDuotone,
  shoes: PiSneakerDuotone,
  hat: PiBaseballCapDuotone,
  socks: PiSockDuotone,
  trousers: PiPantsDuotone,
  jacket: PiHoodieDuotone,

  toy: PiPuzzlePieceDuotone,
  baby: PiBabyDuotone,
  bag: PiHandbagDuotone,
  gift: PiGiftDuotone,

  info: PiInfoDuotone,
  mail: PiEnvelopeSimpleDuotone,
  help: PiQuestionDuotone,
  truck: PiTruckDuotone,
  box: PiPackageDuotone,
  login: PiSignInDuotone,
  logout: PiSignOutDuotone,
  shield: PiShieldCheckDuotone,
  register: PiCashRegisterDuotone,
  sparkle: PiSparkleDuotone,

  cash: PiMoneyWavyDuotone,
  card: PiCreditCardDuotone,
  return: PiArrowUUpLeftDuotone,
  fabric: PiYarnDuotone,
  ruler: PiRulerDuotone,
  flame: PiFireSimpleDuotone,
  balloon: PiBalloonDuotone,
  star: PiStarDuotone,
  bolt: PiLightningDuotone,
  phone: PiDeviceMobileDuotone,
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
