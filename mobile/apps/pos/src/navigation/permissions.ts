/**
 * The permissions an admin can tick, with what each actually unlocks.
 *
 * The ids must match the strings the server checks — `requirePermission` in
 * the Laravel controllers — and the presets must match ROLE_PERMISSION_PRESETS
 * on the website and `defaultsFor()` in the backend's User model. There are now
 * three copies of this list; they have drifted once already, and the result was
 * a staff member being offered a screen the API then refused.
 *
 * The hint on each is what the shopkeeper reads, so it says what the person
 * will be able to do rather than naming the endpoint.
 */

export interface PermissionOption {
  id: string;
  label: string;
  hint: string;
}

export const ALL_PERMISSIONS: PermissionOption[] = [
  { id: 'pos.access', label: 'بەکارهێنانی پۆس', hint: 'کردنەوەی شاشەی فرۆشتن و وەرگرتنی پارە' },
  { id: 'pos.reports', label: 'فرۆشتن و شیفتەکان', hint: 'بینینی فرۆشتنەکانی خۆی و شیفتەکان' },

  { id: 'orders.view', label: 'بینینی داواکارییەکان', hint: 'لیستی داواکارییەکانی وێبسایت' },
  { id: 'orders.manage', label: 'گۆڕینی دۆخی داواکاری', hint: 'لە چاوەڕوانەوە بۆ گەیەنراو' },
  { id: 'orders.delete', label: 'سڕینەوەی داواکاری', hint: 'لابردنی داواکاری لە داتابەیس' },

  { id: 'products.view', label: 'بینینی بەرهەمەکان', hint: 'کەتەلۆگ و نرخەکان' },
  { id: 'products.manage', label: 'زیادکردن و گۆڕینی بەرهەم', hint: 'بەرهەمی نوێ، نرخ و وێنە' },
  { id: 'products.delete', label: 'سڕینەوەی بەرهەم', hint: 'لابردنی بەرهەم لە فرۆشگا' },
  { id: 'categories.manage', label: 'بەڕێوەبردنی بەشەکان', hint: 'پۆلەکانی فرۆشگا' },
  { id: 'labels.print', label: 'چاپکردنی لەیبل', hint: 'ستیکەری بارکۆد' },

  { id: 'inventory.view', label: 'بینینی کۆگا', hint: 'بڕی ماوە و مێژووی ستۆک' },
  { id: 'inventory.manage', label: 'ڕاستکردنەوەی ستۆک', hint: 'گۆڕینی ژمارەی دانەکان دوای ژماردن' },
  { id: 'purchases.manage', label: 'کڕین و دابینکەران', hint: 'وەصڵی کڕین و هەژماری دابینکەران' },

  { id: 'reports.view', label: 'ڕاپۆرتە داراییەکان', hint: 'داهات، تێچوو و قازانج' },
  { id: 'expenses.manage', label: 'خەرجییەکان', hint: 'تۆمارکردنی خەرجی' },
  { id: 'coupons.manage', label: 'کوپۆنەکان', hint: 'کۆدی داشکاندن' },

  { id: 'customers.view', label: 'بینینی کڕیاران', hint: 'لیستی کڕیارانی تۆمارکراو' },
  { id: 'staff.manage', label: 'بەڕێوەبردنی ستاف', hint: 'زیادکردنی ستاف و پێدانی دەسەڵات' },
  { id: 'messages.view', label: 'پەیامەکان', hint: 'پەیامی پەیوەندی کڕیاران' },

  { id: 'settings.manage', label: 'ڕێکخستنەکان', hint: 'فرۆشگا، گەیاندن و بانەر' },
  { id: 'activity_log.view', label: 'تۆماری چالاکی', hint: 'کێ چی گۆڕیوە' },
];

/**
 * The same three the website offers, so a preset means the same thing
 * everywhere. Plain string arrays, not `as const`: these are handed straight
 * to a form's state and copied into a request body, both of which want a
 * mutable list.
 */
export const PRESETS: Record<'cashier' | 'warehouse' | 'sales', string[]> = {
  cashier: [
    'pos.access',
    'pos.reports',
    'orders.view',
    'orders.manage',
    'products.view',
    'labels.print',
    'customers.view',
  ],
  warehouse: [
    'products.view',
    'products.manage',
    'inventory.view',
    'inventory.manage',
    'purchases.manage',
    'labels.print',
  ],
  sales: ['orders.view', 'orders.manage', 'products.view', 'customers.view'],
};
