<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Expense;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    /**
     * Per-cashier sales for a date range. Each order carries the user_id of the
     * staff member who created it (POS orders record the logged-in cashier),
     * so we can break down who sold how much. Admin only.
     */
    public function cashiers(Request $request)
    {
        $user = $this->requireAdmin($request);

        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->toDateString());

        $rows = Order::whereBetween('orders.created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            // A returned order is no more a sale than a cancelled one, so
            // neither belongs in a cashier's takings.
            ->whereNotIn('orders.status', Order::STATUSES_WITHOUT_STOCK_HELD)
            ->leftJoin('users', 'orders.user_id', '=', 'users.id')
            ->select(
                'orders.user_id',
                DB::raw("COALESCE(users.name, 'Unknown') as name"),
                DB::raw('COUNT(*) as orders_count'),
                DB::raw('SUM(orders.total_amount) - SUM(COALESCE(orders.refunded_amount, 0)) as total'),
                // Net of refunds, exactly like the `total` beside them. Taking
                // the raw charge here made the per-channel cards add up to more
                // than the revenue figure printed above them.
                DB::raw("SUM(CASE WHEN orders.channel = 'pos' THEN orders.total_amount - COALESCE(orders.refunded_amount, 0) ELSE 0 END) as pos_total"),
                DB::raw("SUM(CASE WHEN orders.channel = 'online' THEN orders.total_amount - COALESCE(orders.refunded_amount, 0) ELSE 0 END) as online_total")
            )
            ->groupBy('orders.user_id', 'users.name')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'from' => $from,
            'to' => $to,
            'cashiers' => $rows,
            'grand_total' => round((float) $rows->sum('total')),
        ]);
    }

    /**
     * Sales & profit summary for a date range (defaults to the last 30 days).
     * COGS is estimated from each product's current cost price.
     */
    public function sales(Request $request)
    {
        $this->checkStaffOrAdmin($request);

        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'channel' => 'nullable|string|in:online,pos',
        ]);

        $from = $request->input('from', now()->subDays(30)->toDateString());
        $to = $request->input('to', now()->toDateString());

        // Money side: a cancelled order was never a sale, so it is out. An order
        // with returns on it stays in — its revenue is what was kept, which the
        // refund subtraction below works out — and a delivery fee on a returned
        // order was still charged and still paid to the courier.
        $ordersQuery = Order::whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->where('status', '!=', Order::STATUS_CANCELLED);
        if ($request->filled('channel')) {
            $ordersQuery->where('channel', $request->channel);
        }

        // Aggregate in SQL. The previous version loaded every order in the range
        // into PHP and then passed the whole id list into `whereIn(...)` — which
        // grows without bound and eventually breaks the query.
        $totals = (clone $ordersQuery)
            ->selectRaw('COALESCE(SUM(total_amount), 0) as revenue')
            ->selectRaw('COALESCE(SUM(refunded_amount), 0) as refunded')
            ->first();

        $grossRevenue = (float) ($totals->revenue ?? 0);
        $refunded = (float) ($totals->refunded ?? 0);

        // The same money split by where the sale happened. The screen used to
        // take this from the per-cashier report, which is admin-only — a
        // cashier opening the page saw both channels as zero.
        $byChannel = (clone $ordersQuery)
            ->selectRaw("COALESCE(SUM(CASE WHEN channel = 'pos' THEN total_amount - COALESCE(refunded_amount, 0) ELSE 0 END), 0) as pos")
            ->selectRaw("COALESCE(SUM(CASE WHEN channel = 'online' THEN total_amount - COALESCE(refunded_amount, 0) ELSE 0 END), 0) as online")
            ->first();

        // Money actually kept: refunds were handed back to the customer, so the
        // old figure overstated revenue on every partially refunded order.
        $revenue = $grossRevenue - $refunded;

        // Orders the shop actually made. A receipt that came back in full is
        // not one of them, and counting it dragged the average order value
        // down as well as overstating how busy the day was.
        $orderCount = (int) (clone $ordersQuery)
            ->where('status', '!=', Order::STATUS_RETURNED)
            ->count();

        // Reusable "orders inside the window" filter for the item-level queries.
        $inWindow = function ($query) use ($from, $to, $request) {
            $query->select('id')->from('orders')
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->where('status', '!=', Order::STATUS_CANCELLED);
            if ($request->filled('channel')) {
                $query->where('channel', $request->channel);
            }
        };

        // Pieces that stayed sold. Returned goods went back on the shelf, so
        // counting them here sold the same piece twice and — through COGS —
        // charged the shop for stock it still owns.
        $net = self::netPieces();

        $itemsSold = (int) OrderItem::whereIn('order_id', $inWindow)->sum(DB::raw($net));

        // Estimated cost of goods sold using each product's current cost.
        $cogs = (float) OrderItem::whereIn('order_items.order_id', $inWindow)
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->sum(DB::raw("COALESCE(products.cost, 0) * $net"));

        // A date column holds midnight, so comparing it against the plain end
        // date as a string dropped everything recorded on the last day of the
        // range — every report ending today missed today's expenses and
        // reported a profit the shop had not made.
        $expenses = (float) Expense::whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->sum('amount');

        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $expenses;

        // Daily revenue series (for charts).
        $daily = (clone $ordersQuery)
            ->select(
                DB::raw('DATE(created_at) as day'),
                DB::raw('SUM(total_amount) - SUM(COALESCE(refunded_amount, 0)) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('day')->orderBy('day')->get();

        // Best-selling products in the window.
        $topProducts = OrderItem::whereIn('order_items.order_id', $inWindow)
            ->whereNotNull('product_id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select('products.id', 'products.name',
                DB::raw("SUM($net) as qty"),
                DB::raw("SUM(order_items.price * $net) as revenue"))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')->limit(10)->get();

        return response()->json([
            'from' => $from,
            'to' => $to,
            'revenue' => round($revenue),
            'pos_revenue' => round((float) ($byChannel->pos ?? 0)),
            'online_revenue' => round((float) ($byChannel->online ?? 0)),
            'refunded' => round($refunded),
            'cogs' => round($cogs),
            'gross_profit' => round($grossProfit),
            'expenses' => round($expenses),
            'net_profit' => round($netProfit),
            'order_count' => $orderCount,
            'items_sold' => $itemsSold,
            'average_order_value' => $orderCount ? round($revenue / $orderCount) : 0,
            'daily' => $daily,
            'top_products' => $topProducts,
        ]);
    }

    /**
     * SQL for the pieces of a line that stayed sold.
     *
     * Returned goods went back on the shelf, so counting them as sold would
     * sell the same piece twice and — through COGS — charge the shop for stock
     * it still owns. MySQL spells the two-argument maximum differently to
     * SQLite, which is the only reason this is not a plain string.
     */
    private static function netPieces(): string
    {
        $expression = 'order_items.quantity - order_items.returned_quantity';

        return in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)
            ? "GREATEST($expression, 0)"
            : "MAX($expression, 0)";
    }

    /**
     * Day-by-day totals for a range.
     *
     * The calendar screen used to work these out in the browser by reducing over
     * every order the admin panel had loaded. That only held while the orders
     * endpoint returned the whole table — the moment it pages, the calendar
     * would quietly report one page of a month. Counting in SQL keeps it right
     * however many orders the shop has taken.
     */
    public function daily(Request $request)
    {
        $this->checkStaffOrAdmin($request);

        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->endOfMonth()->toDateString());

        $window = [$from . ' 00:00:00', $to . ' 23:59:59'];
        $net = self::netPieces();
        $returned = Order::STATUS_RETURNED;

        $money = Order::whereBetween('created_at', $window)
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->select(
                DB::raw('DATE(created_at) as day'),
                DB::raw('COALESCE(SUM(total_amount - COALESCE(refunded_amount, 0)), 0) as revenue'),
                DB::raw("COALESCE(SUM(CASE WHEN channel = 'pos' THEN total_amount - COALESCE(refunded_amount, 0) ELSE 0 END), 0) as pos_revenue"),
                DB::raw("COALESCE(SUM(CASE WHEN channel = 'pos' THEN 0 ELSE total_amount - COALESCE(refunded_amount, 0) END), 0) as online_revenue"),
                DB::raw("SUM(CASE WHEN status = '$returned' THEN 0 ELSE 1 END) as orders_count"),
                DB::raw("SUM(CASE WHEN channel = 'pos' AND status != '$returned' THEN 1 ELSE 0 END) as pos_orders"),
                DB::raw("SUM(CASE WHEN channel != 'pos' AND status != '$returned' THEN 1 ELSE 0 END) as online_orders")
            )
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        // Pieces and cost come off the lines, so they need their own pass.
        $goods = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
            ->leftJoin('products', 'order_items.product_id', '=', 'products.id')
            ->whereBetween('orders.created_at', $window)
            ->where('orders.status', '!=', Order::STATUS_CANCELLED)
            ->select(
                DB::raw('DATE(orders.created_at) as day'),
                DB::raw("COALESCE(SUM($net), 0) as items_sold"),
                DB::raw("COALESCE(SUM(COALESCE(products.cost, 0) * $net), 0) as cogs"),
                DB::raw("COALESCE(SUM(CASE WHEN orders.channel = 'pos' THEN COALESCE(products.cost, 0) * $net ELSE 0 END), 0) as pos_cogs"),
                DB::raw("COALESCE(SUM(CASE WHEN orders.channel != 'pos' THEN COALESCE(products.cost, 0) * $net ELSE 0 END), 0) as online_cogs")
            )
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $spending = Expense::whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->select(DB::raw('DATE(date) as day'), DB::raw('COALESCE(SUM(amount), 0) as expenses'))
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $days = collect($money->keys())
            ->merge($goods->keys())
            ->merge($spending->keys())
            ->unique()
            ->sort()
            ->values()
            ->map(function ($day) use ($money, $goods, $spending) {
                $m = $money->get($day);
                $g = $goods->get($day);
                $revenue = (float) ($m->revenue ?? 0);
                $cogs = (float) ($g->cogs ?? 0);
                $spent = (float) ($spending->get($day)->expenses ?? 0);

                return [
                    'day' => $day,
                    'revenue' => round($revenue),
                    'pos_revenue' => round((float) ($m->pos_revenue ?? 0)),
                    'online_revenue' => round((float) ($m->online_revenue ?? 0)),
                    'orders_count' => (int) ($m->orders_count ?? 0),
                    'pos_orders' => (int) ($m->pos_orders ?? 0),
                    'online_orders' => (int) ($m->online_orders ?? 0),
                    'items_sold' => (int) ($g->items_sold ?? 0),
                    'cogs' => round($cogs),
                    'pos_cogs' => round((float) ($g->pos_cogs ?? 0)),
                    'online_cogs' => round((float) ($g->online_cogs ?? 0)),
                    'expenses' => round($spent),
                    'net_profit' => round($revenue - $cogs - $spent),
                ];
            });

        return response()->json([
            'from' => $from,
            'to' => $to,
            'days' => $days,
            'totals' => [
                'revenue' => round((float) $days->sum('revenue')),
                'pos_revenue' => round((float) $days->sum('pos_revenue')),
                'online_revenue' => round((float) $days->sum('online_revenue')),
                'orders_count' => (int) $days->sum('orders_count'),
                'pos_orders' => (int) $days->sum('pos_orders'),
                'online_orders' => (int) $days->sum('online_orders'),
                'items_sold' => (int) $days->sum('items_sold'),
                'cogs' => round((float) $days->sum('cogs')),
                'expenses' => round((float) $days->sum('expenses')),
                'net_profit' => round((float) $days->sum('net_profit')),
            ],
        ]);
    }

    /**
     * Coupon performance for a range.
     *
     * Same reason as the daily report: the browser was reducing over every
     * order it happened to be holding, so the moment the orders endpoint pages
     * this screen would describe one page of history as if it were all of it.
     */
    public function coupons(Request $request)
    {
        $this->requireAdmin($request);

        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->toDateString());
        $window = [$from . ' 00:00:00', $to . ' 23:59:59'];

        $base = fn () => Order::whereBetween('created_at', $window)
            ->where('status', '!=', Order::STATUS_CANCELLED);

        // Every order in the window, so "how many of our sales used a coupon"
        // has a denominator.
        $orderCount = (int) $base()->where('status', '!=', Order::STATUS_RETURNED)->count();

        $rows = $base()
            ->whereNotNull('coupon_code')
            ->where('coupon_code', '!=', '')
            ->select(
                'coupon_code as code',
                DB::raw('COUNT(*) as uses'),
                DB::raw('COALESCE(SUM(discount_amount), 0) as total_discount'),
                DB::raw('COALESCE(SUM(total_amount - COALESCE(refunded_amount, 0)), 0) as total_sales')
            )
            ->groupBy('coupon_code')
            ->orderByDesc('uses')
            ->get();

        $timeline = $base()
            ->whereNotNull('coupon_code')
            ->where('coupon_code', '!=', '')
            ->select(
                DB::raw('DATE(created_at) as day'),
                DB::raw('COUNT(*) as uses'),
                DB::raw('COALESCE(SUM(discount_amount), 0) as discount'),
                DB::raw('COALESCE(SUM(total_amount - COALESCE(refunded_amount, 0)), 0) as sales')
            )
            ->groupBy('day')->orderBy('day')->get();

        $known = Coupon::select('code', 'is_active', 'discount_percentage')->get()->keyBy('code');

        $performance = $rows->map(fn ($row) => [
            'code' => $row->code,
            'uses' => (int) $row->uses,
            'total_discount' => round((float) $row->total_discount),
            'total_sales' => round((float) $row->total_sales),
            'is_active' => (bool) ($known[$row->code]->is_active ?? false),
        ]);

        // Coupons that exist but were never redeemed in the window still belong
        // on the list — "nobody used it" is the useful answer about a coupon.
        $unused = $known->keys()
            ->diff($rows->pluck('code'))
            ->map(fn ($code) => [
                'code' => $code,
                'uses' => 0,
                'total_discount' => 0,
                'total_sales' => 0,
                'is_active' => (bool) ($known[$code]->is_active ?? false),
            ]);

        $totalUses = (int) $rows->sum('uses');
        $totalDiscount = round((float) $rows->sum('total_discount'));
        $totalSales = round((float) $rows->sum('total_sales'));

        return response()->json([
            'from' => $from,
            'to' => $to,
            'performance' => $performance->concat($unused)->values(),
            'timeline' => $timeline,
            'total_uses' => $totalUses,
            'total_discount' => $totalDiscount,
            'total_sales_with_coupons' => $totalSales,
            'order_count' => $orderCount,
            'conversion_rate' => $orderCount > 0 ? round($totalUses / $orderCount * 100, 1) : 0.0,
            // What share of the ticket the average redemption took off.
            'average_discount_percentage' => ($totalSales + $totalDiscount) > 0
                ? round($totalDiscount / ($totalSales + $totalDiscount) * 100, 1)
                : 0.0,
        ]);
    }
}
