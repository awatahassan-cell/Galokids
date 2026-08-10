<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The storefront is a separate React SPA — this backend only serves the JSON
| API in routes/api.php. This file exists because bootstrap/app.php registers
| a web route file, and it gives the deployment a simple health page.
|
*/

Route::get('/', fn () => response()->json([
    'name'   => config('app.name'),
    'status' => 'ok',
    'api'    => url('/api'),
]));
