<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CouponController extends Controller
{
    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    private function formatCoupon($coupon)
    {
        return [
            'id' => $coupon->id,
            'code' => $coupon->code,
            'discountPercentage' => (float) $coupon->discount_percentage,
            'isActive' => (bool) $coupon->is_active,
            'startDate' => $coupon->start_date,
            'endDate' => $coupon->end_date,
            'maxUses' => $coupon->max_uses,
            'maxUsesPerCustomer' => $coupon->max_uses_per_customer,
            'minOrderAmount' => (float) $coupon->min_order_amount,
            'timesUsed' => $coupon->timesUsed(),
        ];
    }

    public function index(Request $request)
    {
        // SECURITY: the full coupon list (including inactive/secret codes) is for
        // staff/admin only. Customers apply a single code via validateCode().
        $this->checkStaffOrAdmin($request);
        return response()->json(Coupon::all()->map(function($coupon) {
            return $this->formatCoupon($coupon);
        }));
    }

    /**
     * Public: validate a single coupon code without exposing the whole list.
     * Returns the coupon only when it is active and within its date window.
     */
    public function validateCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:255',
            'subtotal' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:255',
        ]);

        $coupon = Coupon::findRedeemable($request->code);

        if (!$coupon) {
            return response()->json(['valid' => false, 'message' => 'Invalid or expired coupon code'], 404);
        }

        // Check the same limits the order will enforce, so the basket never
        // shows a discount that checkout is going to refuse.
        $user = $request->user('sanctum');
        $problem = $coupon->redemptionProblem(
            (float) $request->input('subtotal', 0),
            $user->id ?? null,
            $request->input('phone') ?? ($user->phone ?? null)
        );

        if ($problem) {
            return response()->json([
                'valid' => false,
                'reason' => $problem,
                'message' => match ($problem) {
                    'min_order_amount' => 'ئەم کوپۆنە تەنها بۆ داواکاری سەرووی '
                        . number_format((float) $coupon->min_order_amount) . ' دینارە.',
                    'fully_used' => 'ئەم کوپۆنە بەتەواوی بەکارهێنراوە.',
                    'already_used_by_customer' => 'تۆ پێشتر ئەم کوپۆنەت بەکارهێناوە.',
                    default => 'ئەم کوپۆنە شیاو نییە.',
                },
            ], 422);
        }

        return response()->json(['valid' => true, 'coupon' => $this->formatCoupon($coupon)]);
    }

    public function store(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        if ($request->has('startDate')) {
            $request->merge(['start_date' => $request->input('startDate')]);
        }
        if ($request->has('endDate')) {
            $request->merge(['end_date' => $request->input('endDate')]);
        }
        if ($request->has('discountPercentage')) {
            $request->merge(['discount_percentage' => $request->input('discountPercentage')]);
        }
        if ($request->has('isActive')) {
            $request->merge(['is_active' => $request->input('isActive')]);
        }
        if ($request->has('maxUses')) {
            $request->merge(['max_uses' => $request->input('maxUses')]);
        }
        if ($request->has('maxUsesPerCustomer')) {
            $request->merge(['max_uses_per_customer' => $request->input('maxUsesPerCustomer')]);
        }
        if ($request->has('minOrderAmount')) {
            $request->merge(['min_order_amount' => $request->input('minOrderAmount')]);
        }

        $validated = $request->validate([
            'id' => 'string|nullable',
            'code' => 'required|string|unique:coupons',
            'discount_percentage' => 'required|numeric|min:0|max:100',
            'is_active' => 'boolean',
            'start_date' => 'date|nullable',
            'end_date' => 'date|nullable',
            'max_uses' => 'nullable|integer|min:1',
            'max_uses_per_customer' => 'nullable|integer|min:1',
            'min_order_amount' => 'nullable|numeric|min:0',
        ]);

        if (empty($validated['id'])) {
            $validated['id'] = Str::random(9);
        }

        $coupon = Coupon::create($validated);
        return response()->json($this->formatCoupon($coupon), 201);
    }

    public function show($id)
    {
        $coupon = Coupon::findOrFail($id);
        return response()->json($this->formatCoupon($coupon));
    }

    public function update(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        $coupon = Coupon::findOrFail($id);

        if ($request->has('startDate')) {
            $request->merge(['start_date' => $request->input('startDate')]);
        }
        if ($request->has('endDate')) {
            $request->merge(['end_date' => $request->input('endDate')]);
        }
        if ($request->has('discountPercentage')) {
            $request->merge(['discount_percentage' => $request->input('discountPercentage')]);
        }
        if ($request->has('isActive')) {
            $request->merge(['is_active' => $request->input('isActive')]);
        }
        if ($request->has('maxUses')) {
            $request->merge(['max_uses' => $request->input('maxUses')]);
        }
        if ($request->has('maxUsesPerCustomer')) {
            $request->merge(['max_uses_per_customer' => $request->input('maxUsesPerCustomer')]);
        }
        if ($request->has('minOrderAmount')) {
            $request->merge(['min_order_amount' => $request->input('minOrderAmount')]);
        }

        $validated = $request->validate([
            'code' => 'string|unique:coupons,code,' . $id,
            'discount_percentage' => 'numeric|min:0|max:100',
            'is_active' => 'boolean',
            'start_date' => 'date|nullable',
            'end_date' => 'date|nullable',
            'max_uses' => 'nullable|integer|min:1',
            'max_uses_per_customer' => 'nullable|integer|min:1',
            'min_order_amount' => 'nullable|numeric|min:0',
        ]);

        $coupon->update($validated);
        return response()->json($this->formatCoupon($coupon));
    }

    public function destroy(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        $coupon = Coupon::findOrFail($id);
        $coupon->delete();
        return response()->json(null, 204);
    }
}
