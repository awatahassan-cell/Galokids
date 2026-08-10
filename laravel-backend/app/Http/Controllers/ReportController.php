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
            ->where('status', '!=', 'cancelled')
            ->leftJoin('users', 'orders.user_id', '=', 'users.id')
            ->select(
                'orders.user_id',
                DB::raw("COALESCE(users.name, 'Unknown') as name"),
                DB::raw('COUNT(*) as orders_count'),
                DB::raw('SUM(orders.total_amount) - SUM(COALESCE(orders.refunded_amount, 0)) as total'),
                DB::raw("SUM(CASE WHEN orders.channel = 'pos' THEN orders.total_amount ELSE 0 END) as pos_total"),
                DB::raw("SUM(CASE WHEN orders.channel = 'online' THEN orders.total_amount ELSE 0 END) as online_total")
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

        $ordersQuery = Order::whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->where('status', '!=', 'cancelled');
        if ($request->filled('channel')) {
            $ordersQuery->where('channel', $request->channel);
        }

        // Aggregate in SQL. The previous version loaded every order in the range
        // into PHP and then passed the whole id list into `whereIn(...)` — which
        // grows without bound and eventually breaks the query.
        $totals = (clone $ordersQuery)
            ->selectRaw('COUNT(*) as order_count')
            ->selectRaw('COALESCE(SUM(total_amount), 0) as revenue')
            ->selectRaw('COALESCE(SUM(refunded_amount), 0) as refunded')
            ->first();

        $orderCount = (int) ($totals->order_count ?? 0);
        $grossRevenue = (float) ($totals->revenue ?? 0);
        $refunded = (float) ($totals->refunded ?? 0);

        // Money actually kept: refunds were handed back to the customer, so the
        // old figure overstated revenue on every partially refunded order.
        $revenue = $grossRevenue - $refunded;

        // Reusable "orders inside the window" filter for the item-level queries.
        $inWindow = function ($query) use ($from, $to, $request) {
            $query->select('id')->from('orders')
                ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->where('status', '!=', 'cancelled');
            if ($request->filled('channel')) {
                $query->where('channel', $request->channel);
            }
        };

        $itemsSold = (int) OrderItem::whereIn('order_id', $inWindow)->sum('quantity');

        // Estimated cost of goods sold using each product's current cost.
        $cogs = (float) OrderItem::whereIn('order_items.order_id', $inWindow)
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->sum(DB::raw('COALESCE(products.cost, 0) * order_items.quantity'));

        $expenses = (float) Expense::whereBetween('date', [$from, $to])->sum('amount');

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
                DB::raw('SUM(order_items.quantity) as qty'),
                DB::raw('SUM(order_items.price * order_items.quantity) as revenue'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')->limit(10)->get();

        return response()->json([
            'from' => $from,
            'to' => $to,
            'revenue' => round($revenue),
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
