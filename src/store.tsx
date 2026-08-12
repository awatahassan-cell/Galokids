import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { shopToday, shopDate } from './utils/shopTime';
import { Category, Product, CartItem, ProductVariation, Review, User, Order, Expense, PromoBanner, PaginationMeta, Coupon } from './types';
import { useToast } from './components/ui/Feedback';
import { API_BASE_URL } from './config/api';
import { normalizePhone, isSamePhone, formatIraqiPhone } from './utils/phone';
import { takePhoneVerification } from './services/otpService';
import { normalizeRole } from './utils/roles';
import { 
  CATEGORIES as initialCategories, 
  MOCK_PRODUCTS as initialProducts,
  MOCK_USERS as initialUsers,
  MOCK_ORDERS as initialOrders,
  MOCK_EXPENSES as initialExpenses
} from './data';

interface StoreContextType {
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  wishlist: string[]; // array of product IDs
  users: User[];
  orders: Order[];
  expenses: Expense[];
  currentUser: User | null;
  
  promoBanner: PromoBanner;
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  setAppliedCoupon: (coupon: Coupon | null) => void;
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (coupon: Coupon) => void;
  deleteCoupon: (id: string) => void;
  applyCoupon: (code: string, context?: { subtotal?: number; phone?: string }) => Promise<{ success: boolean; coupon?: Coupon; message?: string }>;
  fetchSalesReport: (from?: string, to?: string, channel?: string) => Promise<any>;
  fetchCashierReport: (from?: string, to?: string) => Promise<any>;
  fetchBestSellers: (limit?: number) => Promise<Product[]>;
  recordRecentlyViewed: (productId: string) => void;
  getRecentlyViewedIds: () => string[];
  trackOrder: (id: string, phone: string) => Promise<{ success: boolean; order?: any; message?: string }>;
  lookupCustomer: (phone: string) => Promise<any>;
  /** Delivery charge for a governorate, matching what the order will charge. */
  fetchShippingQuote: (governorate?: string, subtotal?: number) => Promise<{ fee: number; freeOver: number }>;
  /** Stock ledger (staff/admin). */
  fetchStockMovements: (filters?: Record<string, any>) => Promise<any>;
  /** Correct a stock level by hand, with a reason. */
  adjustStock: (payload: { productVariationId: string | number; countedQuantity?: number; quantityChange?: number; type?: string; note: string }) => Promise<{ success: boolean; message?: string }>;
  /**
   * Delete many rows at once. Admin only — the server refuses anyone else,
   * and reports which rows it skipped and why.
   */
  bulkDelete: (
    resource: 'products' | 'orders' | 'users' | 'categories' | 'reviews' | 'coupons' | 'expenses',
    ids: (string | number)[]
  ) => Promise<{ success: boolean; deleted: number; skipped: any[]; message?: string }>;
  /** Move several orders to one status. Admin only. */
  bulkOrderStatus: (ids: (string | number)[], status: string) => Promise<{ success: boolean; updated: number; message?: string }>;
  /** Who changed what (admin only). */
  fetchActivityLogs: (filters?: Record<string, any>) => Promise<any>;
  /** Cash into / out of the till outside a sale. */
  recordCashMovement: (direction: 'in' | 'out', amount: number, reason: string) => Promise<{ success: boolean; message?: string; summary?: any }>;
  fetchCashMovements: () => Promise<any[]>;
  /** Return items and take replacements in one transaction. */
  exchangeOrder: (orderId: string | number, returnedItems: any[], newItems: any[], reason?: string) => Promise<any>;
  /** Status changes for one order. */
  fetchOrderHistory: (orderId: string | number) => Promise<any[]>;
  storeSettings: Record<string, any>;
  saveSettings: (values: Record<string, any>) => Promise<boolean>;
  getCurrentShift: () => Promise<any>;
  openShift: (openingFloat: number) => Promise<any>;
  getShiftReport: () => Promise<any>;
  closeShift: (countedCash: number, note?: string) => Promise<any>;
  getOrderById: (orderId: string) => Promise<any>;
  refundOrder: (orderId: string, items: { order_item_id: number; quantity: number }[], reason?: string) => Promise<{ success: boolean; message?: string; data?: any }>;

  updatePromoBanner: (banner: PromoBanner) => void;
  addCategory: (category: Category) => void;
  addProduct: (product: Product) => void;
  isProductsLoading: boolean;
  /** Increments after any product create/update/delete. */
  productsRevision: number;
  productsPagination: PaginationMeta;
  ordersPagination: PaginationMeta;
  expensesPagination: PaginationMeta;
  reviewsPagination: PaginationMeta;
  reviews: Review[];
  refreshReviews: (page?: number, limit?: number) => void;
  refreshProducts: (page?: number, limit?: number, filters?: any, append?: boolean, bypassCache?: boolean) => Promise<void>;
  /** Every product across all pages — for reports that must not be paginated. */
  fetchAllProducts: () => Promise<Product[]>;
  refreshOrders: (page?: number, limit?: number) => Promise<void>;
  /** Non-null when the last orders fetch failed; the list on screen is stale. */
  ordersError: null | 'unauthorized' | 'unreachable';
  refreshExpenses: (page?: number, limit?: number) => void;
  refreshCategories: () => void;
  addToCart: (product: Product, variation: ProductVariation, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  addReview: (productId: string, review: Omit<Review, 'id' | 'productId' | 'date'>) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  addOrder: (order: Omit<Order, 'id' | 'date'>) => Promise<any>;
  deleteProduct: (productId: string) => void;
  deleteCategory: (categoryId: string) => void;
  deleteExpense: (expenseId: string) => void;
  deleteUser: (userId: string) => void;
  deleteOrder: (orderId: string) => void;
  updateProduct: (product: Product) => void;
  updateCategory: (category: Category) => void;
  updateExpense: (expense: Expense) => void;
  updateUser: (user: User) => void;
  addUser: (userData: any) => void;
  /** Local-only guess. Prefer the async `checkPhoneRegistered` — see below. */
  isPhoneRegistered: (phone: string) => boolean;
  /**
   * Asks the backend whether this mobile number already has an account.
   * The local check alone is wrong for anyone signing in on a new device,
   * where browser storage is empty.
   */
  checkPhoneRegistered: (phone: string) => Promise<boolean>;
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithPhone: (phone: string, name?: string, addressInfo?: any) => Promise<User | null>;
  registerWithPhone: (phone: string, name: string, addressInfo?: any) => Promise<User | null>;
  logout: () => void;
  register: (name: string, email: string, password?: string) => Promise<boolean>;
  updateProfile: (name: string, email: string, phone?: string, address?: string, password?: string, passwordConfirmation?: string) => Promise<{ success: boolean; message: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const LARAVEL_API_BASE = API_BASE_URL;
const inflightProductsRequests = new Map<string, Promise<any>>();
const productsResponseCache = new Map<string, { data: any; timestamp: number }>();

// Helper to convert snake_case JSON keys to camelCase for the frontend
function convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  
  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase());
      
      let val = obj[key];

      if (camelKey === 'customerName') {
        newObj['author'] = val;
      }
      if (camelKey === 'createdAt' && val) {
        // The API sends the instant in UTC ("…T22:30:00Z"), so slicing the
        // string off the front gave the UTC day. For the three hours after
        // midnight in the shop that is still yesterday — a sale rung up at
        // 01:30 was filed under the previous day on every screen. Convert the
        // instant to the shop's calendar day instead.
        const at = new Date(String(val));
        newObj['date'] = isNaN(at.getTime()) ? String(val).split('T')[0] : shopDate(at);
      }
      
      // Ensure specific fields have the correct JavaScript type expected by the React frontend
      if (camelKey === 'price' || camelKey === 'cost') {
        if (val !== null && val !== undefined) {
          val = Number(val) || 0;
        }
      }
      
      if (camelKey === 'id' || camelKey === 'categoryId' || camelKey === 'productId') {
        if (val !== null && val !== undefined) {
          val = String(val);
        }
      }
      
      // Handle fallback default images if null or empty from Laravel API
      if (camelKey === 'imageUrl') {
        val = val || 'https://images.unsplash.com/photo-1519241047957-be31d7379a5d?auto=format&fit=crop&q=80&w=800';
      }
      
      newObj[camelKey] = convertKeysToCamelCase(val);
    }

    // Ensure barcode and sku are synchronized
    if (newObj.sku && !newObj.barcode) {
      newObj.barcode = String(newObj.sku);
    }
    if (newObj.barcode && !newObj.sku) {
      newObj.sku = String(newObj.barcode);
    }

    // Normalize product gallery images if backend returns JSON text or null
    if (Object.prototype.hasOwnProperty.call(newObj, 'images')) {
      if (typeof newObj.images === 'string') {
        try {
          const parsed = JSON.parse(newObj.images);
          newObj.images = Array.isArray(parsed) ? parsed : [];
        } catch {
          newObj.images = [];
        }
      }
      if (!Array.isArray(newObj.images)) {
        newObj.images = [];
      }
    }

    if ((!newObj.images || !Array.isArray(newObj.images) || newObj.images.length === 0) && newObj.imageUrl) {
      newObj.images = [newObj.imageUrl];
    }

