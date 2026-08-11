<?php

namespace App\Http\Controllers;

use App\Models\ProductVariation;
use App\Models\StockMovement;
use App\Support\ActivityLogger;
use App\Support\StockLedger;
use Illuminate\Http\Request;

class ProductVariationController extends Controller
{
    public function index(Request $request)
    {
        $query = ProductVariation::query();

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        return response()->json($query->get());
    }

    public function show($id)
    {
        $variation = ProductVariation::with('product')->findOrFail($id);
        return response()->json($variation);
    }

    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    public function store(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'color' => 'required|string|max:255',
            'size' => 'required|string|max:255',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => 'required|string|unique:product_variations,sku',
            'price_override' => 'nullable|numeric|min:0',
        ]);

        $variation = ProductVariation::create($request->all());

        // Opening balance, so the ledger starts from a known point.
        if ((int) $variation->stock_quantity > 0) {
            StockMovement::create([
                'product_variation_id' => $variation->id,
                'product_id' => $variation->product_id,
                'type' => StockMovement::TYPE_INITIAL,
                'quantity_change' => (int) $variation->stock_quantity,
                'quantity_after' => (int) $variation->stock_quantity,
                'user_id' => $request->user()->id,
                'note' => 'Variant created',
            ]);
        }

        return response()->json($variation, 201);
    }

    public function update(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        $variation = ProductVariation::findOrFail($id);

        $request->validate([
            'product_id' => 'sometimes|required|exists:products,id',
            'color' => 'sometimes|required|string|max:255',
            'size' => 'sometimes|required|string|max:255',
            'stock_quantity' => 'sometimes|required|integer|min:0',
            'sku' => 'sometimes|required|string|unique:product_variations,sku,' . $id,
            'price_override' => 'nullable|numeric|min:0',
        ]);

        $before = (int) $variation->stock_quantity;

        // Stock is changed through the ledger, everything else directly, so an
        // edit that happens to touch the quantity is still explained.
        $variation->update(collect($request->all())->except('stock_quantity')->all());

        if ($request->has('stock_quantity')) {
            StockLedger::setLevel(
                $variation,
                (int) $request->input('stock_quantity'),
                StockMovement::TYPE_ADJUSTMENT,
                $request->input('note') ?: 'Edited from the product form',
                $request->user()->id
            );
        }

        if ($before !== (int) $variation->fresh()->stock_quantity) {
            ActivityLogger::log(
                'stock.adjustment',
                'variation',
                $variation->id,
                'Stock ' . $before . ' → ' . $variation->fresh()->stock_quantity
            );
        }

        return response()->json($variation->fresh());
    }

    public function destroy(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        ProductVariation::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
