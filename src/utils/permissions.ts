import { User } from '../types';
import { isAdminRole, isCashierRole, isStaffRole } from './roles';

export interface PermissionDefinition {
  id: string;
  category: 'orders' | 'catalog' | 'inventory' | 'sales' | 'reports' | 'users' | 'system';
  labelKu: string;
  labelAr: string;
  labelEn: string;
  descriptionKu: string;
}

export interface PermissionCategory {
  id: 'orders' | 'catalog' | 'inventory' | 'sales' | 'reports' | 'users' | 'system';
  nameKu: string;
  nameAr: string;
  nameEn: string;
  icon: string;
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  { id: 'orders', nameKu: 'داواکارییەکان', nameAr: 'الطلبات', nameEn: 'Orders', icon: 'ShoppingBag' },
  { id: 'sales', nameKu: 'پۆس و فرۆشتنی کاشێر', nameAr: 'نقطة البيع (POS)', nameEn: 'POS & Cashier', icon: 'Store' },
  { id: 'catalog', nameKu: 'کەتەلۆگ و کاڵاکان', nameAr: 'المنتجات والأقسام', nameEn: 'Catalog & Products', icon: 'Package' },
  { id: 'inventory', nameKu: 'کۆگا و دابینکردن', nameAr: 'المخزون والمشتريات', nameEn: 'Inventory & Purchases', icon: 'Boxes' },
  { id: 'reports', nameKu: 'ڕاپۆرت و دارایی', nameAr: 'التقارير والمالية', nameEn: 'Reports & Financials', icon: 'TrendingUp' },
  { id: 'users', nameKu: 'بەکارهێنەران و کڕیاران', nameAr: 'المستخدمين والزبائن', nameEn: 'Users & Customers', icon: 'Users' },
  { id: 'system', nameKu: 'ڕێکخستنەکانی سیستەم', nameAr: 'إعدادات النظام', nameEn: 'System Settings', icon: 'Settings' },
];

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // 1. Orders
  { 
    id: 'orders.view', 
    category: 'orders', 
    labelKu: 'بینینی داواکارییەکانی وێبسایت', 
    labelAr: 'عرض طلبات الموقع', 
    labelEn: 'View Website Orders', 
    descriptionKu: 'بینینی هەموو داواکارییە ئۆنلاینەکانی کڕیاران' 
  },
  { 
    id: 'orders.manage', 
    category: 'orders', 
    labelKu: 'گۆڕینی دۆخی داواکاری و ناردنی وەتسەپ', 
    labelAr: 'تحديث حالة الطلب وإرسال واتساب', 
    labelEn: 'Manage Order Status & WhatsApp', 
    descriptionKu: 'گۆڕینی دۆخ (لە پرۆسەدایە، گەیەنرا) و ناردنی پسوولەی وەتسەپ' 
  },
  { 
    id: 'orders.delete', 
    category: 'orders', 
    labelKu: 'سڕینەوەی داواکاری', 
    labelAr: 'حذف الطلبات', 
    labelEn: 'Delete Orders', 
    descriptionKu: 'سڕینەوەی داواکارییەکان لە داتابەیس' 
  },

  // 2. POS & Sales
  { 
    id: 'pos.access', 
    category: 'sales', 
    labelKu: 'بەکارهێنانی پۆس (سیستەمی فرۆشتنی کاشێر)', 
    labelAr: 'استخدام نقطة البيع (POS)', 
    labelEn: 'Access POS Cashier', 
    descriptionKu: 'کردنەوەی شاشەی کاشێر و فرۆشتنی کاڵا لەناو فرۆشگا' 
  },
  { 
    id: 'pos.reports', 
    category: 'sales', 
    labelKu: 'بینینی فرۆشتنەکانی کاشێر و ڕاپۆرتی شیفت', 
    labelAr: 'عرض مبيعات الكاشير والمناوبات', 
    labelEn: 'View POS Sales & Shift Reports', 
    descriptionKu: 'بینینی لیستی فرۆشتنەکانی کاشێر و داهاتی شیفتەکان' 
  },
  { 
    id: 'coupons.manage', 
    category: 'sales', 
    labelKu: 'بەڕێوەبردنی کوپۆنەکانی داشکاندن', 
    labelAr: 'إدارة كوبونات الخصم', 
    labelEn: 'Manage Discount Coupons', 
    descriptionKu: 'دروستکردن و دەستکاریکردنی کۆدی داشکاندن' 
  },

  // 3. Catalog & Products
  { 
    id: 'products.view', 
    category: 'catalog', 
    labelKu: 'بینینی کەتەلۆگ و کاڵاکان', 
    labelAr: 'عرض المنتجات', 
    labelEn: 'View Products', 
    descriptionKu: 'بینینی لیستی بەرهەمەکان و نرخ' 
  },
  { 
    id: 'products.manage', 
    category: 'catalog', 
    labelKu: 'زیادکردن و دەستکاریکردنی کاڵاکان', 
    labelAr: 'إضافة وتعديل المنتجات', 
    labelEn: 'Add & Edit Products', 
    descriptionKu: 'دانانی بەرهەمی نوێ، گۆڕینی نرخ و وێنە' 
  },
  { 
    id: 'products.delete', 
    category: 'catalog', 
    labelKu: 'سڕینەوەی کاڵاکان', 
    labelAr: 'حذف المنتجات', 
    labelEn: 'Delete Products', 
    descriptionKu: 'سڕینەوەی بەرهەم لە فرۆشگا' 
  },
  { 
    id: 'categories.manage', 
    category: 'catalog', 
    labelKu: 'بەڕێوەبردنی بەشەکان (پۆلەکان)', 
    labelAr: 'إدارة الأقسام', 
    labelEn: 'Manage Categories', 
    descriptionKu: 'زیادکردن، گۆڕین و سڕینەوەی بەشەکانی فرۆشگا' 
  },
  { 
    id: 'labels.print', 
    category: 'catalog', 
    labelKu: 'چاپکردنی لەیبل و بارکۆد', 
    labelAr: 'طباعة اللواصق والباركود', 
    labelEn: 'Print Labels & Barcodes', 
    descriptionKu: 'چاپکردنی ستیكەری بارکۆد و لەیبلی سەر کاڵا' 
  },

  // 4. Inventory & Purchases
  { 
    id: 'inventory.view', 
    category: 'inventory', 
    labelKu: 'بینینی جەردی کۆگا و مێژووی ستۆک', 
    labelAr: 'عرض جرد المستودع وسجل الحركات', 
    labelEn: 'View Inventory & Stock Ledger', 
    descriptionKu: 'بینینی بڕی دانەی ماوە لە کۆگا و ڕاپۆرتی کەمی ستۆک' 
  },
  { 
    id: 'inventory.manage', 
    category: 'inventory', 
    labelKu: 'دەستکاریکردنی ستۆک و بڕی کۆگا', 
    labelAr: 'تعديل وتحديث المخزون', 
    labelEn: 'Adjust Stock Quantities', 
    descriptionKu: 'زیادکردن و کەمکردنی ژمارەی دانەی کاڵاکان لە کۆگا' 
  },
  { 
    id: 'purchases.manage', 
    category: 'inventory', 
    labelKu: 'کڕین و دابینکردن (Purchases & Restock)', 
    labelAr: 'المشتريات والتوريد', 
    labelEn: 'Purchases & Restock', 
    descriptionKu: 'تۆمارکردنی وەصڵی کڕین، تێچوو و هەژماری دابینکەران' 
  },

  // 5. Reports & Financials
  { 
    id: 'reports.view', 
    category: 'reports', 
    labelKu: 'بینینی ڕاپۆرتە داراییەکان و قازانج', 
    labelAr: 'عرض التقارير المالية والأرباح', 
    labelEn: 'View Financial & Profit Reports', 
    descriptionKu: 'بینینی ڕاپۆرتی گشتی، ڕۆژمێری داهات و قازانجی پوخت' 
  },
  { 
    id: 'expenses.manage', 
    category: 'reports', 
    labelKu: 'بەڕێوەبردنی خەرجییەکان (Expenses)', 
    labelAr: 'إدارة المصروفات', 
    labelEn: 'Manage Expenses', 
    descriptionKu: 'تۆمارکردن، دەستکاریکردن و سڕینەوەی خەرجییەکان' 
  },

  // 6. Users & Customers
  { 
    id: 'customers.view', 
    category: 'users', 
    labelKu: 'بینینی کڕیاران و پەیوەندیکردن', 
    labelAr: 'عرض الزبائن والتواصل', 
    labelEn: 'View Customers & Contact', 
    descriptionKu: 'بینینی لیستی کڕیارانی تۆمارکراو و کردنەوەی وەتسەپیان' 
  },
  { 
    id: 'staff.manage', 
    category: 'users', 
    labelKu: 'بەڕێوەبردنی ستاف و پێرمیشنەکان', 
    labelAr: 'إدارة الموظفين والصلاحيات', 
    labelEn: 'Manage Staff & Permissions', 
    descriptionKu: 'زیادکردن و دەستکاریکردنی ستاف و پێدانی دەسەڵاتەکان' 
  },
  { 
    id: 'messages.view', 
    category: 'users', 
    labelKu: 'بینینی پەیامەکانی پەیوەندی', 
    labelAr: 'عرض رسائل اتصل بنا', 
    labelEn: 'View Contact Messages', 
    descriptionKu: 'بینینی پەیام و پرسیارەکانی کڕیاران و وەڵامدانەوەیان' 
  },

  // 7. System & Settings
  { 
    id: 'settings.manage', 
    category: 'system', 
    labelKu: 'ڕێکخستنەکانی سیستەم و بانەر', 
    labelAr: 'إعدادات النظام والبنرات', 
    labelEn: 'Store Settings & Banners', 
    descriptionKu: 'گۆڕینی ڕێکخستنی فرۆشگا، گەیاندنی خۆڕایی، بانەر و زمانەکان' 
  },
  { 
    id: 'activity_log.view', 
    category: 'system', 
    labelKu: 'بینینی تۆماری چالاکییەکان (Activity Log)', 
    labelAr: 'عرض سجل النشاطات', 
    labelEn: 'View Activity Log', 
    descriptionKu: 'بینینی هەموو ئەو چالاکی و گۆڕانکارییانەی ئەنجامدراون لەلایەن ستاف' 
  },
];

