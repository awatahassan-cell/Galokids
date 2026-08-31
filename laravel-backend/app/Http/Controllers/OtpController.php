<?php

namespace App\Http\Controllers;

use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Mobile-number verification.
 *
 * The flow is deliberately two-legged:
 *   1. POST /send-otp    → a 6-digit code is texted to the number.
 *   2. POST /verify-otp  → the code is checked and, on success, a single-use
 *      `verification_token` is returned.
 *   3. POST /login-with-phone → that token (not just the phone number) is what
 *      actually logs the customer in.
 *
 * Step 3 is the important one: without the token, anyone could have called
 * /login-with-phone with someone else's number and received a valid session.
 */
class OtpController extends Controller
{
    /** How long a code stays valid. */
    private const CODE_TTL_MINUTES = 5;

    /** How long the post-verification token stays usable. */
    private const TICKET_TTL_MINUTES = 10;

    /** Wrong guesses allowed per code before it is burned. */
    private const MAX_ATTEMPTS = 5;

    /** Seconds a caller must wait before asking for a new code. */
    private const RESEND_COOLDOWN_SECONDS = 45;

    /**
     * Send an SMS / WhatsApp OTP code to a mobile number.
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        $phone = PhoneNumber::normalize($request->input('phone'));

        if (!$phone || !PhoneNumber::isValid($request->input('phone'))) {
            return response()->json([
                'success' => false,
                'message' => 'ژمارەی مۆبایلەکە دروست نییە.',
            ], 422);
        }

        // Per-number cooldown so the SMS credit can't be drained by a loop.
        $cooldownKey = "otp_cooldown_{$phone}";
        if (Cache::has($cooldownKey)) {
            return response()->json([
                'success' => false,
                'message' => 'تکایە چەند چرکەیەک چاوەڕێ بکە پێش داواکردنی کۆدێکی نوێ.',
                'retry_after' => self::RESEND_COOLDOWN_SECONDS,
            ], 429);
        }

        $code = (string) random_int(100000, 999999);

        // The body is fixed here, not taken from the request.
        //
        // This endpoint is public and unauthenticated: it has to be, because a
        // customer signs in with it. A caller-supplied message meant anyone
        // could send any text to any number on the shop's account.
        $message = "کۆدی پشتڕاستکردنەوەی ژمارەی مۆبایلەکەت بۆ داواکاری: [ {$code} ]";

        $smsSent = $this->dispatchSms($phone, $message, $code);

        // A code that was never sent is not a code the customer can enter.
        //
        // This used to answer "sent" whatever happened, so a missing API key
        // looked exactly like a working shop: the screen asked for a code, and
        // none was ever coming. Say so instead, and leave no cooldown behind,
        // so the moment the gateway is configured the next attempt works.
        //
        // Outside production a configured test code stands in for the gateway,
        // so a machine with no SMS account can still walk the whole checkout.
        // In production there is no such allowance.
        $stagingCodeAvailable = !app()->isProduction()
            && (string) config('services.otpiq.test_code', '') !== '';

        if (!$smsSent && !$stagingCodeAvailable) {
            return response()->json([
                'success' => false,
                'message' => 'ناتوانرێت کۆد بنێردرێت لە ئێستادا. تکایە دواتر هەوڵ بدەرەوە یان پەیوەندیمان پێوە بکە.',
            ], 503);
        }

        Cache::put("otp_{$phone}", [
            'code'     => $code,
            'attempts' => 0,
        ], now()->addMinutes(self::CODE_TTL_MINUTES));

        // Start the cooldown. Without this the check above never fires: a loop
        // could ask for codes without limit, draining the shop's SMS credit
        // and burying the real code under a hundred texts to the customer.
        Cache::put($cooldownKey, true, now()->addSeconds(self::RESEND_COOLDOWN_SECONDS));

        // The code is not in this response, and neither is a link containing
        // it. Returning it handed the code for any number to anyone who asked
        // — the number is the only thing needed to take an account over, and
        // the whole point of sending it by SMS is that only the phone's owner
        // sees it.
        return response()->json([
            'success'    => true,
            'message'    => 'کۆدی پشتڕاستکردنەوە نێردرا بۆ ژمارەی مۆبایلەکەت.',
            'phone'      => $phone,
            'dispatched' => $smsSent,
        ]);
    }

    /**
     * Verify a submitted code and hand back a single-use verification token.
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'code'  => 'required|string',
        ]);

        $phone = PhoneNumber::normalize($request->input('phone'));
        $submittedCode = preg_replace('/\D/', '', (string) $request->input('code'));

        if (!$phone) {
            return response()->json([
                'success' => false,
                'message' => 'ژمارەی مۆبایلەکە دروست نییە.',
            ], 422);
        }

        // A fixed code that always works, for staging only.
        //
        // Two conditions, both required. It has to be set in the environment —
        // there is no default, because a default is a password everybody
        // knows — and the application must not be in production. Hardcoding
        // `123456` here let anyone sign in as anyone, including an admin,
        // without ever asking for a code: exactly the takeover this endpoint
        // exists to prevent, and guessable on the first try.
        $testCode = (string) config('services.otpiq.test_code', '');
        if ($testCode !== '' && !app()->isProduction() && hash_equals($testCode, $submittedCode)) {
            Log::warning("OTP test code accepted for {$phone} — this must never happen in production.");

            return response()->json([
                'success'            => true,
                'verified'           => true,
                'verification_token' => $this->issueTicket($phone),
                'message'            => 'ژمارەی مۆبایلەکەت بە سەرکەوتوویی پشتڕاستکرایەوە.',
            ]);
        }

        $entry = Cache::get("otp_{$phone}");

        if (!is_array($entry) || !isset($entry['code'])) {
            return response()->json([
                'success' => false,
                'message' => 'کۆدەکە بەسەرچووە یان شیاو نییە. تکایە دووبارە کۆد داوا بکەرەوە.',
            ], 422);
        }

        if (hash_equals((string) $entry['code'], (string) $submittedCode)) {
            Cache::forget("otp_{$phone}");

            return response()->json([
                'success'            => true,
                'verified'           => true,
                'verification_token' => $this->issueTicket($phone),
                'message'            => 'ژمارەی مۆبایلەکەت بە سەرکەوتوویی پشتڕاستکرایەوە.',
            ]);
        }

        // Burn the code after too many wrong guesses so a 6-digit code can't be
        // brute-forced within its 5-minute lifetime.
        $entry['attempts'] = (int) ($entry['attempts'] ?? 0) + 1;

        if ($entry['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget("otp_{$phone}");

            return response()->json([
                'success' => false,
                'message' => 'هەوڵی زۆر دراوە. تکایە کۆدێکی نوێ داوا بکەرەوە.',
            ], 429);
        }

        Cache::put("otp_{$phone}", $entry, now()->addMinutes(self::CODE_TTL_MINUTES));

        return response()->json([
            'success' => false,
            'message' => 'کۆدی تێخستراو هەڵەیە. تکایە دووبارە تاقیبکەرەوە.',
        ], 422);
    }

    /**
     * Create the short-lived proof that this phone number was just verified.
     */
    private function issueTicket(string $phone): string
    {
        $ticket = Str::random(64);

        Cache::put(self::ticketKey($ticket), $phone, now()->addMinutes(self::TICKET_TTL_MINUTES));

        return $ticket;
    }

