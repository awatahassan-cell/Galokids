import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4' }) => {
  if (!name) {
    return <LucideIcons.Folder className={className} />;
  }

  // Find matching Lucide icon dynamically
  const IconComponent = (LucideIcons as any)[name];
  
  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to a folder icon if the stored name is invalid
  return <LucideIcons.Folder className={className} />;
};
