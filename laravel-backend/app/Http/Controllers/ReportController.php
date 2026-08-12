<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Expense;
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
        $net = 'MAX(order_items.quantity - order_items.returned_quantity, 0)';
        if (DB::connection()->getDriverName() === 'mysql') {
            $net = 'GREATEST(order_items.quantity - order_items.returned_quantity, 0)';
        }

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
}
