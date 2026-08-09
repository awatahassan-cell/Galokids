export const getColorHex = (colorName: string) => {
  const c = colorName.toLowerCase().trim();
  switch (c) {
    case 'red': case 'سوور': case 'أحمر': return '#ef4444';
    case 'blue': case 'شین': case 'أزرق': return '#3b82f6';
    case 'green': case 'سەوز': case 'أخضر': return '#22c55e';
    case 'yellow': case 'زەرد': case 'أصفر': return '#eab308';
    case 'black': case 'ڕەش': case 'أسود': return '#000000';
    case 'white': case 'سپی': case 'أبيض': return '#ffffff';
    case 'pink': case 'پەمەیی': case 'وردي': return '#ec4899';
    case 'purple': case 'مۆر': case 'بنفسجي': return '#a855f7';
    case 'orange': case 'پرتەقاڵی': case 'برتقالي': return '#f97316';
    case 'gray': case 'grey': case 'ڕەساسی': case 'رمادي': return '#6b7280';
    case 'brown': case 'قاوەیی': case 'بني': return '#92400e';
    case 'navy': case 'نیلی': case 'كحلي': return '#1e3a8a';
    case 'beige': case 'بێجی': case 'بيج': return '#fef3c7';
    case 'sky': case 'sky blue': case 'شینی ئاسمانی': case 'أزرق سماوي': return '#38bdf8';
    default: return '#cbd5e1';
  }
};

export const getLocalizedColorName = (colorName: string, language: string): string => {
  if (!colorName) return '';
  const c = colorName.toLowerCase().trim();

  const colorMap: Record<string, { ku: string; ar: string; en: string }> = {
    red: { ku: 'سوور', ar: 'أحمر', en: 'Red' },
    blue: { ku: 'شین', ar: 'أزرق', en: 'Blue' },
    green: { ku: 'سەوز', ar: 'أخضر', en: 'Green' },
    yellow: { ku: 'زەرد', ar: 'أصفر', en: 'Yellow' },
    black: { ku: 'ڕەش', ar: 'أسود', en: 'Black' },
    white: { ku: 'سپی', ar: 'أبيض', en: 'White' },
    pink: { ku: 'پەمەیی', ar: 'وردي', en: 'Pink' },
    purple: { ku: 'مۆر', ar: 'بنفسجي', en: 'Purple' },
    orange: { ku: 'پرتەقاڵی', ar: 'برتقالي', en: 'Orange' },
    gray: { ku: 'ڕەساسی', ar: 'رمادي', en: 'Gray' },
    grey: { ku: 'ڕەساسی', ar: 'رمادي', en: 'Grey' },
    brown: { ku: 'قاوەیی', ar: 'بني', en: 'Brown' },
    navy: { ku: 'نیلی', ar: 'كحلي', en: 'Navy' },
    beige: { ku: 'بێجی', ar: 'بيج', en: 'Beige' },
    sky: { ku: 'شینی ئاسمانی', ar: 'أزرق سماوي', en: 'Sky Blue' },
    'sky blue': { ku: 'شینی ئاسمانی', ar: 'أزرق سماوي', en: 'Sky Blue' },
  };

  const found = colorMap[c];
  if (found) {
    if (language === 'ku') return found.ku;
    if (language === 'ar') return found.ar;
    return found.en;
  }

  return colorName;
};

export const getLocalizedSizeName = (sizeName: string, language: string): string => {
  if (!sizeName) return '';
  const s = sizeName.trim();
  const sLower = s.toLowerCase();

  const sizeMap: Record<string, { ku: string; ar: string; en: string }> = {
    newborn: { ku: 'تازەلەدایکبوو', ar: 'حديث الولادة', en: 'Newborn' },
    nb: { ku: 'تازەلەدایکبوو', ar: 'حديث الولادة', en: 'Newborn' },
    small: { ku: 'بچووک', ar: 'صغير', en: 'Small' },
    medium: { ku: 'ناوەند', ar: 'وسط', en: 'Medium' },
    large: { ku: 'گەورە', ar: 'كبير', en: 'Large' },
    xlarge: { ku: 'زۆر گەورە', ar: 'كبير جداً', en: 'X-Large' },
    'one size': { ku: 'سایزی ئازاد', ar: 'مقاس موحد', en: 'One Size' },
    'free size': { ku: 'سایزی ئازاد', ar: 'مقاس موحد', en: 'Free Size' },
    onesize: { ku: 'سایزی ئازاد', ar: 'مقاس موحد', en: 'One Size' },
    freesize: { ku: 'سایزی ئازاد', ar: 'مقاس موحد', en: 'Free Size' },
  };

  const found = sizeMap[sLower];
  if (found) {
    if (language === 'ku') return found.ku;
    if (language === 'ar') return found.ar;
    return found.en;
  }

  return sizeName;
};
