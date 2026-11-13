import { apiRequest } from './client';
import {
  Category,
  LoginResult,
  NewOrder,
  Order,
  Paginated,
  Product,
  TrackedOrder,
  User,
} from './types';

/* ------------------------------------------------------------ auth --- */

export const auth = {
  /** Email or phone, plus a password. Back office accounts sign in this way. */
  login: (login: string, password: string) =>
    apiRequest<LoginResult>('login', {
      method: 'POST',
      body: { login, password },
      anonymous: true,
    }),

  /** A customer signs in with a code instead. */
  sendOtp: (phone: string) =>
    apiRequest<{ success: boolean; message: string }>('send-otp', {
      method: 'POST',
      body: { phone },
      anonymous: true,
    }),

  verifyOtp: (phone: string, code: string) =>
    apiRequest<{ success: boolean; verification_token?: string; message: string }>('verify-otp', {
      method: 'POST',
      body: { phone, code },
      anonymous: true,
    }),

  /**
   * The token from verify-otp, exchanged for a session.
   *
   * The phone number alone is not enough and never was: without the token
   * anyone could ask to be signed in as any number.
   */
  loginWithPhone: (phone: string, verificationToken: string, name?: string) =>
    apiRequest<LoginResult>('login-with-phone', {
      method: 'POST',
      body: { phone, verification_token: verificationToken, name },
      anonymous: true,
    }),

  me: () => apiRequest<User>('user'),

  logout: () => apiRequest<void>('logout', { method: 'POST' }),
};

/* -------------------------------------------------------- catalogue --- */

export const catalogue = {
  products: (params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    inStock?: boolean;
    /** Back office only: include the ones taken off the website. */
    includeInactive?: boolean;
  } = {}) =>
    apiRequest<Paginated<Product>>('products', {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        search: params.search,
        category_id: params.categoryId,
        in_stock: params.inStock ? 1 : undefined,
        include_inactive: params.includeInactive ? 1 : undefined,
      },
    }),

  product: (id: number) => apiRequest<Product>(`products/${id}`),

  /**
   * Only what changed since the till last synced.
   *
   * Oldest change first, so a till many pages behind walks forward and can
   * remember where it got to rather than starting over each time.
   */
  productsChangedSince: (since: string, page = 1, limit = 100) =>
    apiRequest<Paginated<Product>>('products', {
      query: { updated_since: since, page, limit, include_inactive: 1 },
    }),

  categories: () => apiRequest<Category[]>('categories'),

  bestSellers: (limit = 10) => apiRequest<Product[]>('products/best-sellers', { query: { limit } }),
};

/* ----------------------------------------------------------- orders --- */

export const orders = {
  list: (params: {
    page?: number;
    limit?: number;
    channel?: 'pos' | 'online' | 'social';
    status?: string;
    search?: string;
    mine?: boolean;
  } = {}) =>
    apiRequest<Paginated<Order>>('orders', {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 25,
        channel: params.channel,
        status: params.status,
        search: params.search,
        mine: params.mine ? 1 : undefined,
      },
    }),

  get: (id: number) => apiRequest<Order>(`orders/${id}`),

  /**
   * Follow an order without signing in.
   *
   * Open to anyone, so the server insists on both the order number and the
   * phone number recorded against it — guessing sequential ids gets you
   * nothing. It answers 404 for a wrong pair rather than saying which half was
   * wrong, which is also why this returns a slimmer shape than `get`.
   *
   * The phone must be in canonical form; pass it through `normalizePhone`
   * first. The server compares digits, so `0750…` and `964750…` are different
   * strings to it and a customer typing the number the way they say it aloud
   * would be told their own order does not exist.
   */
  track: (id: number | string, phone: string) =>
    apiRequest<TrackedOrder>('orders/track', {
      query: { id, phone },
      anonymous: true,
    }),

  /**
   * Ring up a sale.
   *
   * Give `idempotency_key` for anything a till might retry. The server returns
   * the order it already has rather than creating a second one — the
   * difference between a customer being charged once and twice.
   */
  create: (order: NewOrder, timeoutMs?: number) =>
    apiRequest<Order>('orders', { method: 'POST', body: order, timeoutMs }),

  updateStatus: (id: number, status: string) =>
    apiRequest<Order>(`orders/${id}`, { method: 'PUT', body: { status } }),
};

/* -------------------------------------------------------- shop info --- */

export const shop = {
  settings: () => apiRequest<Record<string, unknown>>('settings', { anonymous: true }),

  /**
   * Write shop settings. Admin only; the server checks.
   *
   * A partial map: only the keys sent are touched, so saving the banner
   * cannot blank the shop's address. Arrays and objects are JSON-encoded
   * server side, which is how `hero_slides` is stored.
   */
  updateSettings: (values: Record<string, unknown>) =>
    apiRequest<{ message?: string }>('settings', { method: 'PUT', body: values }),

  shippingQuote: (governorate: string, subtotal: number) =>
    apiRequest<{ fee: number; free: boolean }>('shipping/quote', {
      query: { governorate, subtotal },
      anonymous: true,
    }),
};

export const api = { auth, catalogue, orders, shop };
