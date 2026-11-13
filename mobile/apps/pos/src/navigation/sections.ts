import type { NavIconName } from './NavIcon';

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
  | 'overview'
  | 'calendar'
  | 'banner'
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
  icon: NavIconName;
  permission: string;
  group: 'insight' | 'sell' | 'stock' | 'money' | 'people' | 'system';
  /** True when the screen still works with no connection. */
  offline?: boolean;
}

export const GROUPS: { id: Section['group']; title: string }[] = [
  { id: 'insight', title: 'ئامار' },
  { id: 'sell', title: 'فرۆشتن' },
  { id: 'stock', title: 'کۆگا و بەرهەم' },
  { id: 'money', title: 'دارایی و ڕاپۆرت' },
  { id: 'people', title: 'کەسەکان' },
  { id: 'system', title: 'سیستەم' },
];

export const SECTIONS: Section[] = [
  // ---- what the shop is doing ----------------------------------------
  {
    id: 'overview',
    route: 'overview',
    title: 'ڕوونکردنەوەی گشتی',
    subtitle: 'داهات، قازانج و دۆخی ئەمڕۆ',
    icon: 'dashboard',
    permission: 'reports.view',
    group: 'insight',
  },
  {
    id: 'calendar',
    route: 'calendar',
    title: 'ڕۆژژمێری فرۆشتن',
    subtitle: 'ڕۆژ بە ڕۆژی مانگەکە',
    icon: 'calendar',
    permission: 'reports.view',
    group: 'insight',
  },

  // ---- selling -------------------------------------------------------
  {
    id: 'till',
    route: 'till',
    title: 'سیستەمی فرۆشتن',
    subtitle: 'سکێن، سەبەتە و وەرگرتنی پارە',
    icon: 'till',
    permission: 'pos.access',
    group: 'sell',
    offline: true,
  },
  {
    id: 'orders',
    route: 'orders',
    title: 'داواکارییەکانی وێبسایت',
    subtitle: 'بینین و گۆڕینی دۆخ',
    icon: 'orders',
    permission: 'orders.view',
    group: 'sell',
  },
  {
    id: 'page-orders',
    route: 'page-orders',
    title: 'داواکاری پەیج',
    subtitle: 'داواکاری سۆشیاڵ میدیا',
    icon: 'page-order',
    permission: 'orders.manage',
    group: 'sell',
  },
  {
    id: 'shifts',
    route: 'shifts',
    title: 'شیفتەکان',
    subtitle: 'کردنەوە، داخستن و دراوەری پارە',
    icon: 'shifts',
    permission: 'pos.reports',
    group: 'sell',
  },

  // ---- stock ---------------------------------------------------------
  {
    id: 'products',
    route: 'products',
    title: 'بەرهەمەکان',
    subtitle: 'زیادکردن، نرخ و بارکۆد',
    icon: 'products',
    permission: 'products.view',
    group: 'stock',
    offline: true,
  },
  {
    id: 'inventory',
    route: 'inventory',
    title: 'جەردی کۆگا',
    subtitle: 'بڕی ماوە و نرخی کۆگا',
    icon: 'inventory',
    permission: 'inventory.view',
    group: 'stock',
  },
  {
    id: 'stock-ledger',
    route: 'stock-ledger',
    title: 'مێژووی ستۆک',
    subtitle: 'هەموو جوڵەیەکی کۆگا',
    icon: 'ledger',
    permission: 'inventory.view',
    group: 'stock',
  },
  {
    id: 'purchases',
    route: 'purchases',
    title: 'کڕین',
    subtitle: 'وەصڵی کڕین و تێچوو',
    icon: 'purchases',
    permission: 'purchases.manage',
    group: 'stock',
  },
  {
    id: 'suppliers',
    route: 'suppliers',
    title: 'دابینکەران',
    subtitle: 'هەژمار و قەرزەکان',
    icon: 'suppliers',
    permission: 'purchases.manage',
    group: 'stock',
  },
  {
    id: 'categories',
    route: 'categories',
    title: 'بەشەکان',
    subtitle: 'پۆلەکانی فرۆشگا',
    icon: 'categories',
    permission: 'categories.manage',
    group: 'stock',
  },
  {
    id: 'labels',
    route: 'labels',
    title: 'لەیبل و بارکۆد',
    subtitle: 'چاپکردنی ستیکەر',
    icon: 'labels',
    permission: 'labels.print',
    group: 'stock',
    // Reads the device's own catalogue and encodes the barcode here, so a shop
    // can label new stock in a back room with no signal.
    offline: true,
  },

  // ---- money ---------------------------------------------------------
  {
    id: 'reports',
    route: 'reports',
    title: 'ڕاپۆرتەکان',
    subtitle: 'داهات، تێچوو و قازانج',
    icon: 'profit',
    permission: 'reports.view',
    group: 'money',
  },
  {
    id: 'cashiers',
    route: 'cashiers',
    title: 'فرۆشتنی کاشێرەکان',
    subtitle: 'کێ چەندی فرۆشتووە',
    icon: 'cashiers',
    permission: 'reports.view',
    group: 'money',
  },
  {
    id: 'expenses',
    route: 'expenses',
    title: 'خەرجییەکان',
    subtitle: 'تۆمارکردنی خەرجی',
    icon: 'expenses',
    permission: 'expenses.manage',
    group: 'money',
  },
  {
    id: 'coupons',
    route: 'coupons',
    title: 'کوپۆنەکان',
    subtitle: 'کۆدی داشکاندن',
    icon: 'coupons',
    permission: 'coupons.manage',
    group: 'money',
  },

  // ---- people --------------------------------------------------------
  {
    id: 'banner',
    route: 'banner',
    title: 'بانەری سەرەکی',
    subtitle: 'ڕیکلامی سەرەوەی ئەپ و وێبسایت',
    icon: 'banner',
    permission: 'settings.manage',
    group: 'money',
  },

  {
    id: 'customers',
    route: 'customers',
    title: 'کڕیاران',
    subtitle: 'لیست و مێژووی کڕین',
    icon: 'customers',
    permission: 'customers.view',
    group: 'people',
  },
  {
    id: 'staff',
    route: 'staff',
    title: 'ستاف و دەسەڵاتەکان',
    subtitle: 'زیادکردن و پێدانی دەسەڵات',
    icon: 'staff',
    permission: 'staff.manage',
    group: 'people',
  },
  {
    id: 'reviews',
    route: 'reviews',
    title: 'هەڵسەنگاندنەکان',
    subtitle: 'ڕای کڕیاران',
    icon: 'reviews',
    permission: 'products.view',
    group: 'people',
  },
  {
    id: 'messages',
    route: 'messages',
    title: 'پەیامەکان',
    subtitle: 'پەیوەندی کڕیاران',
    icon: 'messages',
    permission: 'messages.view',
    group: 'people',
  },

  // ---- system --------------------------------------------------------
  {
    id: 'activity',
    route: 'activity',
    title: 'تۆماری چالاکی',
    subtitle: 'کێ چی گۆڕی',
    icon: 'activity',
    permission: 'activity_log.view',
    group: 'system',
  },
  {
    id: 'settings',
    route: 'settings',
    title: 'ڕێکخستنەکان',
    subtitle: 'فرۆشگا، گەیاندن و ئامێر',
    icon: 'settings',
    permission: 'settings.manage',
    group: 'system',
  },
];

export function sectionsFor(can: (permission: string) => boolean): Section[] {
  return SECTIONS.filter(section => can(section.permission));
}
