import { api } from './client';
import {
  toCategory,
  toOrder,
  toProduct,
  toReview,
  toStoreSettings,
  toUser,
} from './mappers';
import type {
  Category,
  CouponResult,
  Order,
  Paginated,
  Product,
  Review,
  ShippingQuote,
  StoreSettings,
  User,
} from './types';

/**
 * Everything the app is allowed to ask the server for.
 *
 * The shop's API also serves the till, the stock ledger, purchasing, supplier
 * accounts, reports and user administration. None of it is reachable from
 * here: this file is the app's whole vocabulary, and it contains only what a
 * customer's phone needs. A screen cannot reach an admin endpoint by
 * accident, because there is no function that names one.
 */

type ListResponse<T> = T[] | { data?: T[]; current_page?: number; last_page?: number; total?: number };

function unwrapList<T, R>(payload: ListResponse<T>, map: (raw: T) => R): Paginated<R> {
  if (Array.isArray(payload)) {
    return { data: payload.map(map), currentPage: 1, lastPage: 1, total: payload.length };
  }

  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return {
    data: rows.map(map),
    currentPage: Number(payload?.current_page ?? 1),
    lastPage: Number(payload?.last_page ?? 1),
    total: Number(payload?.total ?? rows.length),
  };
}

// ---- catalogue ---------------------------------------------------------

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  gender?: 0 | 1 | 2;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  signal?: AbortSignal;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
  const { signal, sort, categoryId, minPrice, maxPrice, ...rest } = query;

  const payload = await api<ListResponse<any>>('/products', {
    signal,
    query: {
      ...rest,
      category_id: categoryId,
      min_price: minPrice,
      max_price: maxPrice,
      sort_by: sort === 'price_asc' ? 'price' : sort === 'price_desc' ? 'price' : undefined,
      sort_dir: sort === 'price_asc' ? 'asc' : sort === 'price_desc' ? 'desc' : undefined,
      // Always ask for a page. Without one the endpoint hands back the whole
      // catalogue, which on a phone is a slow request and a lot of memory.
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    },
  });

  return unwrapList(payload, toProduct);
}

export async function fetchProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return toProduct(await api<any>(`/products/${encodeURIComponent(id)}`, { signal }));
}

export async function fetchBestSellers(limit = 10, signal?: AbortSignal): Promise<Product[]> {
  const payload = await api<ListResponse<any>>('/products/best-sellers', { query: { limit }, signal });
  return unwrapList(payload, toProduct).data;
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const payload = await api<ListResponse<any>>('/categories', { signal });
  return unwrapList(payload, toCategory).data;
}

export async function fetchReviews(signal?: AbortSignal): Promise<Review[]> {
  const payload = await api<ListResponse<any>>('/reviews', { signal });
  return unwrapList(payload, toReview).data;
}

export async function submitReview(input: {
  productId: string;
  author: string;
  rating: number;
  comment: string;
}): Promise<void> {
  await api('/reviews', {
    method: 'POST',
    auth: true,
    body: {
      product_id: input.productId,
      author: input.author,
      rating: input.rating,
      comment: input.comment,
    },
  });
}

// ---- shop configuration ------------------------------------------------

export async function fetchSettings(signal?: AbortSignal): Promise<StoreSettings> {
  return toStoreSettings(await api<any>('/settings', { signal }));
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl: string;
  permalink: string;
}

export async function fetchInstagramFeed(signal?: AbortSignal): Promise<InstagramPost[]> {
  const payload = await api<any[]>('/instagram/feed', { signal });
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(post => post?.id && post?.mediaUrl)
    .map(post => ({
      id: String(post.id),
      caption: post.caption ?? undefined,
      mediaUrl: String(post.mediaUrl),
      permalink: String(post.permalink ?? ''),
    }));
}

