<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Product;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        // Load with product info so admin panel/reviews dashboard can show product details
        $reviews = Review::with('product')->orderBy('created_at', 'desc')->get();
        return response()->json($reviews);
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

        $review = Review::create([
            'product_id' => $request->product_id,
            'user_id' => $user ? $user->id : null,
            'customer_name' => $user ? $user->name : ($request->customer_name ?? 'Guest'),
            'rating' => (int)$request->rating,
            'comment' => $request->comment,
            'verified_purchase' => $verified,
        ]);

        // Load the relationship for response
        $review->load('product');

        return response()->json($review, 201);
    }

    public function destroy(Request $request, $id)
    {
        $this->requirePrivileged($request);

        $review = Review::findOrFail($id);
        $review->delete();

        return response()->json(null, 204);
    }
}