    if ((!newObj.imageUrl || String(newObj.imageUrl).trim() === '') && Array.isArray(newObj.images) && newObj.images.length > 0) {
      newObj.imageUrl = newObj.images[0];
    }

    // Normalize user role (1 = Admin, 2 = Cashier, 3 = Staff, 0 = Customer)
    if (Object.prototype.hasOwnProperty.call(newObj, 'role')) {
      newObj.role = normalizeRole(newObj.role);
    }

    return newObj;
  }
  
  return obj;
}

// Helper to convert camelCase JSON keys to snake_case for the Laravel backend
function convertKeysToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }
  
  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z0-9]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = convertKeysToSnakeCase(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const toast = useToast();
  const defaultPagination: PaginationMeta = { currentPage: 1, lastPage: 1, total: 0 };
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  // Bumped whenever a product is created, edited or deleted. Screens that own a
  // products query watch it and re-run their own fetch, keeping their filters
  // and page instead of being reset to an unfiltered page 1.
  const [productsRevision, setProductsRevision] = useState(0);
  const bumpProductsRevision = useCallback(() => setProductsRevision(v => v + 1), []);
  const [productsPagination, setProductsPagination] = useState<PaginationMeta>(defaultPagination);
  const [ordersPagination, setOrdersPagination] = useState<PaginationMeta>(defaultPagination);
  const [expensesPagination, setExpensesPagination] = useState<PaginationMeta>(defaultPagination);
  const [reviewsPagination, setReviewsPagination] = useState<PaginationMeta>(defaultPagination);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Set when the last orders fetch failed, so pages can tell an empty
  // history apart from a request that never landed.
  const [ordersError, setOrdersError] = useState<null | 'unauthorized' | 'unreachable'>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // The basket has to survive a reload — a shopper who refreshes mid-shop
  // was losing everything they had picked. Stored whole (product + variation
  // + quantity) so prices and stock limits are still there on the way back.
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kidskart_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((item: any) => item && item.id && item.product && item.variation)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kidskart_cart', JSON.stringify(cart));
    } catch {
      // A full quota shouldn't break checkout; the in-memory cart still works.
    }
  }, [cart]);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('kidskart_wishlist');
    if (saved) {
      try {
        return JSON.parse(saved).filter(Boolean);
      } catch (e) {}
    }
    return [];
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('kidskart_users_local');
    if (saved) {
      try {
        return JSON.parse(saved).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('kidskart_orders_local');
    if (saved) {
      try {
        return JSON.parse(saved).filter(Boolean);
      } catch (e) {}
    }
    return [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('kidskart_expenses_local');
    if (saved) {
      try {
        return JSON.parse(saved).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kidskart_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  
  
  const [promoBanner, setPromoBanner] = useState<PromoBanner>(() => {
    const saved = localStorage.getItem('promoBanner');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Error parsing saved promoBanner:', e);
      }
    }
    return { 
      imageUrl: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      titleEn: 'Summer Sale Collection',
      titleKu: 'کۆکراوەی داشکاندنی هاوینە',
      titleAr: 'تشكيلة تخفيضات الصيف',
      subtitleEn: 'Up to 50% off on selected items',
      subtitleKu: 'تا ٪٥٠ داشکاندن بۆ هەندێک کاڵا',
      subtitleAr: 'خصم يصل إلى 50٪ على عناصر محددة',
      isActive: true,
      slides: [
        {
          id: '1',
          badgeKu: 'داشکاندنی هاوینە',
          badgeAr: 'تخفيضات الصيف',
          badgeEn: 'Summer Sale',
          titleKu: 'کۆکراوەی داشکاندنی هاوینە',
          titleAr: 'مجموعة تخفيضات الصيف',
          titleEn: 'Summer Sale Collection',
          subtitleKu: 'تا ٪٥٠ داشکاندن بۆ هەندێک کاڵا',
          subtitleAr: 'خصم يصل إلى 50٪ على منتجات مختارة',
          subtitleEn: 'Up to 50% discount on selected items',
          ctaKu: 'سەیری بەرهەمەکان بکە',
          ctaAr: 'استكشف المنتجات',
          ctaEn: 'Explore Products',
          imageUrl: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
          link: '/products',
        },
        {
          id: '2',
          badgeKu: 'دیاری تایبەت',
          badgeAr: 'هدية خاصة',
          badgeEn: 'Special Gift',
          titleKu: 'دیاری و یاریی ناوازە',
          titleAr: 'ألعاب وهدايا مميزة',
          titleEn: 'Unique Toys & Gifts',
          subtitleKu: 'شێوازی نوێ و تایبەت بۆ منداڵە نازدارەکانتان',
          subtitleAr: 'تشكيلة رائعة ومميزة لأطفالكم الصغار',
          subtitleEn: 'Exclusive collection for your little ones',
          ctaKu: 'ئێستا بکڕە',
          ctaAr: 'تسوق الآن',
          ctaEn: 'Shop Now',
          imageUrl: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&q=80&w=1600',
          link: '/products',
        }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('promoBanner', JSON.stringify(promoBanner));
  }, [promoBanner]);

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const saved = localStorage.getItem('coupons');
    return saved ? JSON.parse(saved).filter(Boolean) : [{ id: '1', code: 'SUMMER20', discountPercentage: 20, isActive: true }];
  });
  
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    const saved = localStorage.getItem('appliedCoupon');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('coupons', JSON.stringify(coupons));
  }, [coupons]);

  const refreshCoupons = () => {
    // The full coupon list is staff/admin only on the backend; skip the call
    // for guests/customers to avoid a needless 403.
    const savedUser = localStorage.getItem('kidskart_user');
    const role = savedUser ? normalizeRole(JSON.parse(savedUser)?.role) : 0;
    if (!localStorage.getItem('kidskart_auth_token') || ![1, 2, 3].includes(role)) return;

    fetch(`${LARAVEL_API_BASE}/coupons`, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (Array.isArray(data)) {
          setCoupons(data);
        } else if (data.data && Array.isArray(data.data)) {
          setCoupons(data.data);
        }
      })
      .catch(err => console.warn('Coupons fetch info:', err));
  };

  // Validate a single coupon code against the public backend endpoint.
  // Returns the coupon on success so callers can apply it.
  /**
   * `subtotal` and `phone` let the server apply the same limits the order will
   * (minimum basket, total uses, uses per customer), so the basket never shows
   * a discount that checkout is about to refuse.
   */
  const applyCoupon = async (
    code: string,
    context: { subtotal?: number; phone?: string } = {}
  ): Promise<{ success: boolean; coupon?: Coupon; message?: string }> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code, subtotal: context.subtotal, phone: context.phone }),
      });
      const data = await res.json();
      if (res.ok && data?.valid && data?.coupon) {
        const coupon = convertKeysToCamelCase(data.coupon) as Coupon;
        setAppliedCoupon(coupon);
        return { success: true, coupon };
      }
      return { success: false, message: data?.message || 'Invalid or expired coupon code' };
    } catch (e) {
      return { success: false, message: 'Could not validate coupon. Please try again.' };
    }
  };

  // Per-cashier sales report (admin only).
  const fetchCashierReport = async (from?: string, to?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`${LARAVEL_API_BASE}/reports/cashiers?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Report error: ${res.status}`);
    return res.json();
  };

  // Public best-sellers for the home page.
  const fetchBestSellers = async (limit = 10): Promise<Product[]> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/products/best-sellers?limit=${limit}`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return convertKeysToCamelCase(Array.isArray(data) ? data : (data?.data || [])) as Product[];
    } catch {
      return [];
    }
  };

  // ---- Store settings (name/logo/address for receipts) ----
  const [storeSettings, setStoreSettings] = useState<Record<string, any>>(() => {
    try { return JSON.parse(localStorage.getItem('store_settings') || '{}'); } catch { return {}; }
  });

  const refreshSettings = useCallback(() => {
    fetch(`${LARAVEL_API_BASE}/settings`, { headers: { Accept: 'application/json' } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        const parsed: Record<string, any> = {};

        let items = data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (Array.isArray(data.data)) items = data.data;
          else if (Array.isArray(data.settings)) items = data.settings;
        }

        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            if (item && typeof item === 'object') {
              if (item.key !== undefined) {
                parsed[item.key] = item.value;
              } else if (item.name !== undefined) {
                parsed[item.name] = item.value;
              }
            }
          });
        } else if (data && typeof data === 'object') {
          Object.assign(parsed, data.data || data.settings || data);
        }

        if (Object.keys(parsed).length > 0) {
          setStoreSettings(prev => {
            const merged = { ...prev, ...parsed };
            localStorage.setItem('store_settings', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(err => console.warn('Refresh settings note:', err));
  }, []);

  const saveSettings = async (values: Record<string, any>): Promise<boolean> => {
    // Save to local state and localStorage immediately
    setStoreSettings(prev => {
      const updated = { ...prev, ...values };
      localStorage.setItem('store_settings', JSON.stringify(updated));
      return updated;
    });

    // Prepare key-value array representation for settings table schema ($table->string('key'), $table->text('value'))
    const settingsArray = Object.entries(values).map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? '' : String(value)
    }));

    try {
      // 1. Primary attempt: send key-value object
      let res = await authedApiFetch(`${LARAVEL_API_BASE}/settings`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });

      // 2. Fallback attempt: if backend expects array of { key, value } objects
      if (!res.ok) {
        res = await authedApiFetch(`${LARAVEL_API_BASE}/settings`, {
          method: 'PUT',
          body: JSON.stringify(settingsArray),
        });
      }

      // 3. Fallback attempt: if backend expects { settings: [ { key, value } ] }
      if (!res.ok) {
        res = await authedApiFetch(`${LARAVEL_API_BASE}/settings`, {
          method: 'PUT',
          body: JSON.stringify({ settings: settingsArray }),
        });
      }

      // 4. Fallback attempt: POST method
      if (!res.ok) {
        res = await authedApiFetch(`${LARAVEL_API_BASE}/settings`, {
          method: 'POST',
          body: JSON.stringify(values),
        });
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const parsed: Record<string, any> = {};
          let items = data;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            if (Array.isArray(data.data)) items = data.data;
            else if (Array.isArray(data.settings)) items = data.settings;
          }

          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              if (item && item.key !== undefined) {
                parsed[item.key] = item.value;
              }
            });
          } else if (typeof data === 'object') {
            Object.assign(parsed, data.data || data.settings || data);
          }

          if (Object.keys(parsed).length > 0) {
            setStoreSettings(prev => {
              const merged = { ...prev, ...parsed };
              localStorage.setItem('store_settings', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } else {
        console.warn(`Save settings API response status: ${res.status}`);
      }
    } catch (e) {
      console.warn('Save settings API note:', e);
    }

    return true;
  };

  // ---- POS shift / Z-report ----
  const getCurrentShift = async (): Promise<any> => {
    try {
      const token = localStorage.getItem('kidskart_auth_token');
      if (token) {
        const res = await fetch(`${LARAVEL_API_BASE}/shifts/current`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            localStorage.setItem('current_shift', JSON.stringify(data));
            return data;
          } else {
            localStorage.removeItem('current_shift');
            return null;
          }
        }
      }
    } catch {
      // ignore network error
    }
    const saved = localStorage.getItem('current_shift');
    return saved ? JSON.parse(saved) : null;
  };

  const openShift = async (openingFloat: number): Promise<any> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/shifts/open`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ opening_float: openingFloat }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('current_shift', JSON.stringify(data));
        return data;
      }
    } catch {
      // ignore network error
    }
    const currentUser = JSON.parse(localStorage.getItem('kidskart_user') || '{}');
    const localShift = {
      id: `shift_local_${Date.now()}`,
      user_id: currentUser?.id || '1',
      opening_float: openingFloat,
      status: 'open',
      opened_at: new Date().toISOString(),
    };
    localStorage.setItem('current_shift', JSON.stringify(localShift));
    return localShift;
  };

  const getShiftReport = async (): Promise<any> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/shifts/report`, { headers: getAuthHeaders() });
      if (res.ok) return await res.json();
    } catch {
      // ignore network error
    }
    const saved = localStorage.getItem('current_shift');
    if (!saved) return null;
    const shift = JSON.parse(saved);
    return {
      shift,
      summary: {
        orders_count: orders.length,
        cash_sales: orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
        card_sales: 0,
        total_sales: orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
        refunds: 0,
        opening_float: Number(shift.opening_float || 0),
        expected_cash: Number(shift.opening_float || 0) + orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
      }
    };
  };

  const closeShift = async (countedCash: number, note?: string): Promise<any> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/shifts/close`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ counted_cash: countedCash, note }),
      });
      if (res.ok) {
        localStorage.removeItem('current_shift');
        return await res.json();
      }
    } catch {
      // ignore network error
    }
    const saved = localStorage.getItem('current_shift');
    if (saved) {
      const shift = JSON.parse(saved);
      const report = await getShiftReport();
      const summary = report?.summary || { expected_cash: shift.opening_float || 0 };
      const closedData = {
        shift: { ...shift, status: 'closed', counted_cash: countedCash, difference: countedCash - summary.expected_cash, closed_at: new Date().toISOString() },
        summary
      };
      localStorage.removeItem('current_shift');
      return closedData;
    }
    return null;
  };

  // ---- Refund / return ----
  const getOrderById = async (orderId: string): Promise<any> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/orders/${orderId}`, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return convertKeysToCamelCase(await res.json());
    } catch { return null; }
  };

  const refundOrder = async (orderId: string, items: { order_item_id: number; quantity: number }[], reason?: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/orders/${orderId}/refund`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ items, reason }),
      });
      const data = await res.json();
      if (res.ok) return { success: true, data };
      return { success: false, message: data?.message || 'Refund failed' };
    } catch { return { success: false, message: 'Could not reach the server.' }; }
  };

  // Staff/POS: look up a customer's history by phone.
  const fetchShippingQuote = async (governorate?: string, subtotal = 0) => {
    try {
      const params = new URLSearchParams();
      if (governorate) params.set('governorate', governorate);
      params.set('subtotal', String(subtotal));
      const res = await fetch(`${LARAVEL_API_BASE}/shipping/quote?${params.toString()}`);
      if (!res.ok) return { fee: 0, freeOver: 0 };
      const data = await res.json();
      return { fee: Number(data?.fee || 0), freeOver: Number(data?.free_over || 0) };
    } catch {
      // Never block checkout on a quote failing — the server charges the
      // authoritative amount when the order is placed.
      return { fee: 0, freeOver: 0 };
    }
  };

  const fetchStockMovements = async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const res = await authedApiFetch(`${LARAVEL_API_BASE}/stock-movements?${params.toString()}`);
    if (!res.ok) throw new Error(`Stock ledger error: ${res.status}`);
    return convertKeysToCamelCase(await res.json());
  };

  const adjustStock = async (payload: {
    productVariationId: string | number;
    countedQuantity?: number;
    quantityChange?: number;
    type?: string;
    note: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await authedApiFetch(`${LARAVEL_API_BASE}/stock-movements`, {
        method: 'POST',
        body: JSON.stringify(convertKeysToSnakeCase(payload)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, message: data?.message };
      bumpProductsRevision();
      return { success: true };
    } catch {
      return { success: false, message: 'Could not reach the server.' };
    }
  };

  const bulkDelete = async (
    resource: 'products' | 'orders' | 'users' | 'categories' | 'reviews' | 'coupons' | 'expenses',
    ids: (string | number)[]
  ): Promise<{ success: boolean; deleted: number; skipped: any[]; message?: string }> => {
    try {
      const res = await authedApiFetch(`${LARAVEL_API_BASE}/bulk/${resource}`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, deleted: 0, skipped: [], message: data?.message };
      }

      // Refresh whatever the caller just changed, so the table matches the DB.
      if (resource === 'products') { refreshProducts(); bumpProductsRevision(); }
      if (resource === 'orders') refreshOrders();
      if (resource === 'users') refreshUsers();
      if (resource === 'categories') refreshCategories();
      if (resource === 'reviews') refreshReviews();
      if (resource === 'coupons') refreshCoupons();
      if (resource === 'expenses') refreshExpenses();

      return { success: true, deleted: Number(data?.deleted || 0), skipped: data?.skipped || [] };
    } catch {
      return { success: false, deleted: 0, skipped: [], message: 'Could not reach the server.' };
    }
  };

  const bulkOrderStatus = async (
    ids: (string | number)[],
    status: string
  ): Promise<{ success: boolean; updated: number; message?: string }> => {
    try {
      const res = await authedApiFetch(`${LARAVEL_API_BASE}/bulk/orders/status`, {
        method: 'POST',
        body: JSON.stringify({ ids, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, updated: 0, message: data?.message };
      refreshOrders();
      return { success: true, updated: Number(data?.updated || 0) };
    } catch {
      return { success: false, updated: 0, message: 'Could not reach the server.' };
    }
  };

  const fetchActivityLogs = async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const res = await authedApiFetch(`${LARAVEL_API_BASE}/activity-logs?${params.toString()}`);
    if (!res.ok) throw new Error(`Activity log error: ${res.status}`);
    return convertKeysToCamelCase(await res.json());
  };

  const recordCashMovement = async (
    direction: 'in' | 'out',
    amount: number,
    reason: string
  ): Promise<{ success: boolean; message?: string; summary?: any }> => {
    try {
      const res = await authedApiFetch(`${LARAVEL_API_BASE}/shifts/cash`, {
        method: 'POST',
        body: JSON.stringify({ direction, amount, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, message: data?.message };
      return { success: true, summary: convertKeysToCamelCase(data)?.summary };
    } catch {
      return { success: false, message: 'Could not reach the server.' };
    }
  };

  const fetchCashMovements = async (): Promise<any[]> => {
    try {
      const res = await authedApiFetch(`${LARAVEL_API_BASE}/shifts/cash`);
      if (!res.ok) return [];
      const data = convertKeysToCamelCase(await res.json());
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const exchangeOrder = async (
    orderId: string | number,
    returnedItems: any[],
    newItems: any[],
    reason?: string
  ): Promise<any> => {
    const res = await authedApiFetch(`${LARAVEL_API_BASE}/orders/${orderId}/exchange`, {
      method: 'POST',
      body: JSON.stringify({ returned_items: returnedItems, new_items: newItems, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Exchange failed');
    refreshOrders();
    bumpProductsRevision();
    return convertKeysToCamelCase(data);
  };

  const fetchOrderHistory = async (orderId: string | number): Promise<any[]> => {
    try {
      const res = await authedApiFetch(`${LARAVEL_API_BASE}/orders/${orderId}/history`);
      if (!res.ok) return [];
      const data = convertKeysToCamelCase(await res.json());
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const lookupCustomer = async (phone: string): Promise<any> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/customers/lookup?phone=${encodeURIComponent(phone)}`, { headers: getAuthHeaders() });
      if (!res.ok) return { found: false };
      return await res.json();
    } catch {
      return { found: false };
    }
  };

  // Public order tracking by id + phone (no login).
  const trackOrder = async (id: string, phone: string): Promise<{ success: boolean; order?: any; message?: string }> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/orders/track?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) return { success: true, order: data };
      return { success: false, message: data?.message };
    } catch {
      return { success: false, message: 'Could not reach the server. Please try again.' };
    }
  };

  // Recently viewed products (stored as ids in localStorage).
  const recordRecentlyViewed = (productId: string) => {
    if (!productId) return;
    try {
      const raw = localStorage.getItem('recently_viewed');
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [String(productId), ...list.filter(id => String(id) !== String(productId))].slice(0, 12);
      localStorage.setItem('recently_viewed', JSON.stringify(next));
    } catch {}
  };

  const getRecentlyViewedIds = (): string[] => {
    try {
      const raw = localStorage.getItem('recently_viewed');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  // Sales & profit report (staff/admin). Returns the raw report payload.
  const fetchSalesReport = async (from?: string, to?: string, channel?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (channel) params.set('channel', channel);
    const res = await fetch(`${LARAVEL_API_BASE}/reports/sales?${params.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Report error: ${res.status}`);
    return res.json();
  };

  useEffect(() => {
    refreshCoupons();
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem('appliedCoupon', JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem('appliedCoupon');
    }
  }, [appliedCoupon]);

  const addCoupon = (coupon: Coupon) => {
    authedApiFetch(`${LARAVEL_API_BASE}/coupons`, {
      method: 'POST',
      body: JSON.stringify(coupon)
    })
      .then(res => {
        if (res.ok) {
          refreshCoupons();
        } else {
          // Fallback to local
          setCoupons(prev => [...prev, coupon]);
        }
      })
      .catch(() => setCoupons(prev => [...prev, coupon]));
  };
  
  const updateCoupon = (updatedCoupon: Coupon) => {
    authedApiFetch(`${LARAVEL_API_BASE}/coupons/${updatedCoupon.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedCoupon)
    })
      .then(res => {
        if (res.ok) {
          refreshCoupons();
        } else {
          setCoupons(prev => prev.map(c => c?.id === updatedCoupon.id ? updatedCoupon : c));
        }
      })
      .catch(() => setCoupons(prev => prev.map(c => c?.id === updatedCoupon.id ? updatedCoupon : c)));
  };
  
  const deleteCoupon = (id: string) => {
    authedApiFetch(`${LARAVEL_API_BASE}/coupons/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (res.ok) {
          setCoupons(prev => prev.filter(c => c.id !== id));
          if (appliedCoupon?.id === id) {
            setAppliedCoupon(null);
          }
        } else {
          setCoupons(prev => prev.filter(c => c.id !== id));
          if (appliedCoupon?.id === id) {
            setAppliedCoupon(null);
          }
        }
      })
      .catch(() => {
        setCoupons(prev => prev.filter(c => c.id !== id));
        if (appliedCoupon?.id === id) {
          setAppliedCoupon(null);
        }
      });
  };


  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('kidskart_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  const authedApiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const buildHeaders = () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string> || {})
      };
      const curToken = localStorage.getItem('kidskart_auth_token');
      if (curToken) {
        headers['Authorization'] = `Bearer ${curToken}`;
      }
      return headers;
    };

    const response = await fetch(url, { ...options, headers: buildHeaders() });

    if (response.status === 401) {
      // The session is gone. Clear it and let the UI send the user to /login —
      // the old code silently re-authenticated with a password kept in
      // localStorage, which is exactly what we no longer store.
      localStorage.removeItem('kidskart_auth_token');
      localStorage.removeItem('kidskart_user');
      setCurrentUser(null);
    }

    return response;
  };

  const refreshProducts = useCallback((page = 1, limit = 10, filters: any = {}, append = false, bypassCache = false): Promise<void> => {
    if (!append) {
      setIsProductsLoading(true);
    }
    let url = `${LARAVEL_API_BASE}/products?page=${page}&limit=${limit}`;
    
    if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters.categoryId) url += `&category_id=${encodeURIComponent(filters.categoryId)}`;
    if (filters.gender) url += `&gender=${encodeURIComponent(filters.gender)}`;
    if (filters.inStockOnly) url += `&in_stock=1`;
    
    if (filters.colors && filters.colors.length > 0) {
      filters.colors.forEach((c: string) => url += `&colors[]=${encodeURIComponent(c)}`);
    }
    if (filters.sizes && filters.sizes.length > 0) {
      filters.sizes.forEach((s: string) => url += `&sizes[]=${encodeURIComponent(s)}`);
    }
    if (filters.sort) url += `&sort=${encodeURIComponent(filters.sort)}`;
    if (filters.minPrice !== undefined && filters.minPrice !== '' && filters.minPrice !== null) url += `&min_price=${encodeURIComponent(filters.minPrice)}`;
    if (filters.maxPrice !== undefined && filters.maxPrice !== '' && filters.maxPrice !== null) url += `&max_price=${encodeURIComponent(filters.maxPrice)}`;

    const processData = (data: any) => {
      if (!data) {
        setIsProductsLoading(false);
        return;
      }
      const camelData = convertKeysToCamelCase(data);
      let items = [];
      let pagMeta = { currentPage: page, lastPage: 1, total: 0 };
      if (Array.isArray(camelData)) {
        items = camelData;
        pagMeta.total = items.length;
      } else if (camelData && Array.isArray(camelData.data)) {
        items = camelData.data;
        pagMeta = { currentPage: camelData.currentPage || page, lastPage: camelData.lastPage || 1, total: camelData.total || items.length };
      }
      
      if (Array.isArray(items)) {
        const localReviewsSaved = localStorage.getItem('kidskart_reviews_local');
        let localReviews: Review[] = [];
        if (localReviewsSaved) {
          try {
            localReviews = JSON.parse(localReviewsSaved);
          } catch (e) {}
        }
        
        const mergedProducts = items.map((p: Product) => {
          const prodReviews = p.reviews || [];
          const matchingLocal = localReviews.filter((r: any) => String(r.productId) === String(p.id));
          const allReviews = [...prodReviews];
          for (const lr of matchingLocal) {
            if (!allReviews.some(r => r?.id === lr.id)) {
              allReviews.push(lr);
            }
          }
          return {
            ...p,
            reviews: allReviews
          };
        });
        if (append) {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = mergedProducts.filter((p: Product) => !existingIds.has(p.id));
            return [...prev, ...newItems];
          });
        } else {
          setProducts(mergedProducts);
        }
        setProductsPagination(pagMeta);
      }
      setIsProductsLoading(false);
    };

    // 1. Check in-memory response cache (60 seconds TTL) unless bypassCache is true
    if (!bypassCache) {
      const cached = productsResponseCache.get(url);
      if (cached && (Date.now() - cached.timestamp) < 60000) {
        processData(cached.data);
        return Promise.resolve();
      }
    }

    // 2. Inflight request deduplication: if exact same URL is currently fetching, reuse Promise!
    let reqPromise = inflightProductsRequests.get(url);
    if (!reqPromise) {
      reqPromise = fetch(url, { headers: getAuthHeaders() })
        .then(async res => {
          if (!res.ok) {
            console.warn(`Products API warning: status ${res.status}`);
            return null;
          }
          const json = await res.json();
          productsResponseCache.set(url, { data: json, timestamp: Date.now() });
          return json;
        })
        .catch(err => {
          console.error(`Products API fetch error:`, err);
          return null;
        })
        .finally(() => {
          inflightProductsRequests.delete(url);
        });

      inflightProductsRequests.set(url, reqPromise);
    }

    return reqPromise.then(data => {
      processData(data);
    });
  }, [getAuthHeaders]);

  /**
   * Every product, across all pages, without touching the paginated `products`
   * state the catalogue screens use.
   *
   * The inventory audit needs this: it used to add up whatever page happened to
   * be loaded, so a shop with 200 products reported the capital and retail value
   * of the 10 it could see.
   */
  const fetchAllProducts = useCallback(async (): Promise<Product[]> => {
    const PAGE_SIZE = 100;
    const MAX_PAGES = 100; // hard stop so a bad `lastPage` can never loop forever
    const all: Product[] = [];
    const seen = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(
        `${LARAVEL_API_BASE}/products?page=${page}&limit=${PAGE_SIZE}&light=1`,
        { headers: getAuthHeaders() }
      );

      // Throw rather than return a short list: a partial catalogue would be
      // presented as a complete audit, which is worse than a visible error.
      if (!res.ok) {
        throw new Error(`Could not load products page ${page} (HTTP ${res.status})`);
      }

      const camelData = convertKeysToCamelCase(await res.json());
      const items: Product[] = Array.isArray(camelData)
        ? camelData
        : Array.isArray(camelData?.data) ? camelData.data : [];

      for (const item of items) {
        const id = String(item?.id ?? '');
        if (id && !seen.has(id)) {
          seen.add(id);
          all.push(item);
        }
      }

      const lastPage = Array.isArray(camelData) ? 1 : Number(camelData?.lastPage || 1);
      if (items.length === 0 || page >= lastPage) break;
    }

    return all;
  }, [getAuthHeaders]);

  const refreshReviews = useCallback((page = 1, limit = 10) => {
    fetch(`${LARAVEL_API_BASE}/reviews?page=${page}&limit=${limit}`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { return null; } return res.json(); })
      .then(data => {
        if (!data) return;
        const camelData = convertKeysToCamelCase(data);
        let items = [];
        let pagMeta = { currentPage: page, lastPage: 1, total: 0 };
        if (Array.isArray(camelData)) {
          items = camelData;
          pagMeta.total = items.length;
        } else if (camelData && Array.isArray(camelData.data)) {
          items = camelData.data;
          pagMeta = { currentPage: camelData.currentPage || page, lastPage: camelData.lastPage || 1, total: camelData.total || items.length };
        }
        if (Array.isArray(items)) {
          setReviews(items);
          setReviewsPagination(pagMeta);
        }
      })
      .catch(err => console.warn('Reviews load note:', err));
  }, []);

  const refreshCategories = useCallback(() => {
    fetch(`${LARAVEL_API_BASE}/categories`, { headers: getAuthHeaders() })
      .then(async res => { if (!res.ok) { return null; } return res.json(); })
      .then(data => {
        if (!data) return;
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          setCategories(camelData);
        }
      })
      .catch(err => console.warn('Categories load note:', err));
  }, []);

  // Returns the in-flight promise so callers (e.g. a Refresh button) can show
  // a spinner until the orders have actually arrived.
  const refreshOrders = useCallback((page = 1, limit = 50): Promise<void> => {
    // The cache is keyed per account. It used to be one shared bucket, so a
    // staff login (which receives every order) left the whole shop's orders
    // behind for the next customer who signed in on the same browser.
    const cacheKey = (() => {
      try {
        const u = JSON.parse(localStorage.getItem('kidskart_user') || 'null');
        return u?.id ? `kidskart_orders_local:${u.id}` : 'kidskart_orders_local';
      } catch {
        return 'kidskart_orders_local';
      }
    })();

    return fetch(`${LARAVEL_API_BASE}/orders?page=${page}&limit=${limit}`, { headers: getAuthHeaders() })
      .then(res => {
        // A rejected request is not "no orders". Reporting an expired session
        // as an empty history told the customer their purchases were gone.
        if (!res.ok) {
          const err: any = new Error(`Orders request failed: ${res.status}`);
          err.status = res.status;
          throw err;
        }
        return res.json();
      })
      .then(data => {
        let fetchedItems: Order[] = [];
        let meta: PaginationMeta = { currentPage: page, lastPage: 1, total: 0 };

        if (data) {
          const camelData = convertKeysToCamelCase(data);
          if (Array.isArray(camelData)) {
            fetchedItems = camelData;
            meta.total = fetchedItems.length;
          } else if (camelData && Array.isArray(camelData.data)) {
            fetchedItems = camelData.data;
            meta = {
              currentPage: camelData.currentPage || page,
              lastPage: camelData.lastPage || 1,
              total: camelData.total || fetchedItems.length,
            };
          }
        }

        // Merge with local orders from localStorage
        let localOrders: Order[] = [];
        const savedLocal = localStorage.getItem(cacheKey);
        if (savedLocal) {
          try {
            localOrders = JSON.parse(savedLocal).filter(Boolean);
          } catch (e) {}
        }

        // Combine fetched API orders + local orders uniquely by ID
        const orderMap = new Map<string, Order>();
        localOrders.forEach(o => { if (o && o.id) orderMap.set(String(o.id), o); });
        fetchedItems.forEach(o => { if (o && o.id) orderMap.set(String(o.id), o); });

        const combinedOrders = Array.from(orderMap.values()).sort((a: any, b: any) => 
          new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime()
        );

        setOrders(combinedOrders);
        setOrdersPagination({
          ...meta,
          total: Math.max(meta.total, combinedOrders.length)
        });
        localStorage.setItem(cacheKey, JSON.stringify(combinedOrders));
        setOrdersError(null);
      })
      .catch(err => {
        console.warn('Failed to load orders from API, falling back to cache:', err);
        // Show whatever was last seen rather than an empty page, and remember
        // that this list is stale so the page can say so.
        const savedLocal = localStorage.getItem(cacheKey);
        if (savedLocal) {
          try {
            setOrders(JSON.parse(savedLocal).filter(Boolean));
          } catch (e) {}
        }
        setOrdersError(err?.status === 401 ? 'unauthorized' : 'unreachable');
      });
  }, [getAuthHeaders]);

  const refreshUsers = useCallback(() => {
    const token = localStorage.getItem('kidskart_auth_token');
    if (!token) return;
    fetch(`${LARAVEL_API_BASE}/users`, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          setUsers(camelData);
          localStorage.setItem('kidskart_users_local', JSON.stringify(camelData));
        }
      })
      .catch(err => console.warn('Users API not available or failed:', err));
  }, []);

  const refreshExpenses = useCallback(() => {
    const token = localStorage.getItem('kidskart_auth_token');
    if (!token) return;
    fetch(`${LARAVEL_API_BASE}/expenses`, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          setExpenses(camelData);
          localStorage.setItem('kidskart_expenses_local', JSON.stringify(camelData));
        }
      })
      .catch(err => console.warn('Expenses API not available or failed:', err));
  }, []);

  // On mount: check auth token and load initial data
  useEffect(() => {
    const savedUser = localStorage.getItem('kidskart_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.warn('Failed to parse saved user', e);
      }
    }

    refreshProducts();
    refreshCategories();
    refreshOrders();
    refreshUsers();
    refreshExpenses();
    refreshReviews();
    
    // Poll for updates to keep frontend in sync
    // Polling disabled for server-side pagination
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kidskart_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const addCategory = (category: Category) => {
    let slug = category.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      slug = `category-${Math.floor(Math.random() * 10000)}`;
    }

    const categoryWithSlug = { ...category, slug };
    setCategories(prev => [...prev, categoryWithSlug]);
    
    authedApiFetch(`${LARAVEL_API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify(convertKeysToSnakeCase((() => { const c = {...categoryWithSlug}; delete c.id; return c; })())),
    }).then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(savedCategory => {
        const camelCategory = convertKeysToCamelCase(savedCategory);
        setCategories(prev => prev.map(c => c?.id === category.id ? camelCategory : c));
      })
      .catch(err => console.warn('Failed to save category to API:', err));
  };

  const addProduct = (product: Product) => {
    productsResponseCache.clear();
    inflightProductsRequests.clear();

    const preparedProd: Product = {
      ...product,
      barcode: product.barcode || product.sku || '',
      sku: product.sku || product.barcode || '',
      imageUrl: product.imageUrl || (product.images && product.images[0] ? product.images[0] : ''),
      images: Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (product.imageUrl ? [product.imageUrl] : [])
    };

    setProducts(prev => [preparedProd, ...prev]);
    
    authedApiFetch(`${LARAVEL_API_BASE}/products`, {
      method: 'POST',
      body: JSON.stringify(convertKeysToSnakeCase((() => { 
        const p = { ...preparedProd };
        delete p.id; 
        if (p.variations) {
          p.variations = p.variations.map(v => {
            const newV = { ...v };
            if (String(newV.id).startsWith('v_temp') || String(newV.id).startsWith('v')) {
              delete newV.id;
            }
            delete newV.productId;
            return newV;
          });
        }
        return p; 
      })())),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) {
          toast('Unauthenticated. Please log in as Admin/Staff.', 'error');
        }
        throw new Error(`API Error: ${res.status} ${err}`);
      }
      return res.json();
    })
      .then(savedProduct => {
        const camelProduct = convertKeysToCamelCase(savedProduct);
        const merged: Product = {
          ...preparedProd,
          ...camelProduct,
          barcode: camelProduct.barcode || camelProduct.sku || preparedProd.barcode || preparedProd.sku || '',
          sku: camelProduct.sku || camelProduct.barcode || preparedProd.sku || preparedProd.barcode || '',
          imageUrl: camelProduct.imageUrl || preparedProd.imageUrl,
          images: Array.isArray(camelProduct.images) && camelProduct.images.length > 0
            ? camelProduct.images
            : preparedProd.images,
        };
        setProducts(prev => {
          const exists = prev.some(p => String(p.id) === String(product.id) || String(p.id) === String(merged.id));
          if (exists) {
            return prev.map(p => (String(p.id) === String(product.id) || String(p.id) === String(merged.id)) ? merged : p);
          }
          return [merged, ...prev];
        });
        bumpProductsRevision();
      })
      .catch(err => {
        console.warn('Failed to save product to API:', err);
        bumpProductsRevision();
      });
  };

  const addToCart = (product: Product, variation: ProductVariation, quantity: number) => {
    setCart(prev => {
      const cartItemId = `${product.id}-${variation.id}`;
      const existingItem = prev.find(item => item.id === cartItemId);
      if (existingItem) {
        return prev.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: Math.min(item.quantity + quantity, variation.stockQuantity) }
            : item
        );
      }
      return [...prev, { id: cartItemId, product, variation, quantity }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === cartItemId) {
          return { ...item, quantity: Math.min(Math.max(1, quantity), item.variation.stockQuantity) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const addReview = (productId: string, reviewData: Omit<Review, 'id' | 'productId' | 'date'>) => {
    const tempId = `r-${Date.now()}`;
    const newReview: Review = {
      ...reviewData,
      id: tempId,
      productId,
      date: shopToday()
    };

    setProducts(prev => 
      prev.map(product => {
        if (product?.id === productId) {
          return {
            ...product,
            reviews: [...(product.reviews || []), newReview]
          };
        }
        return product;
      })
    );

    const localReviewsSaved = localStorage.getItem('kidskart_reviews_local');
    let localReviews: Review[] = [];
    if (localReviewsSaved) {
      try {
        localReviews = JSON.parse(localReviewsSaved);
      } catch (e) {}
    }
    localReviews.push(newReview);
    localStorage.setItem('kidskart_reviews_local', JSON.stringify(localReviews));

    fetch(`${LARAVEL_API_BASE}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(convertKeysToSnakeCase({
        productId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        customerName: reviewData.author
      }))
    })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(savedReview => {
        const camelReview = convertKeysToCamelCase(savedReview);
        const updatedLocal = localReviews.map(r => r?.id === tempId ? camelReview : r);
        localStorage.setItem('kidskart_reviews_local', JSON.stringify(updatedLocal));

        setProducts(prev =>
          prev.map(product => {
            if (product?.id === productId) {
              return {
                ...product,
                reviews: (product.reviews || []).map(r => r?.id === tempId ? camelReview : r)
              };
            }
            return product;
          })
        );
      })
      .catch(err => console.warn('Failed to save review to API:', err));
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order => order?.id === orderId ? { ...order, status } : order));

    fetch(`${LARAVEL_API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(convertKeysToSnakeCase({ status }))
    }).then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(updatedOrder => {
        const camelOrder = convertKeysToCamelCase(updatedOrder);
        setOrders(prev => prev.map(o => o?.id === orderId ? camelOrder : o));
      })
      .catch(err => console.warn('Failed to update order status:', err));
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const tempId = `e-${Date.now()}`;
    const newExpense: Expense = {
      ...expenseData,
      id: tempId,
      date: shopToday()
    };
    
    setExpenses(prev => {
      const updated = [newExpense, ...prev];
      localStorage.setItem('kidskart_expenses_local', JSON.stringify(updated));
      return updated;
    });

    authedApiFetch(`${LARAVEL_API_BASE}/expenses`, {
      method: 'POST',
      body: JSON.stringify(convertKeysToSnakeCase((() => { const e = {...newExpense}; delete e.id; return e; })()))
    })
      .then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(savedExpense => {
        const camelExpense = convertKeysToCamelCase(savedExpense);
        setExpenses(prev => {
          const updated = prev.map(e => e?.id === tempId ? camelExpense : e);
          localStorage.setItem('kidskart_expenses_local', JSON.stringify(updated));
          return updated;
        });
      })
      .catch(err => console.warn('Failed to save expense to API:', err));
  };

  const addOrder = (orderData: Omit<Order, 'id' | 'date'> & {
    couponCode?: string;
    discountAmount?: number;
    amountPaid?: number;
    paymentMethod?: string;
  }): Promise<any> => {
    const tempId = `ord_temp_${Date.now()}`;
    const newOrder: Order = {
      ...(orderData as Order),
      id: tempId,
      date: shopToday()
    };

    setOrders(prev => {
      const updated = [newOrder, ...prev.filter(o => o?.id !== tempId)];
      try {
        localStorage.setItem('kidskart_orders_local', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const isNumericId = (v: any) => v !== undefined && v !== null && /^\d+$/.test(String(v));

    const items = (orderData.items || []).map((it: any) => {
      const productId = isNumericId(it.product?.id) ? Number(it.product.id) : null;
      const variationId = isNumericId(it.variation?.id) ? Number(it.variation.id) : null;
      const line: any = { quantity: it.quantity };
      if (productId) line.product_id = productId;
      if (variationId) line.product_variation_id = variationId;
      if (!productId && !variationId) {
        line.name = it.product?.name || 'Item';
        line.unit_price = Number(it.product?.discountPrice || it.product?.price || 0);
      }
      return line;
    });

    const payload: any = {
      items,
      status: orderData.status,
      shipping_address: orderData.shippingAddress,
      customer_name: orderData.customerName,
      customer_phone: (orderData as any).customerPhone,
      customer_email: orderData.customerEmail,
      payment_method: orderData.paymentMethod,
      channel: (orderData as any).channel || (orderData as any).source || 'online',
      source: (orderData as any).source || (orderData as any).channel || 'online',
    };
    // The governorate decides the delivery charge. The server recalculates the
    // fee from it, so sending it is what makes the customer's total match.
    if ((orderData as any).governorate) payload.governorate = (orderData as any).governorate;
    if (orderData.couponCode) payload.coupon_code = orderData.couponCode;
    if (orderData.discountAmount !== undefined) payload.discount_amount = orderData.discountAmount;
    if (orderData.amountPaid !== undefined) payload.amount_paid = orderData.amountPaid;

    return fetch(`${LARAVEL_API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    }).then(async res => { if (!res.ok) { const err = await res.text(); throw new Error(`API Error: ${res.status} ${err}`); } return res.json(); })
      .then(savedOrder => {
        const camelOrder = convertKeysToCamelCase(savedOrder);
        setOrders(prev => {
          const updated = prev.map(o => o?.id === tempId ? camelOrder : o);
          try {
            localStorage.setItem('kidskart_orders_local', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        return camelOrder;
      })
      .catch(err => { 
        console.warn('Order save note:', err); 
        return newOrder; 
      });
  };

  const deleteProduct = (productId: string) => {
    productsResponseCache.clear();
    inflightProductsRequests.clear();

    setProducts(prev => prev.filter(p => String(p.id) !== String(productId)));

    authedApiFetch(`${LARAVEL_API_BASE}/products/${productId}`, {
      method: 'DELETE',
    })
      .then(res => {
        bumpProductsRevision();
      })
      .catch(err => {
        console.warn('Product delete note:', err);
        bumpProductsRevision();
      });
  };

  const deleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => String(c.id) !== String(categoryId)));

    authedApiFetch(`${LARAVEL_API_BASE}/categories/${categoryId}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) {
          console.warn('Backend category deletion failed');
          refreshCategories();
        }
      })
      .catch(err => {
        console.warn('Category delete note:', err);
        refreshCategories();
      });
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => {
      const updated = prev.filter(e => String(e.id) !== String(expenseId));
      localStorage.setItem('kidskart_expenses_local', JSON.stringify(updated));
      return updated;
    });

    authedApiFetch(`${LARAVEL_API_BASE}/expenses/${expenseId}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) {
          console.warn('Backend expense deletion failed');
          refreshExpenses();
        }
      })
      .catch(err => {
        console.warn('Expense delete note:', err);
        refreshExpenses();
      });
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => {
      const updated = prev.filter(u => String(u.id) !== String(userId));
      localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
      return updated;
    });

    authedApiFetch(`${LARAVEL_API_BASE}/users/${userId}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) {
          console.warn('Backend user deletion failed');
          refreshUsers();
        }
      })
      .catch(err => {
        console.warn('User delete note:', err);
        refreshUsers();
      });
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => {
      const updated = prev.filter(o => String(o.id) !== String(orderId));
      try {
        localStorage.setItem('kidskart_orders_local', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    authedApiFetch(`${LARAVEL_API_BASE}/orders/${orderId}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok && res.status !== 404) {
          console.warn('Backend order deletion note:', res.status);
        }
      })
      .catch(err => {
        console.warn('Order delete note:', err);
      });
  };

  const updateProduct = (product: Product) => {
    productsResponseCache.clear();
    inflightProductsRequests.clear();

    const updatedProd: Product = {
      ...product,
      barcode: product.barcode || product.sku || '',
      sku: product.sku || product.barcode || '',
      imageUrl: product.imageUrl || (product.images && product.images[0] ? product.images[0] : ''),
      images: Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (product.imageUrl ? [product.imageUrl] : [])
    };

    setProducts(prev => prev.map(p => String(p?.id) === String(product.id) ? updatedProd : p));

    authedApiFetch(`${LARAVEL_API_BASE}/products/${product.id}`, {
      method: 'PUT',
      body: JSON.stringify(convertKeysToSnakeCase((() => { 
        const p = { ...updatedProd };
        delete p.id; 
        if (p.variations) {
          p.variations = p.variations.map(v => {
            const newV = { ...v };
            if (String(newV.id).startsWith('v_temp') || String(newV.id).startsWith('v')) {
              delete newV.id;
            }
            delete newV.productId;
            return newV;
          });
        }
        return p; 
      })())),
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.text();
          if (res.status === 401) {
            toast('Unauthenticated. Please log in as Admin/Staff.', 'error');
          }
          throw new Error(`API Error: ${res.status} ${err}`);
        }
        return res.json();
      })
      .then(savedProduct => {
        const camelProduct = convertKeysToCamelCase(savedProduct);
        const merged: Product = {
          ...updatedProd,
          ...camelProduct,
          barcode: camelProduct.barcode || camelProduct.sku || updatedProd.barcode || updatedProd.sku || '',
          sku: camelProduct.sku || camelProduct.barcode || updatedProd.sku || updatedProd.barcode || '',
          imageUrl: camelProduct.imageUrl || updatedProd.imageUrl,
          images: Array.isArray(camelProduct.images) && camelProduct.images.length > 0
            ? camelProduct.images
            : updatedProd.images,
        };
        setProducts(prev => prev.map(p => String(p?.id) === String(product.id) ? merged : p));
        bumpProductsRevision();
      })
      .catch(err => {
        console.warn('Product update note:', err);
        bumpProductsRevision();
      });
  };

  const updateCategory = (category: Category) => {
    setCategories(prev => prev.map(c => c?.id === category.id ? category : c));
    authedApiFetch(`${LARAVEL_API_BASE}/categories/${category.id}`, {
      method: 'PUT',
      body: JSON.stringify(convertKeysToSnakeCase(category)),
    }).catch(err => console.warn('Category update note:', err));
  };

  const updateExpense = (expense: Expense) => {
    setExpenses(prev => prev.map(e => e?.id === expense.id ? expense : e));
    authedApiFetch(`${LARAVEL_API_BASE}/expenses/${expense.id}`, {
      method: 'PUT',
      body: JSON.stringify(convertKeysToSnakeCase(expense)),
    }).catch(err => console.warn('Expense update note:', err));
  };

  const updateUser = (user: User) => {
    // Staff (3) used to be collapsed into Cashier (2) here, so the role picked
    // in the dashboard was not the role that got saved.
    const previousUser = users.find(u => u?.id === user.id);
    const updatedUserObj: User = { ...user, role: normalizeRole(user.role) };
    setUsers(prev => prev.map(u => u?.id === user.id ? updatedUserObj : u));
    authedApiFetch(`${LARAVEL_API_BASE}/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(convertKeysToSnakeCase(updatedUserObj)),
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as any));
          throw new Error(body?.message || 'Failed to update user');
        }
        return res.json();
      })
      .then(saved => {
        const camelUser = convertKeysToCamelCase(saved);
        setUsers(prev => prev.map(u => u?.id === user.id ? { ...u, ...camelUser } : u));
      })
      .catch(err => {
        // Roll back so the table never shows a change the server rejected.
        if (previousUser) {
          setUsers(prev => prev.map(u => u?.id === user.id ? previousUser : u));
        }
        toast(err?.message || 'نوێکردنەوەی بەکارهێنەر سەرکەوتوو نەبوو', 'error');
      });
  };

  const addUser = (userData: any) => {
    const formattedData = { ...userData, role: normalizeRole(userData.role) };
    const tempId = `u_temp_${Date.now()}`;
    const newUser: User = {
      ...formattedData,
      id: tempId,
      joinDate: shopToday()
    };
    setUsers(prev => {
      const updated = [...prev, newUser];
      localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
      return updated;
    });

    authedApiFetch(`${LARAVEL_API_BASE}/users`, {
      method: 'POST',
      body: JSON.stringify(convertKeysToSnakeCase(formattedData))
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as any));
          throw new Error(body?.message || 'Failed to create user on backend');
        }
        return res.json();
      })
      .then(savedUser => {
        const camelUser = convertKeysToCamelCase(savedUser);
        setUsers(prev => {
          const updated = prev.map(u => u?.id === tempId ? camelUser : u);
          localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
          return updated;
        });
      })
      .catch(err => {
        // Drop the optimistic row: the account does not exist on the server,
        // and leaving it on screen made a rejected create look successful.
        setUsers(prev => {
          const updated = prev.filter(u => u?.id !== tempId);
          localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
          return updated;
        });
        toast(err?.message || 'دروستکردنی بەکارهێنەر سەرکەوتوو نەبوو', 'error');
      });
  };

  const login = async (loginInput: string, password = 'password') => {
    const cleanInput = loginInput.trim();
    const formattedPhone = formatIraqiPhone(cleanInput);
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          login: cleanInput, 
          email: cleanInput, 
          phone: cleanInput,
          formatted_phone: formattedPhone,
          password 
        })
      });
      const data = await res.json();
      const camelData = convertKeysToCamelCase(data);
      if (res.ok && camelData.accessToken) {
        localStorage.setItem('kidskart_auth_token', camelData.accessToken);
        // SECURITY: never persist the password — the bearer token is the
        // session. Anything in localStorage is readable by any script on the
        // page (and by anyone with the device).
        const userToSave = { ...camelData.user };
        delete (userToSave as any).password;
        localStorage.setItem('kidskart_user', JSON.stringify(userToSave));
        setCurrentUser(userToSave);
        refreshOrders();
        refreshUsers();
        refreshExpenses();
        return true;
      } else {
        toast(camelData.message || 'Login failed', 'error');
        return false;
      }
    } catch (err) {
      console.warn('Login note:', err);
      // Fallback local logic
      const user = users.find(u => 
        (u.email && u.email.toLowerCase() === cleanInput.toLowerCase()) || 
        isSamePhone(u.phone, cleanInput)
      );
      if (user) {
        if ((user as any).password && (user as any).password !== password) {
          toast('وشەی تێپەڕ هەڵەیە', 'error');
          return false;
        }
        setCurrentUser(user);
        localStorage.setItem('kidskart_user', JSON.stringify(user));
        return true;
      } else {
        toast('بەکارهێنەر نەدۆزرایەوە', 'error');
        return false;
      }
    }
  };

  const logout = () => {
    const token = localStorage.getItem('kidskart_auth_token');
    if (token) {
      fetch(`${LARAVEL_API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.warn('Logout note:', err));
    }
    localStorage.removeItem('kidskart_auth_token');
    localStorage.removeItem('kidskart_user');
    setCurrentUser(null);
  };

  const register = async (name: string, email: string, password = 'password123') => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convertKeysToSnakeCase({ name, email, password, passwordConfirmation: password }))
      });
      const data = await res.json();
      const camelData = convertKeysToCamelCase(data);
      if (res.ok && camelData.accessToken) {
        localStorage.setItem('kidskart_auth_token', camelData.accessToken);
        localStorage.setItem('kidskart_user', JSON.stringify(camelData.user));
        setCurrentUser(camelData.user);
        refreshOrders();
        refreshUsers();
        refreshExpenses();
        setUsers(prev => {
          const updated = [...prev, camelData.user];
          localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
          return updated;
        });
        return true;
      } else {
        toast(camelData.message || 'Registration failed', 'error');
        return false;
      }
    } catch (err) {
      console.warn('Registration note:', err);
      // Fallback local logic
      const newUser: User = {
        id: `u-${Date.now()}`,
        name,
        email,
        role: 0,
        joinDate: shopToday()
      };
      setUsers(prev => {
        const updated = [...prev, newUser];
        localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
        return updated;
      });
      setCurrentUser(newUser);
      localStorage.setItem('kidskart_user', JSON.stringify(newUser));
      return true;
    }
  };

  const registerWithPhone = async (phone: string, name?: string, addressInfo?: any): Promise<User | null> => {
    return loginWithPhone(phone, name, addressInfo);
  };

  /**
   * Signs a customer in with their mobile number.
   *
   * `addressInfo.verificationToken` is the single-use proof from /verify-otp;
   * the backend rejects the request without it, which is what stops anyone from
   * logging in as a number they do not own.
   */
  const loginWithPhone = async (phone: string, name?: string, addressInfo?: any): Promise<User | null> => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return null;

    const corePhone = normalizePhone(cleanPhone) || cleanPhone.replace(/[^\d]/g, '');
    const formattedPhone = formatIraqiPhone(cleanPhone);
    const validName = name && name.trim() && !['customer', 'کڕیار', 'guest'].includes(name.trim().toLowerCase()) ? name.trim() : undefined;

    const { verificationToken, ...extraInfo } = (addressInfo || {}) as any;

    try {
      const res = await fetch(`${LARAVEL_API_BASE}/login-with-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone || cleanPhone,
          formatted_phone: formattedPhone,
          phone_digits: corePhone,
          verification_token: verificationToken || takePhoneVerification(cleanPhone),
          name: validName,
          ...extraInfo
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const camelData = convertKeysToCamelCase(data);
        if (camelData.accessToken) {
          localStorage.setItem('kidskart_auth_token', camelData.accessToken);
        }
        if (camelData.user) {
          const apiUser = camelData.user;
          const userRole = Number(apiUser.role);
          const finalRole = [1, 2, 3].includes(userRole) ? (userRole as 1 | 2 | 3) : 0;
          const finalName = validName || (apiUser.name && !['customer', 'کڕیار', 'guest'].includes(apiUser.name.toLowerCase()) ? apiUser.name : undefined) || `کڕیار (${corePhone.slice(-4) || '1234'})`;

          const finalUser: User = {
            id: String(apiUser.id || `u-${corePhone}`),
            name: finalName,
            phone: apiUser.phone || formattedPhone || cleanPhone,
            email: apiUser.email || undefined,
            role: finalRole,
            address: extraInfo?.address || apiUser.address,
            joinDate: apiUser.joinDate || shopToday()
          };
          localStorage.setItem('kidskart_user', JSON.stringify(finalUser));
          setCurrentUser(finalUser);
          setUsers(prev => {
            const exists = prev.some(u => u.id === finalUser.id || isSamePhone(u.phone, cleanPhone));
            const updated = exists
              ? prev.map(u => (u.id === finalUser.id || isSamePhone(u.phone, cleanPhone)) ? { ...u, ...finalUser } : u)
              : [...prev, finalUser];
            localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
            return updated;
          });
          return finalUser;
        }
      }

      // The server answered and said no (expired/replayed OTP token, invalid
      // number). Surface it instead of faking a local session that has no
      // backend token behind it — that used to look like a successful login
      // while every later API call failed.
      const errorBody = await res.json().catch(() => ({} as any));
      toast(errorBody?.message || 'چوونە ژوورەوە سەرکەوتوو نەبوو. تکایە دووبارە کۆد داوا بکەرەوە.', 'error');
      return null;
    } catch (err) {
      // Network/offline only — fall through to the local provisioning below.
      console.warn('loginWithPhone API call failed, using local user provisioning fallback:', err);
    }

    // 1. Check local existing user in state
    let existing = users.find(u => u.phone && isSamePhone(u.phone, cleanPhone));

    // 2. Check localStorage if state was not yet populated
    if (!existing) {
      try {
        const saved = localStorage.getItem('kidskart_users_local');
        if (saved) {
          const parsed: User[] = JSON.parse(saved);
          existing = parsed.find(u => u.phone && isSamePhone(u.phone, cleanPhone));
        }
      } catch (e) {}
    }

    // 3. Check order history for customer with matching phone number
    if (!existing) {
      const matchingOrder = orders.find(o => o.customerPhone && isSamePhone(o.customerPhone, cleanPhone));
      if (matchingOrder) {
        existing = {
          id: matchingOrder.userId || `u-${corePhone}`,
          name: matchingOrder.customerName || `کڕیار (${corePhone.slice(-4) || '1234'})`,
          phone: cleanPhone,
          email: `${corePhone}@phone.user`,
          role: 0,
          joinDate: shopToday(),
          address: matchingOrder.shippingAddress?.address,
        };
      }
    }

    if (existing) {
      const finalName = validName || (existing.name && !['customer', 'کڕیار', 'guest'].includes(existing.name.toLowerCase()) ? existing.name : undefined) || `کڕیار (${corePhone.slice(-4) || '1234'})`;
      const updatedUser: User = { 
        ...existing, 
        role: Number(existing.role) === 1 ? 1 : Number(existing.role) === 2 ? 2 : Number(existing.role) === 3 ? 3 : 0,
        name: finalName,
        phone: cleanPhone,
        address: addressInfo?.address || existing.address,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('kidskart_user', JSON.stringify(updatedUser));
      setUsers(prev => {
        const exists = prev.some(u => u.id === existing!.id || isSamePhone(u.phone, cleanPhone));
        const updated = exists 
          ? prev.map(u => (u.id === existing!.id || isSamePhone(u.phone, cleanPhone)) ? updatedUser : u)
          : [...prev, updatedUser];
        localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
        return updated;
      });
      return updatedUser;
    }

    const newUser: User = {
      id: `u-${corePhone}`,
      name: validName || `کڕیار (${corePhone.slice(-4) || '1234'})`,
      phone: cleanPhone,
      email: `${corePhone}@phone.user`,
      role: 0,
      joinDate: shopToday(),
      address: addressInfo?.address,
    };
    setCurrentUser(newUser);
    localStorage.setItem('kidskart_user', JSON.stringify(newUser));
    setUsers(prev => {
      const exists = prev.some(u => u.id === newUser.id || isSamePhone(u.phone, cleanPhone));
      const updated = exists
        ? prev.map(u => (u.id === newUser.id || isSamePhone(u.phone, cleanPhone)) ? { ...u, ...newUser } : u)
        : [...prev, newUser];
      localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
      return updated;
    });
    return newUser;
  };

  const updateProfile = async (
    name: string,
    email: string,
    phone?: string,
    address?: string,
    password?: string,
    passwordConfirmation?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const token = localStorage.getItem('kidskart_auth_token');
      if (!token) {
        if (currentUser) {
          const updatedUser: User = {
            ...currentUser,
            name,
            email,
            phone,
            address,
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('kidskart_user', JSON.stringify(updatedUser));
          setUsers(prev => prev.map(u => u?.id === currentUser.id ? updatedUser : u));
          return { success: true, message: 'Profile updated locally.' };
        }
        return { success: false, message: 'No authenticated user found.' };
      }

      const bodyData: any = { name, email, phone, address };
      if (password) {
        bodyData.password = password;
        bodyData.passwordConfirmation = passwordConfirmation || password;
      }

      const res = await fetch(`${LARAVEL_API_BASE}/user/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(convertKeysToSnakeCase(bodyData)),
      });

      const data = await res.json();
      const camelData = convertKeysToCamelCase(data);

      if (res.ok && camelData.user) {
        localStorage.setItem('kidskart_user', JSON.stringify(camelData.user));
        setCurrentUser(camelData.user);
        setUsers(prev => prev.map(u => u?.id === camelData.user.id ? camelData.user : u));
        return { success: true, message: camelData.message || 'Profile updated successfully!' };
      } else {
        return { success: false, message: camelData.message || 'Failed to update profile.' };
      }
    } catch (err) {
      console.warn('Update profile note:', err);
      if (currentUser) {
        const updatedUser: User = {
          ...currentUser,
          name,
          email,
          phone,
          address,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('kidskart_user', JSON.stringify(updatedUser));
        setUsers(prev => prev.map(u => u?.id === currentUser.id ? updatedUser : u));
        return { success: true, message: 'Profile updated locally due to network error.' };
      }
      return { success: false, message: 'An unexpected error occurred.' };
    }
  };

  /**
   * Authoritative "does this number have an account?" check.
   *
   * The old local-only version could not answer this for a customer signing in
   * on a device they had never used before: browser storage is empty there, so
   * every genuine customer was told "this number is not registered". The server
   * knows, so ask it — and only fall back to the local guess when it is
   * unreachable.
   */
  const checkPhoneRegistered = async (phoneInput: string): Promise<boolean> => {
    const cleanPhone = (phoneInput || '').trim();
    if (!cleanPhone) return false;

    try {
      const res = await fetch(`${LARAVEL_API_BASE}/auth/phone-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ phone: formatIraqiPhone(cleanPhone) || cleanPhone }),
      });

      if (res.ok) {
        const data = await res.json();
        return Boolean(data?.exists);
      }
    } catch (err) {
      console.warn('phone-status check unavailable, falling back to local data:', err);
    }

    return isPhoneRegistered(cleanPhone);
  };

  const isPhoneRegistered = (phoneInput: string): boolean => {
    if (!phoneInput || !phoneInput.trim()) return false;
    const cleanPhone = phoneInput.trim();

    // Check users array
    const inUsers = users.some(u => u.phone && isSamePhone(u.phone, cleanPhone));
    if (inUsers) return true;

    // Check localStorage users
    try {
      const saved = localStorage.getItem('kidskart_users_local');
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        if (parsed.some(u => u.phone && isSamePhone(u.phone, cleanPhone))) return true;
      }
    } catch (e) {}

    // Check logged in user
    const savedUser = localStorage.getItem('kidskart_user');
    if (savedUser) {
      try {
        const u: User = JSON.parse(savedUser);
        if (u.phone && isSamePhone(u.phone, cleanPhone)) return true;
      } catch (e) {}
    }

    // Check orders
    const inOrders = orders.some(o => o.customerPhone && isSamePhone(o.customerPhone, cleanPhone));
    if (inOrders) return true;

    return false;
  };

  const updatePromoBanner = (banner: PromoBanner) => {
    setPromoBanner(banner);
  };

  return (
    <StoreContext.Provider value={{ 
      categories, products, cart, wishlist, users, orders, expenses, currentUser, promoBanner, productsPagination, ordersPagination, expensesPagination, isProductsLoading, productsRevision,
      updatePromoBanner, addCategory, addProduct, refreshProducts, fetchAllProducts, refreshCategories, refreshOrders, ordersError, refreshUsers, bulkDelete, bulkOrderStatus, refreshExpenses, addToCart, removeFromCart, 
      updateCartItemQuantity, clearCart, toggleWishlist, addReview, updateOrderStatus, addExpense, addOrder,
      deleteProduct, deleteCategory, deleteExpense, deleteUser, deleteOrder, addUser,
      updateProduct, updateCategory, updateExpense, updateUser,
      isPhoneRegistered, checkPhoneRegistered, login, loginWithPhone, registerWithPhone, logout, register, updateProfile,
      reviews, reviewsPagination, refreshReviews,
      coupons, appliedCoupon, setAppliedCoupon, addCoupon, updateCoupon, deleteCoupon, applyCoupon, fetchSalesReport, fetchCashierReport,
      fetchBestSellers, recordRecentlyViewed, getRecentlyViewedIds, trackOrder, lookupCustomer,
      fetchShippingQuote, fetchStockMovements, adjustStock, fetchActivityLogs,
      recordCashMovement, fetchCashMovements, exchangeOrder, fetchOrderHistory,
      storeSettings, saveSettings, getCurrentShift, openShift, getShiftReport, closeShift, getOrderById, refundOrder
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
