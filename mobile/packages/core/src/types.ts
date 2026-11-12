/**
 * The shapes the API actually returns.
 *
 * Written from the Laravel responses, not from the website's own types: the
 * website converts snake_case to camelCase on the way in, so its types describe
 * what it holds rather than what came over the wire. These describe the wire.
 */

/** 0 customer, 1 admin, 2 cashier, 3 staff — see App\Support\Roles. */
export type Role = 0 | 1 | 2 | 3;

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  address: string | null;
  /** null when nobody has chosen; the role's defaults apply then. */
  permissions: string[] | null;
}

export interface ProductVariation {
  id: number;
  product_id: number;
  color: string | null;
  size: string | null;
  stock_quantity: number;
  sku: string | null;
  barcode: string | null;
  price_override: number | null;
}

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  name_ku: string | null;
  name_ar: string | null;
  description: string | null;
  description_ku: string | null;
  description_ar: string | null;
  price: number;
  discount_price: number | null;
  /** Absent for anyone not signed in to the back office. */
  cost?: number;
  /** Always a whole URL, or null. The API makes it absolute. */
  image_url: string | null;
  images: string[];
  gender: 0 | 1 | 2;
  sku: string | null;
  barcode: string | null;
  is_active: boolean;
  variations: ProductVariation[];
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  name_ku: string | null;
  name_ar: string | null;
  slug: string;
  icon: string | null;
  products_count?: number;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_variation_id: number | null;
  product_name: string | null;
  variation_label: string | null;
  quantity: number;
  price: number;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface Order {
  id: number;
  invoice_no: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  amount_paid: number | null;
  change_due: number | null;
  governorate: string | null;
  shipping_address: string | null;
  payment_method: string | null;
  channel: 'pos' | 'online' | 'social' | null;
  items: OrderItem[];
  /** Set when the sale was rung up against a stock count that had moved. */
  offline_stock_conflict?: boolean;
  created_at: string;
}

/** One line a till is about to sell. */
export interface NewOrderItem {
  product_id?: number | null;
  product_variation_id?: number | null;
  quantity: number;
  /** Staff only, and only for a line with no catalogue product behind it. */
  unit_price?: number;
  name?: string;
}

export interface NewOrder {
  items: NewOrderItem[];
  status?: OrderStatus;
  channel?: 'pos' | 'online' | 'social';
  payment_method?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  governorate?: string;
  shipping_address?: string;
  coupon_code?: string;
  discount_amount?: number;
  amount_paid?: number;

  // ---- a till that was offline when the sale happened ------------------
  /** Made on the device before the first attempt; never changed on a retry. */
  idempotency_key?: string;
  /** When the money was taken, so the sale lands on the right day. */
  sold_at?: string;
  /** What the device already printed on the receipt. */
  invoice_no?: string;
}

/** Laravel's paginator, as the list endpoints return it. */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  user: User;
}
