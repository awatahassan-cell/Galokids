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

        Cache::put("otp_{$phone}", [
            'code'     => $code,
            'attempts' => 0,
        ], now()->addMinutes(self::CODE_TTL_MINUTES));

        Cache::put($cooldownKey, true, now()->addSeconds(self::RESEND_COOLDOWN_SECONDS));

        $message = "کۆدی پشتڕاستکردنەوەی ژمارەی مۆبایلەکەت بۆ داواکاری: [ {$code} ]";

        $smsSent = $this->dispatchSms($phone, $message, $code);

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

        // Optional test code for staging. Set OTP_TEST_CODE in .env to enable —
        // it is disabled by default and MUST stay unset in production.
        $testCode = (string) config('services.otpiq.test_code', '');
        if ($testCode !== '' && hash_equals($testCode, $submittedCode)) {
            return response()->json([
                'success'            => true,
                'verified'           => true,
                'verification_token' => $this->issueTicket($phone),
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
        $otpiqApiKey = config('services.otpiq.key');
        $otpiqUrl = config('services.otpiq.url');

        if (!$otpiqApiKey) {
            Log::warning('OTPIQ_API_KEY is not configured — OTP was generated but not sent.');

            return false;
        }

        try {
            $response = Http::timeout(15)->withHeaders([
                'Authorization' => 'Bearer ' . $otpiqApiKey,
                'Accept'        => 'application/json',
                'Content-Type'  => 'application/json',
            ])->post($otpiqUrl, [
                'phoneNumber'      => $phone,
                'smsType'          => 'verification',
                'verificationCode' => $code,
                'provider'         => 'auto',
            ]);

            if ($response->successful()) {
                // Never log the code itself.
                Log::info("OTPIQ OTP delivered to {$phone}.");

                return true;
            }

            Log::error("OTPIQ API error response for {$phone}: " . $response->body());
        } catch (\Exception $e) {
            Log::error("OTPIQ API exception for {$phone}: " . $e->getMessage());
        }

        return false;
    }
}
