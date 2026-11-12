<?php

namespace App\Providers;

use App\Support\PhoneNumber;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * The application's own service provider.
 *
 * This file was missing while `bootstrap/providers.php` went on naming it.
 * The application started all the same, because `laravel/pint` — a formatter,
 * and a dev dependency — ships a class of exactly this name under exactly this
 * namespace, and the autoloader found that one. So the shop was booting a
 * service provider out of a code-formatting tool.
 *
 * The part that mattered: `composer install --no-dev`, which is how a Laravel
 * app is deployed, leaves Pint out. The class then does not exist, the
 * provider cannot be loaded, and nothing boots at all — not a page, not an API
 * call. The site was one ordinary deploy command away from being entirely
 * down, and working until then only by accident.
 */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Limits that count the right thing.
     *
     * These were all `throttle:N,1`, which for a caller who is not signed in
     * counts per IP address. Iraqi mobile carriers put thousands of customers
     * behind a handful of public addresses, so ten sign-ins a minute was ten
     * for the whole carrier: a dozen people opening the shop at once and most
     * of them are turned away, with nothing wrong at their end and nothing in
     * the logs to suggest it. A phone app makes that worse, not better —
     * everyone is on mobile data.
     *
     * So each limit now counts the thing being attacked — this phone number,
     * this login — and keeps a far looser ceiling per address to stop one host
     * hammering the shop. The strict control on OTP cost is unchanged and
     * lives in the controller: one code per number per 45 seconds.
     */
    private function configureRateLimiting(): void
    {
        // Asking for a code. Each one costs the shop money, so the number is
        // what must be limited, not the carrier it happens to be on.
        RateLimiter::for('otp-send', function (Request $request) {
            $phone = PhoneNumber::normalize($request->input('phone')) ?: 'none';

            return [
                Limit::perMinute(5)->by('otp-send:' . $phone),
                Limit::perMinute(120)->by('otp-send-ip:' . $request->ip()),
            ];
        });

        // Guessing a code. Six digits, five tries, then the code is burned —
        // that cap is in the controller. This stops a flood of attempts.
        RateLimiter::for('otp-verify', function (Request $request) {
            $phone = PhoneNumber::normalize($request->input('phone')) ?: 'none';

            return [
                Limit::perMinute(10)->by('otp-verify:' . $phone),
                Limit::perMinute(240)->by('otp-verify-ip:' . $request->ip()),
            ];
        });

        // Guessing a password. Counted per account, so one customer under
        // attack cannot lock out everyone else on their carrier.
        RateLimiter::for('auth', function (Request $request) {
            $identifier = strtolower(trim((string) (
                $request->input('login')
                ?: $request->input('email')
                ?: $request->input('phone')
                ?: ''
            )));

            return [
                Limit::perMinute(10)->by('auth:' . ($identifier ?: 'none')),
                Limit::perMinute(120)->by('auth-ip:' . $request->ip()),
            ];
        });
    }
}
