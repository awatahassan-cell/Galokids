<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use App\Support\ActivityLogger;
use App\Support\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $this->requirePrivileged($request);

        $query = Purchase::with(['items.product', 'items.variation', 'user:id,name'])
            ->orderByDesc('purchase_date')
            ->orderByDesc('id');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('supplier_phone', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($request->filled('supplier_name')) {
            $query->where('supplier_name', 'like', '%' . $request->supplier_name . '%');
        }

        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('from')) {
            $query->where('purchase_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('purchase_date', '<=', $request->to);
        }

        if ($request->has('page')) {
            $limit = max(1, min((int) $request->input('limit', 20), 100));
            return response()->json($query->paginate($limit));
        }

        // No page asked for: still bounded. Every row here drags its items,
        // their products and their variations along with it, so a shop with a
        // few years of buying behind it would otherwise build the whole
        // purchase history into one response.
        return response()->json($query->limit(500)->get());
    }

    public function show(Request $request, $id)
    {
        $this->requirePrivileged($request);
        $purchase = Purchase::with(['items.product', 'items.variation', 'user:id,name'])->findOrFail($id);
        return response()->json($purchase);
    }

    public function store(Request $request)
    {
        $user = $this->requirePrivileged($request);

        $validated = $request->validate([
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'supplier_name' => 'required|string|max:255',
            'supplier_phone' => 'nullable|string|max:50',
            'purchase_date' => 'required|date',
            'payment_status' => 'nullable|string|in:paid,partial,unpaid',
            'payment_method' => 'nullable|string|max:50',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.product_variation_id' => 'required|integer|exists:product_variations,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.retail_price' => 'nullable|numeric|min:0',
        ]);

        $purchase = DB::transaction(function () use ($validated, $user) {
            $invoiceNumber = 'PUR-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += ($item['quantity'] * $item['cost_price']);
            }

            // Paying more than the invoice is worth is a typo, not a purchase.
            // Left through, it read back as the supplier owing the shop money.
            $paidAmount = isset($validated['paid_amount']) ? (float) $validated['paid_amount'] : $totalAmount;
            $paidAmount = min($paidAmount, $totalAmount);

            // The status has to follow the money, whatever the form said. A
            // form claiming "paid" against nothing paid left an invisible debt.
            $paymentStatus = $paidAmount >= $totalAmount ? 'paid' : ($paidAmount > 0 ? 'partial' : 'unpaid');

            $supplierId = $validated['supplier_id'] ?? null;
            if (!$supplierId && !empty($validated['supplier_name'])) {
                $existing = \App\Models\Supplier::where('name', $validated['supplier_name'])->first();
                if ($existing) {
                    $supplierId = $existing->id;
                } else {
                    $newSup = \App\Models\Supplier::create([
                        'name' => $validated['supplier_name'],
                        'phone' => $validated['supplier_phone'] ?? null,
                    ]);
                    $supplierId = $newSup->id;
                }
            }

            $purchase = Purchase::create([
                'invoice_number' => $invoiceNumber,
                'supplier_id' => $supplierId,
                'supplier_name' => $validated['supplier_name'],
                'supplier_phone' => $validated['supplier_phone'] ?? null,
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_status' => $paymentStatus,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'notes' => $validated['notes'] ?? null,
                'user_id' => $user->id,
            ]);

            foreach ($validated['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $variation = ProductVariation::lockForUpdate()->findOrFail($itemData['product_variation_id']);

                $previousCost = (float)($product->cost ?? 0);
                $newCost = (float)$itemData['cost_price'];

                $previousPrice = (float)($product->price ?? 0);
                $newPrice = isset($itemData['retail_price']) && $itemData['retail_price'] > 0 
                    ? (float)$itemData['retail_price'] 
                    : $previousPrice;

                $subtotal = $itemData['quantity'] * $newCost;

                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $product->id,
                    'product_variation_id' => $variation->id,
                    'quantity' => $itemData['quantity'],
                    'previous_cost' => $previousCost,
                    'cost_price' => $newCost,
                    'previous_price' => $previousPrice,
                    'retail_price' => $newPrice,
                    'subtotal' => $subtotal,
                ]);

                // Put the goods on the shelf. Once — through the ledger, which
                // applies the change itself as well as recording it.
                //
                // This used to `increment()` first and then call the ledger,
                // and `increment()` updates the model in memory as well as the
                // row, so the ledger added the quantity a second time on top of
                // the new level: buying ten pieces put twenty into stock.
                StockLedger::move(
                    $variation,
                    (int) $itemData['quantity'],
                    StockMovement::TYPE_PURCHASE,
                    "کڕین لە {$purchase->supplier_name} (پسوولە: #{$purchase->invoice_number})",
                    null,
                    $user->id
                );

                // Update product cost and selling price if changed
                $productUpdates = [];
                if ($newCost > 0 && $newCost != $previousCost) {
                    $productUpdates['cost'] = $newCost;
                }
                if ($newPrice > 0 && $newPrice != $previousPrice) {
                    $productUpdates['price'] = $newPrice;
                }
                if (!empty($productUpdates)) {
                    $product->update($productUpdates);
                }
            }

            return $purchase;
        });

        ActivityLogger::log('purchase.created', 'purchase', $purchase->id, "کڕینی نوێ لە {$purchase->supplier_name} بە کۆی {$purchase->total_amount}");

        return response()->json($purchase->load(['items.product', 'items.variation', 'user:id,name']), 201);
    }

    /**
     * Delete a purchase and take its goods back off the shelf.
     *
     * The row used to be deleted on its own. The stock it had added stayed
     * behind with nothing left to explain it, so a mis-keyed invoice — the
     * whole reason to delete one — left phantom pieces in the count for good.
     */
    public function destroy(Request $request, $id)
    {
        $user = $this->requirePrivileged($request);
        $purchase = Purchase::with('items')->findOrFail($id);

        DB::transaction(function () use ($purchase, $user) {
            foreach ($purchase->items as $item) {
                if (!$item->product_variation_id) {
                    continue;
                }

                $variation = ProductVariation::lockForUpdate()->find($item->product_variation_id);
                if (!$variation) {
                    continue;
                }

                StockLedger::move(
                    $variation,
                    -1 * (int) $item->quantity,
                    StockMovement::TYPE_PURCHASE,
                    "سڕینەوەی پسوولەی کڕین #{$purchase->invoice_number}",
                    null,
                    $user->id
                );
            }

            // The cost and selling price the purchase wrote onto the product
            // are left alone on purpose: later purchases and hand edits may
            // have moved them since, and rolling back to a stale figure would
            // be a worse guess than leaving the current one.
            $purchase->delete();
        });

        ActivityLogger::log('purchase.deleted', 'purchase', $id, "سڕینەوەی پسوولەی کڕین #{$purchase->invoice_number}");

        return response()->json(['message' => 'Purchase deleted successfully']);
    }
}
