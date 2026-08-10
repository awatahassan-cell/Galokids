<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Product;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $query = Review::with('product')->orderBy('created_at', 'desc');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        // Paginate: this used to return every review ever written, with the
        // full product attached to each one.
        $limit = max(1, min((int) $request->input('limit', 20), 100));

        return response()->json($query->paginate($limit));
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
            'customer_name' => 'nullable|string|max:255',
        ]);

        $user = $request->user('sanctum');

        // A review is "verified" when the signed-in user has actually bought the
        // product (an order of theirs contains it).
        $verified = false;
        if ($user) {
            $verified = \App\Models\OrderItem::where('product_id', $request->product_id)
                ->whereHas('order', function ($q) use ($user) {
                    $q->where('user_id', $user->id)->where('status', '!=', 'cancelled');
                })->exists();
        }

        $attributes = [
            'customer_name' => $user ? $user->name : ($request->customer_name ?? 'Guest'),
            'rating' => (int) $request->rating,
            'comment' => $request->comment,
            'verified_purchase' => $verified,
        ];

        // One review per customer per product. A signed-in shopper who reviews
        // the same product again is editing their opinion, not adding a second
        // vote — posting repeatedly used to let one person move a product's
        // rating as far as they liked.
        if ($user) {
            $existing = Review::where('product_id', $request->product_id)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                $existing->update($attributes);

                return response()->json($existing->load('product'), 200);
            }
        }

        $review = Review::create(array_merge($attributes, [
            'product_id' => $request->product_id,
            'user_id' => $user ? $user->id : null,
        ]));

        return response()->json($review->load('product'), 201);
    }

    public function destroy(Request $request, $id)
    {
        $this->requirePrivileged($request);

        $review = Review::findOrFail($id);
        $review->delete();

        return response()->json(null, 204);
    }
}
