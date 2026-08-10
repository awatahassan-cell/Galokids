<?php

namespace App\Http\Controllers;

use App\Models\ProductVariation;
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

        $variation->update($request->all());
        return response()->json($variation);
    }

    public function destroy(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        ProductVariation::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
