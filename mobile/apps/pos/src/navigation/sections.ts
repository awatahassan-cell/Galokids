import type { ComponentType } from 'react';

/**
 * Every screen the back office has, and who may open it.
 *
 * The permission on each entry is the one the server checks for that screen's
 * own endpoints — not a separate idea of access invented here. Hiding a tile
 * is a courtesy so a cashier is not shown a door that will not open; the
 * server still refuses, and that refusal is the real control.
 *
 * `offline` marks the two things that keep working with no signal. Everything
 * else reads the whole dataset and is shown as unavailable rather than empty,
 * because an empty report looks like a shop that sold nothing.
 */

export type SectionId =
  | 'till'
  | 'orders'
  | 'page-orders'
  | 'products'
  | 'inventory'
  | 'stock-ledger'
  | 'purchases'
  | 'suppliers'
  | 'reports'
  | 'cashiers'
  | 'shifts'
  | 'expenses'
  | 'coupons'
  | 'customers'
  | 'staff'
  | 'categories'
  | 'reviews'
  | 'messages'
  | 'labels'
  | 'activity'
  | 'settings';

export interface Section {
  id: SectionId;
  /** The route under /(admin)/. */
  route: string;
  title: string;
  subtitle: string;
  icon: string;
  permission: string;
  group: 'sell' | 'stock' | 'money' | 'people' | 'system';
  /** True when the screen still works with no connection. */
  offline?: boolean;
}

export const GROUPS: { id: Section['group']; title: string }[] = [
  { id: 'sell', title: 'فرۆشتن' },
  { id: 'stock', title: 'کۆگا و بەرهەم' },
  { id: 'money', title: 'دارایی و ڕاپۆرت' },
  { id: 'people', title: 'کەسەکان' },
  { id: 'system', title: 'سیستەم' },
];

export const SECTIONS: Section[] = [
  // ---- selling -------------------------------------------------------
  {
    id: 'till',
    route: 'till',
    title: 'سیستەمی فرۆشتن',
    subtitle: 'سکێن، سەبەتە و وەرگرتنی پارە',
    icon: '🧾',
    permission: 'pos.access',
    group: 'sell',
    offline: true,
  },
  {
    id: 'orders',
    route: 'orders',
    title: 'داواکارییەکانی وێبسایت',
    subtitle: 'بینین و گۆڕینی دۆخ',
    icon: '📦',
    permission: 'orders.view',
    group: 'sell',
  },
  {
    id: 'page-orders',
    route: 'page-orders',
    title: 'داواکاری پەیج',
    subtitle: 'داواکاری سۆشیاڵ میدیا',
    icon: '💬',
    permission: 'orders.manage',
    group: 'sell',
  },
  {
    id: 'shifts',
    route: 'shifts',
    title: 'شیفتەکان',
    subtitle: 'کردنەوە، داخستن و دراوەری پارە',
    icon: '🕐',
    permission: 'pos.reports',
    group: 'sell',
  },

  // ---- stock ---------------------------------------------------------
  {
    id: 'products',
    route: 'products',
    title: 'بەرهەمەکان',
    subtitle: 'زیادکردن، نرخ و بارکۆد',
    icon: '👕',
    permission: 'products.view',
    group: 'stock',
    offline: true,
  },
  {
    id: 'inventory',
    route: 'inventory',
    title: 'جەردی کۆگا',
    subtitle: 'بڕی ماوە و نرخی کۆگا',
    icon: '📊',
    permission: 'inventory.view',
    group: 'stock',
  },
  {
    id: 'stock-ledger',
    route: 'stock-ledger',
    title: 'مێژووی ستۆک',
    subtitle: 'هەموو جوڵەیەکی کۆگا',
    icon: '📜',
    permission: 'inventory.view',
    group: 'stock',
  },
  {
    id: 'purchases',
    route: 'purchases',
    title: 'کڕین',
    subtitle: 'وەصڵی کڕین و تێچوو',
    icon: '🚚',
    permission: 'purchases.manage',
    group: 'stock',
  },
  {
    id: 'suppliers',
    route: 'suppliers',
    title: 'دابینکەران',
    subtitle: 'هەژمار و قەرزەکان',
    icon: '🏭',
    permission: 'purchases.manage',
    group: 'stock',
  },
  {
    id: 'categories',
    route: 'categories',
    title: 'بەشەکان',
    subtitle: 'پۆلەکانی فرۆشگا',
    icon: '🗂️',
    permission: 'categories.manage',
    group: 'stock',
  },
  {
    id: 'labels',
    route: 'labels',
    title: 'لەیبل و بارکۆد',
    subtitle: 'چاپکردنی ستیکەر',
    icon: '🏷️',
    permission: 'labels.print',
    group: 'stock',
  },

  // ---- money ---------------------------------------------------------
  {
    id: 'reports',
    route: 'reports',
    title: 'ڕاپۆرتەکان',
    subtitle: 'داهات، تێچوو و قازانج',
    icon: '📈',
    permission: 'reports.view',
    group: 'money',
  },
  {
    id: 'cashiers',
    route: 'cashiers',
    title: 'فرۆشتنی کاشێرەکان',
    subtitle: 'کێ چەندی فرۆشتووە',
    icon: '🧑‍💼',
    permission: 'reports.view',
    group: 'money',
  },
  {
    id: 'expenses',
    route: 'expenses',
    title: 'خەرجییەکان',
    subtitle: 'تۆمارکردنی خەرجی',
    icon: '💸',
    permission: 'expenses.manage',
    group: 'money',
  },
  {
    id: 'coupons',
    route: 'coupons',
    title: 'کوپۆنەکان',
    subtitle: 'کۆدی داشکاندن',
    icon: '🎟️',
    permission: 'coupons.manage',
    group: 'money',
  },

  // ---- people --------------------------------------------------------
  {
    id: 'customers',
    route: 'customers',
    title: 'کڕیاران',
    subtitle: 'لیست و مێژووی کڕین',
    icon: '👥',
    permission: 'customers.view',
    group: 'people',
  },
  {
    id: 'staff',
    route: 'staff',
    title: 'ستاف و دەسەڵاتەکان',
    subtitle: 'زیادکردن و پێدانی دەسەڵات',
    icon: '🔑',
    permission: 'staff.manage',
    group: 'people',
  },
  {
    id: 'reviews',
    route: 'reviews',
    title: 'هەڵسەنگاندنەکان',
    subtitle: 'ڕای کڕیاران',
    icon: '⭐',
    permission: 'products.view',
    group: 'people',
  },
  {
    id: 'messages',
    route: 'messages',
    title: 'پەیامەکان',
    subtitle: 'پەیوەندی کڕیاران',
    icon: '✉️',
    permission: 'messages.view',
    group: 'people',
  },

  // ---- system --------------------------------------------------------
  {
    id: 'activity',
    route: 'activity',
    title: 'تۆماری چالاکی',
    subtitle: 'کێ چی گۆڕی',
    icon: '🕵️',
    permission: 'activity_log.view',
    group: 'system',
  },
  {
    id: 'settings',
    route: 'settings',
    title: 'ڕێکخستنەکان',
    subtitle: 'فرۆشگا، گەیاندن و ئامێر',
    icon: '⚙️',
    permission: 'settings.manage',
    group: 'system',
  },
];

export function sectionsFor(can: (permission: string) => boolean): Section[] {
  return SECTIONS.filter(section => can(section.permission));
}
