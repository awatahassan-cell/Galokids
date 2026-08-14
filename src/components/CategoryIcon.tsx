import React from 'react';
import {
  Shirt, Baby, Sparkles, Gamepad, Footprints, Smile, CloudRain, Flame,
  ShoppingBag, Tag, Palette, Heart, Backpack, Crown, Car, Gift,
} from 'lucide-react';
import { KidsIcon, kidsIconForCategory, isCategoryIconName, type KidsIconName } from './KidsIcons';

/**
 * Icon names categories were saved with before the picker was rebuilt.
 *
 * The old picker stored a Lucide component name — "Shirt", "Gamepad". Those
 * values are still on categories in the database, so they have to keep
 * resolving; only the choices offered from now on come from KidsIcons.
 *
 * Listed explicitly rather than looked up off a namespace import: reaching
 * into `import * as LucideIcons` with a runtime key defeats tree-shaking, and
 * shipped the entire icon package — 795 kB, 146 kB gzipped — to every visitor
 * for the sake of these sixteen.
 */
const LEGACY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt, Baby, Sparkles, Gamepad, Footprints, Smile, CloudRain, Flame,
  ShoppingBag, Tag, Palette, Heart, Backpack, Crown, Car, Gift,
};

/** Old Lucide names mapped onto their nearest drawn equivalent. */
const LEGACY_TO_DRAWN: Record<string, KidsIconName> = {
  Shirt: 'shirt', Baby: 'baby', Sparkles: 'sparkle', Gamepad: 'toy',
  Footprints: 'shoes', CloudRain: 'rain', ShoppingBag: 'bag',
  Heart: 'heart', Backpack: 'bag', Crown: 'hat', Car: 'toy', Gift: 'gift',
};

interface CategoryIconProps {
  /** The category's stored icon name, or its display name. */
  name?: string;
  className?: string;
  /**
   * Use the plain single-stroke glyph instead of the coloured one. The admin
   * tables want a quiet icon that sits in a row of text; the storefront wants
   * the coloured one.
   */
  plain?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-6 h-6', plain }) => {
  // An icon the shop picked itself wins outright. Guessing from the category's
  // name first meant a deliberate choice could be overridden by a word in the
  // title — choose the teddy for "Toys & Games" and the guess handed back the
  // toy brick instead.
  if (isCategoryIconName(name)) {
    return <KidsIcon name={name} className={className} inherit={plain} />;
  }

  // A choice made under the old picker, still stored on the category.
  if (name && LEGACY_ICONS[name]) {
    const drawn = LEGACY_TO_DRAWN[name];
    if (drawn && !plain) return <KidsIcon name={drawn} className={className} />;
    const Legacy = LEGACY_ICONS[name];
    return <Legacy className={className} />;
  }

  // Nothing chosen: read the category's own name and make the best guess, so a
  // shop that never opens the picker still gets sensible icons.
  const guess = kidsIconForCategory(name);
  if (guess) return <KidsIcon name={guess} className={className} inherit={plain} />;

  if (!plain) return <KidsIcon name="sparkle" className={className} />;
  return <Sparkles className={className} />;
};
