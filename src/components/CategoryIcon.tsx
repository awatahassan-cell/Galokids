import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-6 h-6' }) => {
  if (!name) {
    return <LucideIcons.Sparkles className={className} />;
  }

  const cleanName = name.trim().toLowerCase();

  // Keyword mappings for common category terms (in Kurdish, English, Arabic)
  if (cleanName.includes('yari') || cleanName.includes('toy') || cleanName.includes('car') || cleanName.includes('بازی') || cleanName.includes('یاری')) {
    return <LucideIcons.Car className={className} />;
  }
  if (cleanName.includes('pilaw') || cleanName.includes('shoe') || cleanName.includes('foot') || cleanName.includes('حذاء') || cleanName.includes('پێڵاو')) {
    return <LucideIcons.Footprints className={className} />;
  }
  if (cleanName.includes('shirt') || cleanName.includes('tshirt') || cleanName.includes('cloth') || cleanName.includes('قميص') || cleanName.includes('تیشێرت') || cleanName.includes('پۆشاک')) {
    return <LucideIcons.Shirt className={className} />;
  }
  if (cleanName.includes('baby') || cleanName.includes('mndal') || cleanName.includes('طفل')) {
    return <LucideIcons.Baby className={className} />;
  }
  if (cleanName.includes('bag') || cleanName.includes('çant') || cleanName.includes('چانتە')) {
    return <LucideIcons.ShoppingBag className={className} />;
  }

  // Find exact matching Lucide icon dynamically
  const IconComponent = (LucideIcons as any)[name];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Try capitalized version (e.g. "shirt" -> "Shirt")
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  const CapitalComponent = (LucideIcons as any)[capitalized];
  if (CapitalComponent) {
    return <CapitalComponent className={className} />;
  }

  // Fallback icon
  return <LucideIcons.Sparkles className={className} />;
};

