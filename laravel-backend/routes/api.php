<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductVariationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\OtpController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public OTP Verification routes
Route::post('/send-otp', [OtpController::class, 'sendOtp'])->middleware('throttle:15,1');
Route::post('/verify-otp', [OtpController::class, 'verifyOtp'])->middleware('throttle:20,1');

// Public Authentication routes
// SECURITY: throttle to slow down brute-force / credential-stuffing attacks.
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
// Requires the single-use verification_token returned by /verify-otp.
Route::post('/login-with-phone', [AuthController::class, 'phoneLoginOrRegister'])->middleware('throttle:15,1');
// Does this mobile number already have an account? Used by the login/register
// screens so a customer on a new device gets the right prompt.
Route::post('/auth/phone-status', [AuthController::class, 'phoneStatus'])->middleware('throttle:20,1');

// Public resource routes
Route::get('/products/best-sellers', [ProductController::class, 'bestSellers']);
// Public: serve uploaded product images through Laravel (host-agnostic URL)
Route::get('/media/products/{name}', [ProductController::class, 'media']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);
// Public: validate a single coupon code (does not expose the full list)
Route::post('/coupons/validate', [\App\Http\Controllers\CouponController::class, 'validateCode'])->middleware('throttle:30,1');
// Public order tracking (needs order id + matching phone)
Route::get('/orders/track', [OrderController::class, 'track'])->middleware('throttle:30,1');

// Public store settings (name/logo/address for receipts, etc.)
Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'index']);

Route::get('/reviews', [ReviewController::class, 'index']);
// SECURITY: throttle public review submission to limit spam.
Route::post('/reviews', [ReviewController::class, 'store'])->middleware('throttle:20,1');

// Protected routes (Requires Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    // Auth actions
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);

    // Admin/Staff User Actions
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::put('/users/{id}', [AdminUserController::class, 'update']);
    Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);

    // Admin/Staff Expense Actions
    Route::apiResource('expenses', ExpenseController::class);

    // Coupons (full list + management, staff/admin only)
    Route::get('/coupons', [\App\Http\Controllers\CouponController::class, 'index']);
    Route::get('/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'show']);
    Route::post('/coupons', [\App\Http\Controllers\CouponController::class, 'store']);
    Route::put('/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'update']);
    Route::delete('/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'destroy']);

    // Products (write operations)
    Route::post('/products/upload-images', [ProductController::class, 'uploadImages']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);

    // Categories (write operations)
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    // Product Variations (Variants CRUD)
    Route::apiResource('variants', ProductVariationController::class);

    // Orders Management (All authenticated users can create orders, and fetch their respective authorized lists)
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}', [OrderController::class, 'update']);
    Route::post('/orders/{id}/refund', [OrderController::class, 'refund']);
    Route::delete('/orders/{id}', [OrderController::class, 'destroy']);

    // POS shift / Z-report (staff/admin)
    Route::get('/shifts/current', [\App\Http\Controllers\ShiftController::class, 'current']);
    Route::get('/shifts/report', [\App\Http\Controllers\ShiftController::class, 'report']);
    Route::post('/shifts/open', [\App\Http\Controllers\ShiftController::class, 'open']);
    Route::post('/shifts/close', [\App\Http\Controllers\ShiftController::class, 'close']);
    Route::get('/shifts', [\App\Http\Controllers\ShiftController::class, 'index']); // admin history

    // Store settings (admin write)
    Route::put('/settings', [\App\Http\Controllers\SettingController::class, 'update']);

    // Review delete (write operations)
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    // Sales & profit reports (staff/admin only)
    Route::get('/reports/sales', [\App\Http\Controllers\ReportController::class, 'sales']);
    // Per-cashier sales (admin only)
    Route::get('/reports/cashiers', [\App\Http\Controllers\ReportController::class, 'cashiers']);

    // POS customer lookup by phone (staff/admin only)
    Route::get('/customers/lookup', [OrderController::class, 'customerLookup']);
});

// Fallback route for unauthenticated API requests to return clean 401 instead of redirecting or throwing RouteNotFoundException
Route::get('/unauthenticated-fallback', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

