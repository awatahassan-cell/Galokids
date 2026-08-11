import React from 'react';
import {
  Shirt, Baby, Sparkles, Gamepad, Footprints, Smile, CloudRain, Flame,
  ShoppingBag, Tag, Palette, Heart, Backpack, Crown, Car, Gift,
} from 'lucide-react';
import { KidsIcon, kidsIconForCategory } from './KidsIcons';

/**
 * The icons the admin panel offers when naming a category.
 *
 * Listed explicitly rather than looked up off a namespace import: reaching
 * into `import * as LucideIcons` with a runtime key defeats tree-shaking, and
 * shipped the entire icon package — 795 kB, 146 kB gzipped — to every visitor
 * for the sake of these sixteen.
 */
const PICKER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shirt, Baby, Sparkles, Gamepad, Footprints, Smile, CloudRain, Flame,
  ShoppingBag, Tag, Palette, Heart, Backpack, Crown, Car, Gift,
};

/** The names the admin icon picker shows, in order. */
export const CATEGORY_ICON_NAMES = Object.keys(PICKER_ICONS);

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
  if (!plain) {
    const drawn = kidsIconForCategory(name);
    if (drawn) return <KidsIcon name={drawn} className={className} />;
  }

  if (name) {
    const Exact = PICKER_ICONS[name] || PICKER_ICONS[name.charAt(0).toUpperCase() + name.slice(1)];
    if (Exact) return <Exact className={className} />;
  }

  if (!plain) return <KidsIcon name="sparkle" className={className} />;
  return <Sparkles className={className} />;
};
