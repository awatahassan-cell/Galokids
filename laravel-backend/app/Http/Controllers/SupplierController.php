<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $this->requirePermission($request, 'purchases.manage');

        $query = Supplier::withCount('purchases')
            ->withSum('purchases', 'total_amount')
            ->withSum('purchases', 'paid_amount')
            // Money handed over without naming an invoice. The debt used to be
            // read off the invoices alone, so paying a supplier from the
            // accounts screen — which never names one — left the balance
            // exactly where it was.
            ->withSum(['payments as direct_payments_sum' => fn ($q) => $q->whereNull('purchase_id')], 'amount')
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->get()->map(function ($s) {
            $totalPurchases = (float) ($s->purchases_sum_total_amount ?? 0);
            $invoicePaid = (float) ($s->purchases_sum_paid_amount ?? 0);
            $directPaid = (float) ($s->direct_payments_sum ?? 0);
            $totalPaid = $invoicePaid + $directPaid;
            $openingBalance = (float) ($s->opening_balance ?? 0);
            $debt = ($openingBalance + $totalPurchases) - $totalPaid;

            return [
                'id' => $s->id,
                'name' => $s->name,
                'company' => $s->company,
                'contact_person' => $s->contact_person,
                'phone' => $s->phone,
                'email' => $s->email,
                'address' => $s->address,
                'opening_balance' => $openingBalance,
                'notes' => $s->notes,
                'purchases_count' => $s->purchases_count,
                'total_purchases' => $totalPurchases,
                'total_paid' => $totalPaid,
                'invoice_paid' => $invoicePaid,
                'direct_paid' => $directPaid,
                // Kept signed. Clamping at zero hid overpayment, which is the
                // one number a shop needs to see: it means either a mistake to
                // undo or credit to spend on the next order.
                'debt_balance' => round($debt, 2),
                'created_at' => $s->created_at,
            ];
        });

        return response()->json($suppliers);
    }

    public function show(Request $request, $id)
    {
        $this->requirePermission($request, 'purchases.manage');

        $supplier = Supplier::with([
            'purchases' => function ($q) {
                $q->with('items.product', 'items.variation')->orderByDesc('purchase_date');
            },
            'payments' => function ($q) {
                $q->with('user:id,name')->orderByDesc('payment_date');
            }
        ])->findOrFail($id);

        // The same figures the list shows, sent alongside the statement so the
        // two screens cannot disagree about what is owed.
        $totalPurchases = (float) $supplier->purchases->sum('total_amount');
        $invoicePaid = (float) $supplier->purchases->sum('paid_amount');
        $directPaid = (float) $supplier->payments->whereNull('purchase_id')->sum('amount');
        $totalPaid = $invoicePaid + $directPaid;

        return response()->json(array_merge($supplier->toArray(), [
            'total_purchases' => $totalPurchases,
            'total_paid' => $totalPaid,
            'invoice_paid' => $invoicePaid,
            'direct_paid' => $directPaid,
            'debt_balance' => round(((float) $supplier->opening_balance + $totalPurchases) - $totalPaid, 2),
        ]));
    }

    public function store(Request $request)
    {
        $this->requirePermission($request, 'purchases.manage');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $supplier = Supplier::create($validated);
        ActivityLogger::log('supplier.created', 'supplier', $supplier->id, "دروستکردنی هەژماری سەپلایەر {$supplier->name}");

        return response()->json($supplier, 201);
    }

    public function update(Request $request, $id)
    {
        $this->requirePermission($request, 'purchases.manage');
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'opening_balance' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $supplier->update($validated);
        ActivityLogger::log('supplier.updated', 'supplier', $supplier->id, "دەستکاریکردنی زانیاری سەپلایەر {$supplier->name}");

        return response()->json($supplier);
    }

    /**
     * Delete a supplier that has no history behind it.
     *
     * Deleting one with history quietly destroyed the account: the payments
     * cascade away with it while the purchases stay, having only lost the
     * name they were bought from — so the debt disappeared and the invoices
     * it was owed against remained.
     */
    public function destroy(Request $request, $id)
    {
        $this->requirePermission($request, 'purchases.manage');
        $supplier = Supplier::withCount(['purchases', 'payments'])->findOrFail($id);

        if ($supplier->purchases_count > 0 || $supplier->payments_count > 0) {
            return response()->json([
                'message' => 'ناتوانرێت ئەم سەپلایەرە بسڕدرێتەوە: کڕین یان پارەدانی تۆمارکراوی هەیە.',
                'purchases_count' => $supplier->purchases_count,
                'payments_count' => $supplier->payments_count,
            ], 409);
        }

        $supplier->delete();

        ActivityLogger::log('supplier.deleted', 'supplier', $id, "سڕینەوەی هەژماری سەپلایەر {$supplier->name}");

        return response()->json(['message' => 'Supplier deleted successfully']);
    }

    public function recordPayment(Request $request, $id)
    {
        $user = $this->requirePermission($request, 'purchases.manage');
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'payment_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
            'purchase_id' => 'nullable|integer|exists:purchases,id',
        ]);

        $payment = DB::transaction(function () use ($supplier, $validated, $user) {
            $p = SupplierPayment::create([
                'supplier_id' => $supplier->id,
                'purchase_id' => $validated['purchase_id'] ?? null,
                'amount' => $validated['amount'],
                'payment_date' => $validated['payment_date'],
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'user_id' => $user->id,
            ]);

            // Named an invoice: settle it there, and the payment stops counting
            // as money on account so it is not subtracted from the debt twice.
            if (!empty($validated['purchase_id'])) {
                $purchase = \App\Models\Purchase::where('supplier_id', $supplier->id)
                    ->find($validated['purchase_id']);

                if ($purchase) {
                    $newPaid = min((float) $purchase->paid_amount + (float) $validated['amount'], (float) $purchase->total_amount);
                    $newStatus = $newPaid >= $purchase->total_amount ? 'paid' : ($newPaid > 0 ? 'partial' : 'unpaid');
                    $purchase->update([
                        'paid_amount' => $newPaid,
                        'payment_status' => $newStatus,
                    ]);
                } else {
                    // The invoice is not this supplier's. Keep the money on the
                    // account rather than posting it against someone else's.
                    $p->update(['purchase_id' => null]);
                }
            }

            return $p;
        });

        ActivityLogger::log('supplier.payment', 'supplier', $supplier->id, "پارەدان بە بڕی {$validated['amount']} بە سەپلایەر {$supplier->name}");

        return response()->json($payment, 201);
    }
}
