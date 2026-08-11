<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Coupon;
use App\Models\Expense;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Support\ActivityLogger;
use App\Support\Roles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Deleting many rows at once.
 *
 * Every route here is ADMIN ONLY — deliberately stricter than the single-row
 * deletes, which cashiers and staff may use. One mis-click in a bulk action
 * removes dozens of records, so the ability to make that mistake is kept to
 * the account that owns the shop.
 *
 * Each handler reports how many rows it actually removed and why any were
 * skipped, so the panel can tell the truth instead of claiming success.
 */
class BulkActionController extends Controller
{
    /** Ids to act on, capped so one request can't try to wipe the table. */
    private function ids(Request $request): array
    {
        $data = $request->validate([
            'ids'   => 'required|array|min:1|max:500',
            'ids.*' => 'required',
        ]);

        return array_values(array_unique(array_map('strval', $data['ids'])));
    }

    public function products(Request $request)
    {
        $this->requireAdmin($request);
        $ids = $this->ids($request);

        $products = Product::whereIn('id', $ids)->get();
        if ($products->isEmpty()) {
            return response()->json(['deleted' => 0, 'skipped' => [], 'message' => 'Nothing matched.']);
        }

        $names = $products->pluck('name')->take(10)->all();

        DB::transaction(function () use ($products) {
            foreach ($products as $product) {
                $product->delete();
            }
        });

        ActivityLogger::log(
            'product.bulk_deleted',
            'product',
            null,
            $products->count() . ' products deleted: ' . implode(', ', $names)
        );

        return response()->json(['deleted' => $products->count(), 'skipped' => []]);
    }

    public function orders(Request $request)
    {
        $this->requireAdmin($request);
        $ids = $this->ids($request);

        $orders = Order::whereIn('id', $ids)->get();
        if ($orders->isEmpty()) {
            return response()->json(['deleted' => 0, 'skipped' => [], 'message' => 'Nothing matched.']);
        }

        $invoices = $orders->map(fn ($o) => $o->invoice_no ?: ('#' . $o->id))->take(10)->all();

        DB::transaction(function () use ($orders) {
            foreach ($orders as $order) {
                $order->delete();
            }
        });

        ActivityLogger::log(
            'order.bulk_deleted',
            'order',
            null,
            $orders->count() . ' orders deleted: ' . implode(', ', $invoices)
        );

        return response()->json(['deleted' => $orders->count(), 'skipped' => []]);
    }

    /**
     * Users are the dangerous one. Three rows are refused outright:
     * the acting admin's own account, and any deletion that would leave the
     * shop with no admin at all.
     */
    public function users(Request $request)
    {
        $actor = $this->requireAdmin($request);
        $ids = $this->ids($request);

        $users = User::whereIn('id', $ids)->get();
        if ($users->isEmpty()) {
            return response()->json(['deleted' => 0, 'skipped' => [], 'message' => 'Nothing matched.']);
        }

        $skipped = [];
        $deletable = [];

        // How many admins exist outside this selection. If that is zero, the
        // selection cannot be allowed to take every admin with it.
        $selectedAdminIds = $users->filter(fn ($u) => $u->isAdmin())->pluck('id')->all();
        $adminsOutsideSelection = User::where('role', Roles::ADMIN)
            ->whereNotIn('id', $selectedAdminIds ?: [0])
            ->count();
        $adminBudget = $adminsOutsideSelection > 0 ? count($selectedAdminIds) : max(0, count($selectedAdminIds) - 1);

        foreach ($users as $user) {
            if ((string) $user->id === (string) $actor->id) {
                $skipped[] = ['id' => $user->id, 'name' => $user->name, 'reason' => 'self'];
                continue;
            }

            if ($user->isAdmin()) {
                if ($adminBudget <= 0) {
                    $skipped[] = ['id' => $user->id, 'name' => $user->name, 'reason' => 'last_admin'];
                    continue;
                }
                $adminBudget--;
            }

            $deletable[] = $user;
        }

        DB::transaction(function () use ($deletable) {
            foreach ($deletable as $user) {
                $user->delete();
            }
        });

        if ($deletable) {
            ActivityLogger::log(
                'user.bulk_deleted',
                'user',
                null,
                count($deletable) . ' users deleted: '
                    . implode(', ', array_slice(array_map(fn ($u) => $u->name, $deletable), 0, 10))
            );
        }

        return response()->json(['deleted' => count($deletable), 'skipped' => $skipped]);
    }

    public function categories(Request $request)
    {
        $this->requireAdmin($request);
        $ids = $this->ids($request);

        $categories = Category::whereIn('id', $ids)->get();
        $skipped = [];
        $deletable = [];

        foreach ($categories as $category) {
            // Removing a category that still holds products would orphan them
            // in the catalogue, so those are refused and reported.
            $inUse = Product::where('category_id', $category->id)->count();
            if ($inUse > 0) {
                $skipped[] = ['id' => $category->id, 'name' => $category->name, 'reason' => 'has_products', 'count' => $inUse];
                continue;
            }
            $deletable[] = $category;
        }

        DB::transaction(function () use ($deletable) {
            foreach ($deletable as $category) {
                $category->delete();
            }
        });

        if ($deletable) {
            ActivityLogger::log('category.bulk_deleted', 'category', null, count($deletable) . ' categories deleted');
        }

        return response()->json(['deleted' => count($deletable), 'skipped' => $skipped]);
    }

    public function reviews(Request $request)
    {
        $this->requireAdmin($request);
        $ids = $this->ids($request);

        $count = Review::whereIn('id', $ids)->delete();
        ActivityLogger::log('review.bulk_deleted', 'review', null, $count . ' reviews deleted');

        return response()->json(['deleted' => $count, 'skipped' => []]);
    }

    public function coupons(Request $request)
    {
        $this->requireAdmin($request);
        $ids = $this->ids($request);

        $count = Coupon::whereIn('id', $ids)->delete();
        ActivityLogger::log('coupon.bulk_deleted', 'coupon', null, $count . ' coupons deleted');

        return response()->json(['deleted' => $count, 'skipped' => []]);
    }

    public function expenses(Request $request)
    {
        $this->requireAdmin($request);
        $ids = $this->ids($request);

        $count = Expense::whereIn('id', $ids)->delete();
        ActivityLogger::log('expense.bulk_deleted', 'expense', null, $count . ' expenses deleted');

        return response()->json(['deleted' => $count, 'skipped' => []]);
    }

    /**
     * Move several orders to one status in a single request — the other bulk
     * action a shop actually needs (confirming a morning's orders at once).
     */
    public function orderStatus(Request $request)
    {
        $this->requireAdmin($request);

        $data = $request->validate([
            'ids'    => 'required|array|min:1|max:500',
            'status' => 'required|string|in:pending,processing,shipped,delivered,cancelled',
        ]);

        $orders = Order::whereIn('id', $data['ids'])->get();
        $changed = 0;

        foreach ($orders as $order) {
            if ($order->status === $data['status']) {
                continue;
            }
            $order->status = $data['status'];
            $order->save();
            $changed++;
        }

        if ($changed) {
            ActivityLogger::log(
                'order.bulk_status',
                'order',
                null,
                $changed . ' orders set to ' . $data['status']
            );
        }

        return response()->json(['updated' => $changed, 'skipped' => []]);
    }
}