/** Default permission templates for quick assigning */
export const ROLE_PERMISSION_PRESETS = {
  admin: ALL_PERMISSIONS.map(p => p.id),
  cashier: [
    'pos.access',
    'pos.reports',
    'orders.view',
    'orders.manage',
    'products.view',
    'labels.print',
    'customers.view'
  ],
  warehouse: [
    'products.view',
    'products.manage',
    'inventory.view',
    'inventory.manage',
    'purchases.manage',
    'labels.print'
  ],
  sales_agent: [
    'orders.view',
    'orders.manage',
    'products.view',
    'customers.view'
  ]
};

/**
 * Checks whether a given user has a specific permission.
 * - Administrators (role === 1 or role === 'admin') have ALL permissions unconditionally.
 * - For staff/cashiers, checks their explicit `permissions` array, with fallback to role defaults.
 */
export const hasPermission = (user: User | null | undefined, permissionId: string): boolean => {
  if (!user) return false;

  // Admin role has all permissions unconditionally
  if (isAdminRole(user.role)) return true;

  // The role is checked before the list, not after: back-office permissions
  // belong to back-office roles. A customer carrying `["*"]` used to answer
  // yes to everything, and staff may edit customers — so anyone who could
  // edit a customer could mint one.
  if (!isCashierRole(user.role) && !isStaffRole(user.role)) return false;

  // Explicit permissions array on the user
  if (Array.isArray(user.permissions)) {
    if (user.permissions.includes('*') || user.permissions.includes('all')) return true;
    return user.permissions.includes(permissionId);
  }

  // Fallback defaults for legacy accounts
  if (isCashierRole(user.role)) {
    return ROLE_PERMISSION_PRESETS.cashier.includes(permissionId);
  }

  if (isStaffRole(user.role)) {
    return ROLE_PERMISSION_PRESETS.warehouse.includes(permissionId) || 
           ROLE_PERMISSION_PRESETS.sales_agent.includes(permissionId);
  }

  return false;
};

/**
 * Maps an admin tab ID to its required permission
 */
export const TAB_PERMISSION_MAP: Record<string, string> = {
  'overview': 'reports.view',
  'calendar': 'reports.view',
  'reports': 'reports.view',
  'products': 'products.view',
  'purchases': 'purchases.manage',
  'inventory': 'inventory.view',
  'stock-ledger': 'inventory.view',
  'categories': 'categories.manage',
  'labels': 'labels.print',
  'barcode-stickers': 'labels.print',
  'orders': 'orders.view',
  'social-orders': 'orders.view',
  'page-orders': 'orders.manage',
  'pos-sales': 'pos.reports',
  'expenses': 'expenses.manage',
  'coupons': 'coupons.manage',
  'banner': 'settings.manage',
  'users': 'customers.view',
  'reviews': 'products.view',
  'messages': 'messages.view',
  'settings': 'settings.manage',
  'translations': 'settings.manage',
  'activity-log': 'activity_log.view',
};
