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
        $this->requirePrivileged($request);

        $query = Supplier::withCount('purchases')
            ->withSum('purchases', 'total_amount')
            ->withSum('purchases', 'paid_amount')
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
            $totalPurchases = (float)($s->purchases_sum_total_amount ?? 0);
            $totalPaid = (float)($s->purchases_sum_paid_amount ?? 0);
            $openingBalance = (float)($s->opening_balance ?? 0);
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
                'debt_balance' => max(0, $debt),
                'created_at' => $s->created_at,
            ];
        });

        return response()->json($suppliers);
    }

    public function show(Request $request, $id)
    {
        $this->requirePrivileged($request);

        $supplier = Supplier::with([
            'purchases' => function ($q) {
                $q->with('items.product', 'items.variation')->orderByDesc('purchase_date');
            },
            'payments' => function ($q) {
                $q->with('user:id,name')->orderByDesc('payment_date');
            }
        ])->findOrFail($id);

        return response()->json($supplier);
    }

    public function store(Request $request)
    {
        $this->requirePrivileged($request);

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
        $this->requirePrivileged($request);
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

    public function destroy(Request $request, $id)
    {
        $this->requirePrivileged($request);
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        ActivityLogger::log('supplier.deleted', 'supplier', $id, "سڕینەوەی هەژماری سەپلایەر {$supplier->name}");

        return response()->json(['message' => 'Supplier deleted successfully']);
    }

    public function recordPayment(Request $request, $id)
    {
        $user = $this->requirePrivileged($request);
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

            // If linked to a specific purchase, update that purchase's paid_amount
            if (!empty($validated['purchase_id'])) {
                $purchase = \App\Models\Purchase::find($validated['purchase_id']);
                if ($purchase) {
                    $newPaid = $purchase->paid_amount + $validated['amount'];
                    $newStatus = $newPaid >= $purchase->total_amount ? 'paid' : ($newPaid > 0 ? 'partial' : 'unpaid');
                    $purchase->update([
                        'paid_amount' => $newPaid,
                        'payment_status' => $newStatus,
                    ]);
                }
            }

            return $p;
        });

        ActivityLogger::log('supplier.payment', 'supplier', $supplier->id, "پارەدان بە بڕی {$validated['amount']} بە سەپلایەر {$supplier->name}");

        return response()->json($payment, 201);
    }
}
