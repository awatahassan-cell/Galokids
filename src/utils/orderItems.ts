import { Language } from '../i18n/translations';

/**
 * What an order line was for, in the language being read.
 *
 * An order is a receipt: it has to keep reading correctly after the catalogue
 * moves on. The server records the name on the line at the time of sale, so
 * that snapshot is preferred; the live product is only a fallback for orders
 * placed before that was recorded. When neither is there — an old line whose
 * product has since been deleted — say so rather than showing a blank row.
 */
export function orderItemName(item: any, language: Language): string {
  if (!item) return '—';

  const snapshot =
    (language === 'ku' && (item.productNameKu || item.product_name_ku)) ||
    (language === 'ar' && (item.productNameAr || item.product_name_ar)) ||
    item.productName ||
    item.product_name ||
    item.name;
  if (snapshot) return snapshot;

  const product = item.product;
  if (product) {
    const live =
      (language === 'ku' && product.nameKu) ||
      (language === 'ar' && product.nameAr) ||
      product.name ||
      product.title;
    if (live) return live;
  }

  return language === 'ku'
    ? 'بەرهەمی سڕاوە'
    : language === 'ar'
    ? 'منتج محذوف'
    : 'Deleted product';
}

/** "Pink · 2-3Y" — the variation as it read when the order was placed. */
export function orderItemVariation(item: any): string {
  if (!item) return '';
  const snapshot = item.variationLabel || item.variation_label;
  if (snapshot) return snapshot;

  const v = item.variation;
  if (!v) return '';
  return [v.color, v.size].filter(Boolean).join(' · ');
}
