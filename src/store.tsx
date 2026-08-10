import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Category, Product, CartItem, ProductVariation, Review, User, Order, Expense, PromoBanner, PaginationMeta, Coupon } from './types';
import { useToast } from './components/ui/Feedback';
import { API_BASE_URL } from './config/api';
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
  applyCoupon: (code: string) => Promise<{ success: boolean; coupon?: Coupon; message?: string }>;
  fetchSalesReport: (from?: string, to?: string, channel?: string) => Promise<any>;
  fetchCashierReport: (from?: string, to?: string) => Promise<any>;
  fetchBestSellers: (limit?: number) => Promise<Product[]>;
  recordRecentlyViewed: (productId: string) => void;
  getRecentlyViewedIds: () => string[];
  trackOrder: (id: string, phone: string) => Promise<{ success: boolean; order?: any; message?: string }>;
  lookupCustomer: (phone: string) => Promise<any>;
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
  productsPagination: PaginationMeta;
  ordersPagination: PaginationMeta;
  expensesPagination: PaginationMeta;
  reviewsPagination: PaginationMeta;
  reviews: Review[];
  refreshReviews: (page?: number, limit?: number) => void;
  refreshProducts: (page?: number, limit?: number, filters?: any, append?: boolean) => void;
  refreshOrders: (page?: number, limit?: number) => void;
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
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithPhone: (phone: string, name?: string) => Promise<User | null>;
  registerWithPhone: (phone: string, name: string) => Promise<User | null>;
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
        newObj['date'] = String(val).split('T')[0];
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

    // Normalize user role (1 = Admin/Owner, 2 = Staff/Cashier, 3 = Admin)
    if (Object.prototype.hasOwnProperty.call(newObj, 'role')) {
      const r = newObj.role;
      if (r === 1 || r === '1' || r === 3 || r === '3' || r === 'admin' || r === 'owner') {
        newObj.role = 1;
      } else if (r === 2 || r === '2' || r === 'staff' || r === 'cashier') {
        newObj.role = 2;
      } else {
        newObj.role = 1;
      }
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
  const [productsPagination, setProductsPagination] = useState<PaginationMeta>(defaultPagination);
  const [ordersPagination, setOrdersPagination] = useState<PaginationMeta>(defaultPagination);
  const [expensesPagination, setExpensesPagination] = useState<PaginationMeta>(defaultPagination);
  const [reviewsPagination, setReviewsPagination] = useState<PaginationMeta>(defaultPagination);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [orders, setOrders] = useState<Order[]>([]);
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
    const role = savedUser ? Number(JSON.parse(savedUser)?.role) : 0;
    if (!localStorage.getItem('kidskart_auth_token') || ![2, 3].includes(role)) return;

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
  const applyCoupon = async (code: string): Promise<{ success: boolean; coupon?: Coupon; message?: string }> => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code }),
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


  const getAuthHeaders = () => {
    const token = localStorage.getItem('kidskart_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const authedApiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const fetchFreshToken = async (): Promise<string | null> => {
      try {
        const savedUserStr = localStorage.getItem('kidskart_user');
        const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        if (savedUser && savedUser.email && savedUser.password) {
          const loginRes = await fetch(`${LARAVEL_API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email: savedUser.email, password: savedUser.password })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            const camelData = convertKeysToCamelCase(loginData);
            if (camelData.accessToken) {
              localStorage.setItem('kidskart_auth_token', camelData.accessToken);
              return camelData.accessToken;
            }
          }
        }
      } catch (e) {
        console.warn('Session refresh attempt failed:', e);
      }
      return null;
    };

    let token = localStorage.getItem('kidskart_auth_token');

    if (!token) {
      token = await fetchFreshToken();
    }

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

    let response = await fetch(url, { ...options, headers: buildHeaders() });

    if (response.status === 401) {
      localStorage.removeItem('kidskart_auth_token');
      const newToken = await fetchFreshToken();
      if (newToken) {
        response = await fetch(url, { ...options, headers: buildHeaders() });
      }
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

  const refreshOrders = useCallback(() => {
    fetch(`${LARAVEL_API_BASE}/orders`, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const camelData = convertKeysToCamelCase(data);
        if (Array.isArray(camelData)) {
          setOrders(camelData);
        }
      })
      .catch(err => console.warn('Failed to load orders from API:', err));
  }, []);

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
        refreshProducts(1, 10, {}, false, true);
      })
      .catch(err => {
        console.warn('Failed to save product to API:', err);
        refreshProducts(1, 10, {}, false, true);
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
      date: new Date().toISOString().split('T')[0]
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
      date: new Date().toISOString().split('T')[0]
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
      date: new Date().toISOString().split('T')[0]
    };
    setOrders(prev => [newOrder, ...prev]);

    const isNumericId = (v: any) => v !== undefined && v !== null && /^\d+$/.test(String(v));

    // Build a lean, server-authoritative payload. The backend recomputes every
    // price/total from the database, so we only send identifiers + quantities.
    // Custom POS "quick add" lines have no catalog id, so they carry a name +
    // unit price (which the backend accepts from staff only).
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
    };
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
        setOrders(prev => prev.map(o => o?.id === tempId ? camelOrder : o));
        return camelOrder;
      })
      .catch(err => { console.warn('Order save note:', err); return undefined; });
  };

  const deleteProduct = (productId: string) => {
    productsResponseCache.clear();
    inflightProductsRequests.clear();

    setProducts(prev => prev.filter(p => String(p.id) !== String(productId)));

    authedApiFetch(`${LARAVEL_API_BASE}/products/${productId}`, {
      method: 'DELETE',
    })
      .then(res => {
        refreshProducts(1, 10, {}, false, true);
      })
      .catch(err => {
        console.warn('Product delete note:', err);
        refreshProducts(1, 10, {}, false, true);
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
    setOrders(prev => prev.filter(o => String(o.id) !== String(orderId)));

    authedApiFetch(`${LARAVEL_API_BASE}/orders/${orderId}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) {
          console.warn('Backend order deletion failed');
          refreshOrders();
        }
      })
      .catch(err => {
        console.warn('Order delete note:', err);
        refreshOrders();
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
        refreshProducts(1, 10, {}, false, true);
      })
      .catch(err => {
        console.warn('Product update note:', err);
        refreshProducts(1, 10, {}, false, true);
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
    const roleNum = (user.role === 3 || user.role === '3' || (user.role as any) === 'admin') ? 3 : ((user.role === 2 || user.role === '2' || (user.role as any) === 'staff') ? 2 : 1);
    const updatedUserObj: User = { ...user, role: roleNum as 1 | 2 | 3 };
    setUsers(prev => prev.map(u => u?.id === user.id ? updatedUserObj : u));
    authedApiFetch(`${LARAVEL_API_BASE}/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(convertKeysToSnakeCase(updatedUserObj)),
    }).catch(err => console.warn('User update note:', err));
  };

  const addUser = (userData: any) => {
    const roleNum = (userData.role === 3 || userData.role === '3' || userData.role === 'admin') ? 3 : ((userData.role === 2 || userData.role === '2' || userData.role === 'staff') ? 2 : 1);
    const formattedData = { ...userData, role: roleNum };
    const tempId = `u_temp_${Date.now()}`;
    const newUser: User = {
      ...formattedData,
      id: tempId,
      joinDate: new Date().toISOString().split('T')[0]
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
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to create user on backend');
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
        console.warn('User save note:', err);
      });
  };

  const login = async (loginInput: string, password = 'password') => {
    try {
      const res = await fetch(`${LARAVEL_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginInput, email: loginInput, password })
      });
      const data = await res.json();
      const camelData = convertKeysToCamelCase(data);
      if (res.ok && camelData.accessToken) {
        localStorage.setItem('kidskart_auth_token', camelData.accessToken);
        const userToSave = { ...camelData.user, password };
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
      const normInput = loginInput.replace(/[^\d]/g, '');
      const user = users.find(u => 
        (u.email && u.email.toLowerCase() === loginInput.toLowerCase()) || 
        u.phone === loginInput || 
        (normInput && normInput.length >= 7 && u.phone && u.phone.replace(/[^\d]/g, '').includes(normInput.slice(-8)))
      );
      if (user) {
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
        role: 1,
        joinDate: new Date().toISOString().split('T')[0]
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

  const registerWithPhone = async (phone: string, name?: string): Promise<User | null> => {
    return loginWithPhone(phone, name);
  };

  const loginWithPhone = async (phone: string, name?: string): Promise<User | null> => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return null;

    const phoneDigits = cleanPhone.replace(/[^\d]/g, '');

    try {
      const res = await fetch(`${LARAVEL_API_BASE}/login-with-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: name ? name.trim() : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const camelData = convertKeysToCamelCase(data);
        if (camelData.accessToken) {
          localStorage.setItem('kidskart_auth_token', camelData.accessToken);
        }
        if (camelData.user) {
          localStorage.setItem('kidskart_user', JSON.stringify(camelData.user));
          setCurrentUser(camelData.user);
          setUsers(prev => {
            const exists = prev.some(u => u.id === camelData.user.id || (u.phone && u.phone.replace(/[^\d]/g, '') === phoneDigits));
            const updated = exists 
              ? prev.map(u => (u.id === camelData.user.id || (u.phone && u.phone.replace(/[^\d]/g, '') === phoneDigits)) ? camelData.user : u)
              : [...prev, camelData.user];
            localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
            return updated;
          });
          return camelData.user;
        }
      }
    } catch (err) {
      console.warn('loginWithPhone API call failed, using local user provisioning fallback:', err);
    }

    // Check local existing user
    const existing = users.find(u => {
      if (!u.phone) return false;
      const uDigits = u.phone.replace(/[^\d]/g, '');
      return u.phone === cleanPhone || uDigits === phoneDigits || (phoneDigits.length >= 8 && uDigits.includes(phoneDigits.slice(-8)));
    });

    if (existing) {
      const updatedUser: User = { 
        ...existing, 
        name: name?.trim() || existing.name || `کڕیار (${phoneDigits.slice(-4) || '1234'})` 
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('kidskart_user', JSON.stringify(updatedUser));
      setUsers(prev => {
        const updated = prev.map(u => u.id === existing.id ? updatedUser : u);
        localStorage.setItem('kidskart_users_local', JSON.stringify(updated));
        return updated;
      });
      return updatedUser;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: name?.trim() || `کڕیار (${phoneDigits.slice(-4) || '1234'})`,
      phone: cleanPhone,
      email: `${phoneDigits}@phone.user`,
      role: 1,
      joinDate: new Date().toISOString().split('T')[0]
    };
    setCurrentUser(newUser);
    localStorage.setItem('kidskart_user', JSON.stringify(newUser));
    setUsers(prev => {
      const updated = [...prev, newUser];
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

  const updatePromoBanner = (banner: PromoBanner) => {
    setPromoBanner(banner);
  };

  return (
    <StoreContext.Provider value={{ 
      categories, products, cart, wishlist, users, orders, expenses, currentUser, promoBanner, productsPagination, ordersPagination, expensesPagination, isProductsLoading,
      updatePromoBanner, addCategory, addProduct, refreshProducts, refreshCategories, refreshOrders, refreshUsers, refreshExpenses, addToCart, removeFromCart, 
      updateCartItemQuantity, clearCart, toggleWishlist, addReview, updateOrderStatus, addExpense, addOrder,
      deleteProduct, deleteCategory, deleteExpense, deleteUser, deleteOrder, addUser,
      updateProduct, updateCategory, updateExpense, updateUser,
      login, loginWithPhone, registerWithPhone, logout, register, updateProfile,
      reviews, reviewsPagination, refreshReviews,
      coupons, appliedCoupon, setAppliedCoupon, addCoupon, updateCoupon, deleteCoupon, applyCoupon, fetchSalesReport, fetchCashierReport,
      fetchBestSellers, recordRecentlyViewed, getRecentlyViewedIds, trackOrder, lookupCustomer,
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