export async function fetchShippingQuote(
  governorate: string,
  subtotal: number,
  signal?: AbortSignal
): Promise<ShippingQuote> {
  const payload = await api<any>('/shipping/quote', {
    query: { governorate, subtotal },
    signal,
  });

  return {
    fee: Number(payload?.fee ?? 0),
    freeOver: Number(payload?.free_over ?? 0),
    defaultFee: Number(payload?.default_fee ?? 0),
  };
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponResult> {
  try {
    const payload = await api<any>('/coupons/validate', {
      method: 'POST',
      body: { code, subtotal },
    });

    const percentage = Number(payload?.discount_percentage ?? payload?.discountPercentage ?? 0);
    return {
      valid: payload?.valid !== false && percentage > 0,
      code: payload?.code ?? code,
      discountPercentage: percentage,
      message: payload?.message,
    };
  } catch (error) {
    return { valid: false, message: (error as Error).message };
  }
}

// ---- signing in --------------------------------------------------------

export async function requestOtp(phone: string): Promise<{ sent: boolean; message?: string }> {
  const payload = await api<any>('/send-otp', { method: 'POST', body: { phone } });
  return { sent: true, message: payload?.message };
}

export async function verifyOtp(phone: string, code: string): Promise<string> {
  const payload = await api<any>('/verify-otp', { method: 'POST', body: { phone, code } });
  const token = payload?.verification_token;
  if (!token) throw new Error('Verification failed');
  return String(token);
}

export async function phoneStatus(phone: string): Promise<{ exists: boolean; name?: string }> {
  try {
    const payload = await api<any>('/auth/phone-status', { method: 'POST', body: { phone } });
    return { exists: Boolean(payload?.exists), name: payload?.name ?? undefined };
  } catch {
    // Not knowing simply means the sign-in screen asks for a name.
    return { exists: false };
  }
}

export async function signInWithPhone(input: {
  phone: string;
  verificationToken: string;
  name?: string;
}): Promise<{ token: string; user: User }> {
  const payload = await api<any>('/login-with-phone', {
    method: 'POST',
    body: {
      phone: input.phone,
      verification_token: input.verificationToken,
      ...(input.name ? { name: input.name } : {}),
    },
  });

  const token = payload?.token ?? payload?.access_token;
  if (!token) throw new Error('Sign-in failed');

  return { token: String(token), user: toUser(payload?.user ?? {}) };
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  const payload = await api<any>('/user', { auth: true, signal });
  return toUser(payload?.user ?? payload);
}

export async function updateProfile(input: {
  name?: string;
  email?: string;
  address?: string;
}): Promise<User> {
  const payload = await api<any>('/user/profile', { method: 'PUT', auth: true, body: input });
  return toUser(payload?.user ?? payload);
}

export async function signOut(): Promise<void> {
  try {
    await api('/logout', { method: 'POST', auth: true });
  } catch {
    // The token is being dropped locally regardless; a failed round trip
    // must not leave the customer stuck on a screen they asked to leave.
  }
}

// ---- orders ------------------------------------------------------------

export interface PlaceOrderInput {
  items: { productId: string; productVariationId?: string; quantity: number }[];
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  governorate: string;
  couponCode?: string;
  notes?: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const payload = await api<any>('/orders', {
    method: 'POST',
    auth: true,
    body: {
      items: input.items.map(item => ({
        product_id: item.productId,
        ...(item.productVariationId ? { product_variation_id: item.productVariationId } : {}),
        quantity: item.quantity,
      })),
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      shipping_address: input.shippingAddress,
      governorate: input.governorate,
      status: 'pending',
      // Cash on delivery is the only method the shop offers online, and the
      // app must not be able to mark an order paid.
      payment_method: 'cod',
      channel: 'online',
      source: 'online',
      ...(input.couponCode ? { coupon_code: input.couponCode } : {}),
    },
  });

  return toOrder(payload?.order ?? payload);
}

export async function fetchMyOrders(page = 1, signal?: AbortSignal): Promise<Paginated<Order>> {
  const payload = await api<ListResponse<any>>('/orders', {
    auth: true,
    signal,
    // `mine` keeps the request to this customer's own orders. Staff accounts
    // would otherwise see the whole shop's list inside a shopping app.
    query: { mine: 1, page, limit: 20 },
  });

  return unwrapList(payload, toOrder);
}

export async function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return toOrder(await api<any>(`/orders/${encodeURIComponent(id)}`, { auth: true, signal }));
}

export async function trackOrder(orderId: string, phone: string): Promise<Order> {
  const payload = await api<any>('/orders/track', { query: { id: orderId, phone } });
  return toOrder(payload?.order ?? payload);
}
