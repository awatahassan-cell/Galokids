<?php

/*
 * SECURITY: restrict cross-origin access to the known frontend origins only.
 * Set FRONTEND_URL (comma-separated for multiple) in the backend .env, e.g.
 *   FRONTEND_URL=https://galokids.com,https://www.galokids.com
 * Avoid using "*" in production — it allows any website to call the API.
 */

$origins = array_filter(array_map('trim', explode(',', env('FRONTEND_URL', ''))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Fall back to localhost dev origins when FRONTEND_URL is not configured.
    'allowed_origins' => !empty($origins) ? $origins : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Bearer-token auth (Sanctum PATs) does not require credentialed cookies.
    'supports_credentials' => false,
];
