<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | OTPIQ — SMS / WhatsApp one-time passwords
    |--------------------------------------------------------------------------
    |
    | The API key MUST come from .env. Never commit a real key: this file is in
    | git, and a leaked key lets anyone spend the store's SMS credit.
    |
    | OTP_TEST_CODE is a staging-only escape hatch: when set, that fixed code is
    | accepted for any number. Leave it EMPTY in production.
    |
    */

    'otpiq' => [
        'key' => env('OTPIQ_API_KEY'),
        'url' => env('OTPIQ_API_URL', 'https://api.otpiq.com/api/sms'),
        'test_code' => env('OTP_TEST_CODE', ''),
    ],

];
