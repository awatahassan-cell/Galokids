/**
 * The rest of what the back office works with.
 *
 * Kept apart from `types.ts`, which describes what a shopper sees. These are
 * the shapes behind the till and the panel: stock movements, suppliers, shift
 * takings, the reports. Written from the Laravel responses.
 */

export interface Expense {
  id: number;
  /** The API requires this, not `description` — which is the optional one. */
  category: string;
  amount: number;
  description: string | null;
  /** The column is `date`, and the API refuses a request without it. */
  date: string;
  created_at: string;
}

/**
 * A coupon, as `/coupons` returns it.
 *
 * camelCase, unlike almost everything else the API sends — the controller
 * formats coupons for the website, which has always asked for them that way.
 * An earlier version of this type was written from the database columns
 * instead (`discount_percentage`, `used_count`) and every field read as
 * `undefined`: the table drew "%undefined", and nothing complained, because
 * the type checker was only ever shown the type.
 *
 * The id is a string for the same reason: the column is a string key.
 */
export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  /** How many times it may be used in all. null means without limit. */
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  minOrderAmount: number;
  timesUsed: number;
}

/**
 * A supplier, as `/suppliers` returns it.
 *
 * What the shop still owes is `debt_balance`. An earlier version of this type
 * called it `balance`, which the API has never sent — so the field read as
 * undefined, every supplier showed as owed nothing, and the one screen that
 * exists to say who the shop owes money to said nobody.
 */
export interface Supplier {
  id: number;
  name: string;
  company?: string | null;
  contact_person?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  notes: string | null;
  opening_balance?: number;
  purchases_count?: number;
  total_purchases?: number;
  total_paid?: number;
  /** What the shop still owes: purchases on credit, less payments made. */
  debt_balance: number;
}

export interface PurchaseItem {
  id: number;
  product_id: number | null;
  product_variation_id: number | null;
  product_name: string | null;
  quantity: number;
  unit_cost: number;
}

export interface Purchase {
  id: number;
  supplier_id: number | null;
  supplier_name?: string | null;
  reference: string | null;
  total_amount: number;
  amount_paid: number;
  purchased_at: string;
  items: PurchaseItem[];
}

export interface StockMovement {
  id: number;
  product_variation_id: number;
  product_id: number | null;
  product_name?: string | null;
  type: string;
  quantity_change: number;
  quantity_after: number;
  note: string | null;
  order_id: number | null;
  created_at: string;
}

export interface Shift {
  id: number;
  user_id: number;
  user_name?: string | null;
  status: 'open' | 'closed';
  opening_float: number;
  closing_amount: number | null;
  opened_at: string;
  closed_at: string | null;
}

export interface Review {
  id: number;
  product_id: number;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  verified_purchase: boolean;
  created_at: string;
}

/**
 * An inquiry from the contact form.
 *
 * Read or not is `status` — "unread", "read" or "replied" — not a timestamp.
 * The type used to say `read_at`, which does not exist, so every message read
 * as unread, or every one as read, depending on which way the check was
 * written.
 */
export interface ContactMessage {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
}

export interface ActivityLog {
  id: number;
  /** A dotted name: "settings.updated", "order.refunded". */
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  /** The one-line account of what happened. Not `description`. */
  summary: string | null;
  user_name?: string | null;
  ip?: string | null;
  created_at: string;
}

/* ------------------------------------------------------------ reports --- */

/**
 * One day on the calendar.
 *
 * Written from the actual response, not from what the names suggest: the count
 * is `orders_count` (not `order_count`, which is what the range summary uses),
 * and cost of goods is `cogs`. Guessing at these produced screens that threw
 * rather than screens that were merely wrong.
 */
export interface DailyReportRow {
  day: string;
  revenue: number;
  pos_revenue: number;
  online_revenue: number;
  social_revenue: number;
  orders_count: number;
  items_sold: number;
  cogs: number;
  expenses: number;
  net_profit: number;
}

/** `GET /reports/daily` wraps its rows; it does not return a bare array. */
export interface DailyReport {
  from: string;
  to: string;
  days: DailyReportRow[];
}

/** `GET /reports/sales` over a range. */
export interface SalesReport {
  from: string;
  to: string;
  revenue: number;
  pos_revenue: number;
  online_revenue: number;
  social_revenue: number;
  refunded: number;
  /** Cost of the goods sold. */
  cogs: number;
  gross_profit: number;
  expenses: number;
  /** Gross profit less expenses — the figure the shop actually keeps. */
  net_profit: number;
  order_count: number;
  items_sold: number;
  average_order_value: number;
}

export interface CashierReportRow {
  user_id: number | null;
  name: string;
  orders_count: number;
  /** Takings, net of refunds. */
  total: number;
  pos_total: number;
  online_total: number;
  social_total: number;
}

/** `GET /reports/cashiers` wraps its rows too. */
export interface CashierReport {
  from: string;
  to: string;
  cashiers: CashierReportRow[];
  grand_total: number;
}

export interface CouponReportRow {
  code: string;
  is_active: boolean;
  discount_percentage: number;
  redemptions: number;
  discount_given: number;
}

/** What the orders screen puts on its tabs. */
export interface OrderCounts {
  total: number;
  pending?: number;
  processing?: number;
  shipped?: number;
  delivered?: number;
  cancelled?: number;
  returned?: number;
  /** New plus pending: what the shop has not yet acted on. */
  new_and_pending?: number;
}

/** One step in an order's life. */
export interface OrderHistoryEntry {
  id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  customer_notified: boolean;
  created_at: string;
  user?: { id: number; name: string } | null;
}

/** What the shop knows about a phone number, at the counter. */
export interface CustomerLookup {
  found: boolean;
  name?: string | null;
  orders_count?: number;
  total_spent?: number;
  last_order_at?: string | null;
}
