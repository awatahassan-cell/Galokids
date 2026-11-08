export const getColorHex = (colorName: string) => {
  if (!colorName) return '#cbd5e1';
  const trimmed = colorName.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb') || trimmed.startsWith('hsl')) return trimmed;
  const c = trimmed.toLowerCase();
  switch (c) {
    case 'red': case 'سوور': case 'أحمر': return '#ef4444';
    case 'blue': case 'شین': case 'أزرق': return '#3b82f6';
    case 'green': case 'سەوز': case 'أخضر': return '#22c55e';
    case 'yellow': case 'زەرد': case 'أصفر': return '#eab308';
    case 'black': case 'ڕەش': case 'أسود': return '#000000';
    case 'white': case 'سپی': case 'أبيض': return '#ffffff';
    case 'off-white': case 'off white': case 'offwhite': case 'ئۆف وایت': case 'أوف وايت': return '#fcfbf7';
    case 'navy': case 'navy blue': case 'indigo': case 'نیلی': case 'نيلي': return '#1e3a8a';
    case 'khaki': case 'حاکی': case 'حاكی': case 'خاکی': case 'كاكي': case 'خاكي': return '#c3b091';
    case 'wine': case 'burgundy': case 'شرابی': case 'شرابي': case 'نبيذي': case 'عنابي': return '#722f37';
    case 'maroon': case 'مارۆنی': case 'ماروني': return '#800000';
    case 'cream': case 'کرێمی': case 'كرێمی': case 'كريمي': return '#fffdd0';
    case 'pink': case 'پەمەیی': case 'وردي': return '#ec4899';
    case 'purple': case 'مۆر': case 'بنفسجي': return '#a855f7';
    case 'orange': case 'پڕتەقاڵی': case 'برتقالي': return '#f97316';
    case 'gray': case 'grey': case 'ڕەساسی': case 'رمادي': return '#6b7280';
    case 'brown': case 'قاوەیی': case 'بني': return '#92400e';
    case 'beige': case 'بێژ': case 'بيج': return '#fef3c7';
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
    'off-white': { ku: 'ئۆف وایت', ar: 'أوف وايت', en: 'Off-White' },
    'off white': { ku: 'ئۆف وایت', ar: 'أوف وايت', en: 'Off-White' },
    offwhite: { ku: 'ئۆف وایت', ar: 'أوف وايت', en: 'Off-White' },
    'ئۆف وایت': { ku: 'ئۆف وایت', ar: 'أوف وايت', en: 'Off-White' },
    'navy blue': { ku: 'نیلی', ar: 'أزرق نيلي', en: 'Navy Blue' },
    indigo: { ku: 'نیلی', ar: 'نيلي', en: 'Indigo' },
    navy: { ku: 'نیلی', ar: 'نيلي', en: 'Navy' },
    'نیلی': { ku: 'نیلی', ar: 'نيلي', en: 'Navy Blue' },
    khaki: { ku: 'حاکی', ar: 'كاكي', en: 'Khaki' },
    'حاکی': { ku: 'حاکی', ar: 'كاكي', en: 'Khaki' },
    'حاكی': { ku: 'حاکی', ar: 'كاكي', en: 'Khaki' },
    'خاکی': { ku: 'حاکی', ar: 'كاكي', en: 'Khaki' },
    burgundy: { ku: 'شرابی', ar: 'نبيذي', en: 'Burgundy' },
    wine: { ku: 'شرابی', ar: 'نبيذي', en: 'Wine' },
    'شرابی': { ku: 'شرابی', ar: 'نبيذي', en: 'Burgundy' },
    'شرابي': { ku: 'شرابی', ar: 'نبيذي', en: 'Burgundy' },
    maroon: { ku: 'مارۆنی', ar: 'ماروني', en: 'Maroon' },
    'مارۆنی': { ku: 'مارۆنی', ar: 'ماروني', en: 'Maroon' },
    cream: { ku: 'کرێمی', ar: 'كريمي', en: 'Cream' },
    'کرێمی': { ku: 'کرێمی', ar: 'كريمي', en: 'Cream' },
    'كرێمی': { ku: 'کرێمی', ar: 'كريمي', en: 'Cream' },
    pink: { ku: 'پەمەیی', ar: 'وردي', en: 'Pink' },
    purple: { ku: 'مۆر', ar: 'بنفسجي', en: 'Purple' },
    orange: { ku: 'پڕتەقاڵی', ar: 'برتقالي', en: 'Orange' },
    gray: { ku: 'ڕەساسی', ar: 'رمادي', en: 'Gray' },
    grey: { ku: 'ڕەساسی', ar: 'رمادي', en: 'Grey' },
    brown: { ku: 'قاوەیی', ar: 'بني', en: 'Brown' },
    beige: { ku: 'بێژ', ar: 'بيج', en: 'Beige' },
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
