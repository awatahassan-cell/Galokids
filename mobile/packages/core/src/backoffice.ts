import { apiRequest } from './client';
import type {
  ActivityLog,
  CashierReport,
  DailyReport,
  ContactMessage,
  Coupon,
  CouponReportRow,
  Expense,
  OrderCounts,
  Purchase,
  Review,
  SalesReport,
  Shift,
  StockMovement,
  Supplier,
} from './backoffice-types';
import type { Category, Paginated, Product, ProductVariation, User } from './types';

/**
 * Everything behind the counter.
 *
 * One wrapper per endpoint, so a screen says what it wants rather than
 * assembling a URL. Where the API takes a date range it is always `from`/`to`
 * as plain YYYY-MM-DD, because that is what every report here already speaks.
 */

export interface DateRange {
  from?: string;
  to?: string;
}

/* ----------------------------------------------------------- reports --- */

export const reports = {
  /** Revenue, cost and profit over a range. The shop's headline numbers. */
  sales: (range: DateRange & { mine?: boolean } = {}) =>
    apiRequest<SalesReport>('reports/sales', {
      query: { from: range.from, to: range.to, mine: range.mine ? 1 : undefined },
    }),

  /**
   * Day by day, for the calendar and the overview chart.
   *
   * Returns `{ from, to, days }`, not a bare array — reading it as one is how
   * the reports screen came to throw `e.map is not a function`.
   */
  daily: (range: DateRange = {}) =>
    apiRequest<DailyReport>('reports/daily', { query: { from: range.from, to: range.to } }),

  /** Who sold what. Wrapped as `{ from, to, cashiers, grand_total }`. */
  cashiers: (range: DateRange = {}) =>
    apiRequest<CashierReport>('reports/cashiers', { query: { from: range.from, to: range.to } }),

  coupons: (range: DateRange = {}) =>
    apiRequest<CouponReportRow[]>('reports/coupons', { query: { from: range.from, to: range.to } }),
};

/* --------------------------------------------------------- inventory --- */

export const inventory = {
  /** The ledger: every movement, with why it happened. */
  movements: (params: { page?: number; limit?: number; type?: string; variationId?: number } = {}) =>
    apiRequest<Paginated<StockMovement>>('stock-movements', {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        type: params.type,
        product_variation_id: params.variationId,
      },
    }),

  /** Correct a count after a stock-take. The difference is recorded, not hidden. */
  adjust: (variationId: number, countedLevel: number, note?: string) =>
    apiRequest<StockMovement>('stock-movements', {
      method: 'POST',
      body: { product_variation_id: variationId, counted_level: countedLevel, note },
    }),

  variations: (params: { page?: number; limit?: number; search?: string } = {}) =>
    apiRequest<Paginated<ProductVariation>>('variants', {
      query: { page: params.page ?? 1, limit: params.limit ?? 50, search: params.search },
    }),

  updateVariation: (id: number, changes: Partial<ProductVariation>) =>
    apiRequest<ProductVariation>(`variants/${id}`, { method: 'PUT', body: changes }),
};

/* ---------------------------------------------------------- the till --- */

export const shifts = {
  /**
   * The signed-in cashier's open shift.
   *
   * Answers `{}` rather than null when there is none, so check for an id — an
   * empty object is truthy and `data !== null` was never going to catch it.
   */
  current: () => apiRequest<Shift | Record<string, never>>('shifts/current'),

  /** A plain array, not a paginator. */
  list: (params: { limit?: number } = {}) =>
    apiRequest<Shift[]>('shifts', { query: { limit: params.limit ?? 25 } }),

  open: (openingFloat: number) =>
    apiRequest<Shift>('shifts/open', { method: 'POST', body: { opening_float: openingFloat } }),

  close: (countedAmount: number, note?: string) =>
    apiRequest<Shift>('shifts/close', { method: 'POST', body: { closing_amount: countedAmount, note } }),

  /** Money in or out of the drawer that is not a sale. */
  recordCash: (direction: 'in' | 'out', amount: number, reason: string) =>
    apiRequest<void>('shifts/cash', { method: 'POST', body: { direction, amount, reason } }),

  report: (shiftId?: number) => apiRequest<Record<string, unknown>>('shifts/report', { query: { shift_id: shiftId } }),
};

/* ---------------------------------------------------------- the shop --- */

