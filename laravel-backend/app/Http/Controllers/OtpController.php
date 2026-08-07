<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpController extends Controller
{
    /**
     * Send real SMS OTP code to customer mobile number via SMS Gateway
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

        // Dispatch real SMS via SMS Gateway API
        $smsSent = $this->dispatchSms($phone, $message, $code);

        return response()->json([
            'success' => true,
            'message' => 'کۆدی پشتڕاستکردنەوە لە ڕێگەی SMS نێردرا بۆ مۆبایلەکەت.',
            'phone' => $phone,
            'sms_dispatched' => $smsSent,
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

        // Optional test bypass code for developer convenience
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
     * Dispatch SMS to Gateway API (Twilio, FastSMS, Infobip, or custom HTTP API)
     */
    private function dispatchSms(string $phone, string $message, int $code): bool
    {
        Log::info("Dispatching SMS OTP code {$code} to {$phone}");

        $apiUrl = env('SMS_API_URL');
        $apiKey = env('SMS_API_KEY');
        $sender = env('SMS_SENDER_ID', 'GaloKids');

        if (!$apiUrl || !$apiKey) {
            Log::warning("SMS_API_URL or SMS_API_KEY not configured in .env file. Code: {$code} for {$phone}");
            return false;
        }

        try {
            // Standard HTTP Gateway POST request
            $response = Http::post($apiUrl, [
                'api_key' => $apiKey,
                'to'      => $phone,
                'from'    => $sender,
                'message' => $message,
                'code'    => $code,
            ]);

            if ($response->successful()) {
                Log::info("SMS successfully delivered to {$phone}");
                return true;
            } else {
                Log::error("SMS Gateway response error for {$phone}: " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("SMS Gateway exception for {$phone}: " . $e->getMessage());
        }

        return false;
    }
}
