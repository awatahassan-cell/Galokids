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
        $request->validate(['code' => 'required|string|max:255']);

        $coupon = Coupon::findRedeemable($request->code);

        if (!$coupon) {
            return response()->json(['valid' => false, 'message' => 'Invalid or expired coupon code'], 404);
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

        $validated = $request->validate([
            'id' => 'string|nullable',
            'code' => 'required|string|unique:coupons',
            'discount_percentage' => 'required|numeric|min:0|max:100',
            'is_active' => 'boolean',
            'start_date' => 'date|nullable',
            'end_date' => 'date|nullable',
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

        $validated = $request->validate([
            'code' => 'string|unique:coupons,code,' . $id,
            'discount_percentage' => 'numeric|min:0|max:100',
            'is_active' => 'boolean',
            'start_date' => 'date|nullable',
            'end_date' => 'date|nullable',
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
