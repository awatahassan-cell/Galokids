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

export interface Coupon {
  id: number;
  code: string;
  discount_percentage: number;
  isActive: boolean;
  usage_limit: number | null;
  used_count: number;
  min_subtotal: number | null;
  expires_at: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  /** What the shop still owes: purchases on credit, less payments made. */
  balance?: number;
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

export interface ContactMessage {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  description: string | null;
  user_name?: string | null;
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
}