    public static function ticketKey(string $ticket): string
    {
        return 'otp_verified_' . hash('sha256', $ticket);
    }

    /**
     * Consume a verification token. Returns the verified phone number, or null
     * when the token is unknown, expired or already used (single use).
     */
    public static function consumeTicket(?string $ticket): ?string
    {
        if (!$ticket) {
            return null;
        }

        $key = self::ticketKey($ticket);
        $phone = Cache::get($key);

        if (!$phone) {
            return null;
        }

        Cache::forget($key);

        return (string) $phone;
    }

    /**
     * Dispatch the OTP through the OTPIQ gateway.
     *
     * The API key comes from config/services.php (OTPIQ_API_KEY in .env) —
     * never hardcode it here, the file is committed to git.
     */
    private function dispatchSms(string $phone, string $message, string $code): bool
    {
        // From config only, which reads .env — never a literal here, and never
        // env() at this depth.
        //
        // A key was hardcoded as the fallback. This file is in git, so the key
        // was published to anyone with the repository, and whoever has it can
        // spend the shop's SMS credit. env() outside config also returns null
        // once `php artisan config:cache` has run, which is the normal way to
        // deploy — so the fallback would have been null in production anyway.
        $otpiqApiKey = config('services.otpiq.key');
        $otpiqUrl = config('services.otpiq.url');

        if (!$otpiqApiKey) {
            Log::warning('OTPIQ_API_KEY is not configured — OTP was generated but not sent.');

            return false;
        }

        // Let the gateway choose how to deliver.
        //
        // The checkout screen offers "SMS or WhatsApp" and that choice used to
        // be passed straight through as the provider. WhatsApp is a separate
        // product that a shop has to be approved for, so on an account without
        // it every message the customer asked to receive on WhatsApp came back
        // Failed — and was still charged for. `auto` lets OTPIQ send by
        // whatever the account can actually use.
        //
        // A shop that does have WhatsApp approved can set OTPIQ_PROVIDER.
        $provider = config('services.otpiq.provider') ?: 'auto';

        try {
            // Always the provider's verification template.
            //
            // The free-text "notification" payload was only there to carry a
            // caller-supplied summary, and that is gone: a public endpoint
            // that sends arbitrary text to an arbitrary number is an open
            // relay billed to the shop. It also needs its own approval, so on
            // most accounts it fails the same way WhatsApp does.
            $response = Http::timeout(15)->withHeaders([
                'Authorization' => 'Bearer ' . $otpiqApiKey,
                'Accept'        => 'application/json',
                'Content-Type'  => 'application/json',
            ])->post($otpiqUrl, [
                'phoneNumber'      => $phone,
                'smsType'          => 'verification',
                'verificationCode' => $code,
                'provider'         => $provider,
            ]);

            if ($response->successful()) {
                Log::info("OTPIQ OTP delivered to {$phone} (provider: {$provider}).");

                return true;
            }

            // The gateway's own reason for refusing. Safe to keep: the code
            // travels in the request, never in the reply, and without this a
            // failure is a number with no explanation attached.
            Log::error(sprintf(
                'OTPIQ refused the message for %s (provider: %s): HTTP %d %s',
                $phone,
                $provider,
                $response->status(),
                mb_substr(trim($response->body()), 0, 400)
            ));
        } catch (\Exception $e) {
            Log::error("OTPIQ API exception for {$phone}: " . $e->getMessage());
        }

        return false;
    }
}
