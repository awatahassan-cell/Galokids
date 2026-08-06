const fs = require('fs');
let content = fs.readFileSync('laravel-backend/routes/api.php', 'utf8');

content = content.replace(
    "Route::get('/categories/{category}', [CategoryController::class, 'show']);",
    "Route::get('/categories/{category}', [CategoryController::class, 'show']);\nRoute::get('/coupons', [\\App\\Http\\Controllers\\CouponController::class, 'index']);\nRoute::get('/coupons/{id}', [\\App\\Http\\Controllers\\CouponController::class, 'show']);"
);

content = content.replace(
    "Route::apiResource('expenses', ExpenseController::class);",
    "Route::apiResource('expenses', ExpenseController::class);\n    Route::post('/coupons', [\\App\\Http\\Controllers\\CouponController::class, 'store']);\n    Route::put('/coupons/{id}', [\\App\\Http\\Controllers\\CouponController::class, 'update']);\n    Route::delete('/coupons/{id}', [\\App\\Http\\Controllers\\CouponController::class, 'destroy']);"
);

fs.writeFileSync('laravel-backend/routes/api.php', content);
