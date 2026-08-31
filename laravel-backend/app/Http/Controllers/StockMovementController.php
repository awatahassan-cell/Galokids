<?php

namespace App\Http\Controllers;

use App\Models\ProductVariation;
use App\Models\StockMovement;
use App\Support\ActivityLogger;
use App\Support\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    /** The stock ledger, newest first, filterable by product or type. */
    public function index(Request $request)
    {
        $this->requirePermission($request, 'inventory.view');

        $request->validate([
            'product_id' => 'nullable|integer',
            'product_variation_id' => 'nullable|integer',
            'type' => 'nullable|string|max:20',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $query = StockMovement::with(['product:id,name,name_ku,name_ar', 'variation:id,color,size', 'user:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }
        if ($request->filled('product_variation_id')) {
            $query->where('product_variation_id', $request->input('product_variation_id'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from') . ' 00:00:00');
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to') . ' 23:59:59');
        }

        $limit = max(1, min((int) $request->input('limit', 50), 200));

        return response()->json($query->paginate($limit));
    }

    /**
     * Correct a stock level by hand (stock-take, damage, found items).
     * Recorded with a reason so the ledger explains itself.
     */
    public function store(Request $request)
    {
        $user = $this->requirePermission($request, 'inventory.manage');

        $data = $request->validate([
            'product_variation_id' => 'required|integer|exists:product_variations,id',
            // Either set an absolute counted level, or apply a relative change.
            'counted_quantity' => 'required_without:quantity_change|nullable|integer|min:0',
            'quantity_change' => 'required_without:counted_quantity|nullable|integer',
            'type' => 'nullable|string|in:adjustment,purchase,count',
            'note' => 'required|string|max:500',
        ]);

        $movement = DB::transaction(function () use ($data, $user) {
            $variation = ProductVariation::lockForUpdate()->findOrFail($data['product_variation_id']);
            $type = $data['type'] ?? StockMovement::TYPE_ADJUSTMENT;

            if (isset($data['counted_quantity'])) {
                return StockLedger::setLevel(
                    $variation,
                    (int) $data['counted_quantity'],
                    $type,
                    $data['note'],
                    $user->id
                );
            }

            return StockLedger::move(
                $variation,
                (int) $data['quantity_change'],
                $type,
                $data['note'],
                null,
                $user->id
            );
        });

        if (!$movement) {
            return response()->json(['message' => 'Stock already matches that quantity.'], 200);
        }

        ActivityLogger::log(
            'stock.' . $movement->type,
            'variation',
            $movement->product_variation_id,
            $data['note'],
            ['quantity' => [
                $movement->quantity_after - $movement->quantity_change,
                $movement->quantity_after,
            ]]
        );

        return response()->json($movement->load(['product:id,name', 'variation:id,color,size']), 201);
    }
}