export const backoffice = {
  orderCounts: (params: { channel?: string; mine?: boolean } = {}) =>
    apiRequest<OrderCounts>('orders/counts', {
      query: { channel: params.channel, mine: params.mine ? 1 : undefined },
    }),

  orderHistory: (id: number) =>
    apiRequest<{ to_status: string; note: string | null; created_at: string }[]>(`orders/${id}/history`),

  refundOrder: (id: number, body: { items?: { order_item_id: number; quantity: number }[]; reason?: string }) =>
    apiRequest<unknown>(`orders/${id}/refund`, { method: 'POST', body }),

  deleteOrder: (id: number) => apiRequest<void>(`orders/${id}`, { method: 'DELETE' }),

  /** Find a returning customer at the counter by phone or name. */
  lookupCustomer: (term: string) =>
    apiRequest<User[]>('customers/lookup', { query: { search: term } }),

  users: (params: { page?: number; limit?: number; role?: number; search?: string } = {}) =>
    apiRequest<Paginated<User>>('users', {
      query: { page: params.page ?? 1, limit: params.limit ?? 25, role: params.role, search: params.search },
    }),

  saveUser: (user: Partial<User> & { password?: string }, id?: number) =>
    id
      ? apiRequest<User>(`users/${id}`, { method: 'PUT', body: user })
      : apiRequest<User>('users', { method: 'POST', body: user }),

  deleteUser: (id: number) => apiRequest<void>(`users/${id}`, { method: 'DELETE' }),

  saveProduct: (product: Partial<Product>, id?: number) =>
    id
      ? apiRequest<Product>(`products/${id}`, { method: 'PUT', body: product })
      : apiRequest<Product>('products', { method: 'POST', body: product }),

  deleteProduct: (id: number) => apiRequest<void>(`products/${id}`, { method: 'DELETE' }),

  saveCategory: (category: Partial<Category>, id?: number) =>
    id
      ? apiRequest<Category>(`categories/${id}`, { method: 'PUT', body: category })
      : apiRequest<Category>('categories', { method: 'POST', body: category }),

  deleteCategory: (id: number) => apiRequest<void>(`categories/${id}`, { method: 'DELETE' }),

  expenses: (params: { page?: number; limit?: number } & DateRange = {}) =>
    apiRequest<Paginated<Expense>>('expenses', {
      query: { page: params.page ?? 1, limit: params.limit ?? 25, from: params.from, to: params.to },
    }),

  /**
   * Record a spend.
   *
   * `category` and `date` are both required by the API — a request without
   * either is refused, and the column is `date`, not `spent_on`.
   */
  saveExpense: (expense: Partial<Expense>, id?: number) =>
    id
      ? apiRequest<Expense>(`expenses/${id}`, { method: 'PUT', body: expense })
      : apiRequest<Expense>('expenses', { method: 'POST', body: expense }),

  deleteExpense: (id: number) => apiRequest<void>(`expenses/${id}`, { method: 'DELETE' }),

  coupons: () => apiRequest<Coupon[]>('coupons'),
  saveCoupon: (coupon: Partial<Coupon>, id?: number) =>
    id
      ? apiRequest<Coupon>(`coupons/${id}`, { method: 'PUT', body: coupon })
      : apiRequest<Coupon>('coupons', { method: 'POST', body: coupon }),
  deleteCoupon: (id: number) => apiRequest<void>(`coupons/${id}`, { method: 'DELETE' }),

  suppliers: () => apiRequest<Supplier[]>('suppliers'),
  saveSupplier: (supplier: Partial<Supplier>, id?: number) =>
    id
      ? apiRequest<Supplier>(`suppliers/${id}`, { method: 'PUT', body: supplier })
      : apiRequest<Supplier>('suppliers', { method: 'POST', body: supplier }),
  paySupplier: (id: number, amount: number, note?: string) =>
    apiRequest<unknown>(`suppliers/${id}/payments`, { method: 'POST', body: { amount, note } }),

  purchases: (params: { page?: number; limit?: number } = {}) =>
    apiRequest<Paginated<Purchase>>('purchases', {
      query: { page: params.page ?? 1, limit: params.limit ?? 25 },
    }),

  savePurchase: (purchase: Record<string, unknown>) =>
    apiRequest<Purchase>('purchases', { method: 'POST', body: purchase }),

  deletePurchase: (id: number) => apiRequest<void>(`purchases/${id}`, { method: 'DELETE' }),

  reviews: (params: { page?: number; limit?: number } = {}) =>
    apiRequest<Paginated<Review>>('reviews', {
      query: { page: params.page ?? 1, limit: params.limit ?? 25 },
    }),

  deleteReview: (id: number) => apiRequest<void>(`reviews/${id}`, { method: 'DELETE' }),

  messages: (params: { limit?: number; status?: string } = {}) =>
    apiRequest<ContactMessage[] | Paginated<ContactMessage>>('contact-messages', {
      query: { limit: params.limit ?? 100, status: params.status },
    }),

  unreadMessages: () => apiRequest<{ count: number }>('contact-messages/unread-count'),
  markMessageRead: (id: number) => apiRequest<unknown>(`contact-messages/${id}/read`, { method: 'PUT' }),
  deleteMessage: (id: number) => apiRequest<void>(`contact-messages/${id}`, { method: 'DELETE' }),

  activity: (params: { page?: number; limit?: number; action?: string } = {}) =>
    apiRequest<Paginated<ActivityLog>>('activity-logs', {
      query: { page: params.page ?? 1, limit: params.limit ?? 50, action: params.action },
    }),

  /** Act on many rows at once, as the panel's checkboxes do. */
  bulk: (
    resource: 'products' | 'orders' | 'users' | 'categories' | 'expenses' | 'coupons' | 'reviews',
    ids: number[],
    action: 'delete' | 'status',
    extra: Record<string, unknown> = {}
  ) =>
    apiRequest<{ affected: number }>(
      action === 'status' ? `bulk/${resource}/status` : `bulk/${resource}`,
      { method: 'POST', body: { ids, ...extra } }
    ),
};
