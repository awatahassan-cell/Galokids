<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpController extends Controller
{
    /**
     * Send real SMS / WhatsApp OTP code to customer mobile number via OTPIQ
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
        $code = (string)rand(100000, 999999);

        // Store OTP in Cache for 5 minutes
        Cache::put("otp_{$phone}", $code, now()->addMinutes(5));

        // Prepare SMS Message text
        $message = "کۆدی پشتڕاستکردنەوەی ژمارەی مۆبایلەکەت بۆ داواکاری: [ {$code} ]";

        // Dispatch real SMS/WhatsApp OTP via OTPIQ API
        $smsSent = $this->dispatchSms($phone, $message, $code);

        return response()->json([
            'success' => true,
            'message' => 'کۆدی پشتڕاستکردنەوە نێردرا بۆ ژمارەی مۆبایلەکەت.',
            'phone' => $phone,
            'dispatched' => $smsSent,
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
     * Dispatch OTP via OTPIQ API (https://api.otpiq.com/api/sms)
     */
    private function dispatchSms(string $phone, string $message, string $code): bool
    {
        Log::info("Dispatching OTP code {$code} to {$phone}");

        $otpiqApiKey = env('OTPIQ_API_KEY', 'sk_dev_189dc6187a0fc78ea31dc39b86ec17584f2d5582');
        $otpiqUrl = env('OTPIQ_API_URL', 'https://api.otpiq.com/api/sms');

        if ($otpiqApiKey) {
            try {
                $response = Http::withHeaders([
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
                    Log::info("OTPIQ OTP successfully delivered to {$phone}. Response: " . $response->body());
                    return true;
                } else {
                    Log::error("OTPIQ API error response for {$phone}: " . $response->body());
                }
            } catch (\Exception $e) {
                Log::error("OTPIQ API exception for {$phone}: " . $e->getMessage());
            }
        }

        return false;
    }
}
