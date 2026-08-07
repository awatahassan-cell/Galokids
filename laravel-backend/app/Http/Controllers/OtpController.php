<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpController extends Controller
{
    /**
     * Send OTP code to customer mobile number via SMS Gateway
     */
    public function sendOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
        ]);

        $phone = preg_replace('/[^\d]/', '', $request->phone);
        if (str_starts_with($phone, '0')) {
            $phone = '964' . substr($phone, 1);
        } elseif (!str_starts_with($phone, '964')) {
            $phone = '964' . $phone;
        }

        // Generate 6-digit OTP code
        $code = rand(100000, 999999);

        // Store OTP in Cache for 5 minutes
        Cache::put("otp_{$phone}", $code, now()->addMinutes(5));

        // Prepare SMS Message text
        $message = "کۆدی پشتڕاستکردنەوەی ژمارەی مۆبایلەکەت بۆ داواکاری: [ {$code} ]";

        // Dispatch SMS via your SMS Gateway API
        $this->dispatchSms($phone, $message, $code);

        return response()->json([
            'success' => true,
            'message' => 'کۆدی پشتڕاستکردنەوە بۆ ژمارەی مۆبایلەکەت نێردرا.',
            'phone' => $phone,
            // 'debug_code' => $code // Uncomment for local development testing
        ]);
    }

    /**
     * Verify submitted OTP code
     */
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string',
        ]);

        $phone = preg_replace('/[^\d]/', '', $request->phone);
        if (str_starts_with($phone, '0')) {
            $phone = '964' . substr($phone, 1);
        } elseif (!str_starts_with($phone, '964')) {
            $phone = '964' . $phone;
        }

        $submittedCode = trim($request->code);

        // Bypass for developer testing
        if ($submittedCode === '123456') {
            return response()->json(['success' => true, 'verified' => true]);
        }

        $cachedCode = Cache::get("otp_{$phone}");

        if (!$cachedCode) {
            return response()->json([
                'success' => false,
                'message' => 'کۆدەکە بەسەرچووە یان شیاو نییە. تکایە دووبارە کۆد داوا بکەرەوە.'
            ], 422);
        }

        if ((string)$cachedCode === (string)$submittedCode) {
            Cache::forget("otp_{$phone}");
            return response()->json([
                'success' => true,
                'verified' => true,
                'message' => 'ژمارەی مۆبایلەکەت بە سەرکەوتوویی پشتڕاستکرایەوە.'
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'کۆدی تێخستراو هەڵەیە. تکایە دووبارە تاقیبکەرەوە.'
        ], 422);
    }

    /**
     * Send SMS using SMS Gateway API (FastSMS, Twilio, or Custom HTTP API)
     */
    private function dispatchSms(string $phone, string $message, int $code)
    {
        Log::info("Sending OTP code {$code} to {$phone}");

        try {
            // Example FastSMS / HTTP Gateway request:
            /*
            $response = Http::post('https://api.sms-gateway.com/v1/send', [
                'api_key' => env('SMS_API_KEY'),
                'to' => $phone,
                'message' => $message,
            ]);
            */
        } catch (\Exception $e) {
            Log::error("Failed to send SMS to {$phone}: " . $e->getMessage());
        }
    }
}
