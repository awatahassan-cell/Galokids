import React from 'react';
import * as LucideIcons from 'lucide-react';
import { KidsIcon, kidsIconForCategory } from './KidsIcons';

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

  // Fall back to the Lucide set: an exact match on the stored name first,
  // then its capitalised form, then a neutral placeholder.
  if (name) {
    const Exact = (LucideIcons as any)[name];
    if (Exact) return <Exact className={className} />;

    const capitalised = name.charAt(0).toUpperCase() + name.slice(1);
    const Capital = (LucideIcons as any)[capitalised];
    if (Capital) return <Capital className={className} />;
  }

  if (!plain) return <KidsIcon name="sparkle" className={className} />;
  return <LucideIcons.Sparkles className={className} />;
};
