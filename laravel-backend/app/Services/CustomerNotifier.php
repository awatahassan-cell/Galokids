<?php

namespace App\Services;

use App\Models\Order;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Tells a customer their order moved on, by SMS through the same OTPIQ account
 * the login codes use.
 *
 * Sending is best-effort: a failed message must never roll back the status
 * change that triggered it.
 */
class CustomerNotifier
{
    /** Messages per status, in the three site languages. */
    private const MESSAGES = [
        'processing' => [
            'ku' => 'داواکاری ژمارە {invoice} پەسەندکرا و ئامادە دەکرێت. سوپاس بۆ متمانەت! - {store}',
            'ar' => 'تم تأكيد طلبك رقم {invoice} وجاري تجهيزه. شكراً لثقتك! - {store}',
            'en' => 'Your order {invoice} is confirmed and being prepared. Thank you! - {store}',
        ],
        'shipped' => [
            'ku' => 'داواکاری ژمارە {invoice} نێردرا و بەم زووانە دەگاتە دەستت. - {store}',
            'ar' => 'تم شحن طلبك رقم {invoice} وسيصلك قريباً. - {store}',
            'en' => 'Your order {invoice} has been shipped and is on its way. - {store}',
        ],
        'delivered' => [
            'ku' => 'داواکاری ژمارە {invoice} گەیشت. سوپاس بۆ کڕینت! - {store}',
            'ar' => 'تم تسليم طلبك رقم {invoice}. شكراً لتسوقك معنا! - {store}',
            'en' => 'Your order {invoice} has been delivered. Thank you for shopping with us! - {store}',
        ],
        'cancelled' => [
            'ku' => 'داواکاری ژمارە {invoice} هەڵوەشێندرایەوە. بۆ زانیاری زیاتر پەیوەندیمان پێوە بکە. - {store}',
            'ar' => 'تم إلغاء طلبك رقم {invoice}. للمزيد من المعلومات يرجى التواصل معنا. - {store}',
            'en' => 'Your order {invoice} has been cancelled. Please contact us for details. - {store}',
        ],
    ];

    /**
     * @return bool true when a message was actually accepted by the gateway
     */
    public function orderStatusChanged(Order $order, string $status): bool
    {
        if (!$this->isEnabled()) {
            return false;
        }

        $phone = PhoneNumber::normalize($order->customer_phone);
        if (!$phone) {
            return false;
        }

        $template = self::MESSAGES[$status][$this->language()] ?? null;
        if (!$template) {
            return false; // nothing worth sending for this status
        }

        $message = strtr($template, [
            '{invoice}' => $order->invoice_no ?: ('#' . $order->id),
            '{store}' => $this->storeName(),
        ]);

        return $this->send($phone, $message);
    }

    private function isEnabled(): bool
    {
        return (bool) $this->setting('notify_order_status', false)
            && (bool) config('services.otpiq.key');
    }

    private function language(): string
    {
        $lang = (string) $this->setting('notify_language', 'ku');

        return in_array($lang, ['ku', 'ar', 'en'], true) ? $lang : 'ku';
    }

    private function storeName(): string
    {
        return (string) ($this->setting('store_name', 'Galo Kids') ?: 'Galo Kids');
    }

    private function setting(string $key, $default = null)
    {
        try {
            $value = \App\Models\Setting::where('key', $key)->value('value');
        } catch (\Throwable $e) {
            return $default;
        }

        if ($value === null) {
            return $default;
        }
        if ($value === 'true') {
            return true;
        }
        if ($value === 'false') {
            return false;
        }

        return $value;
    }

    private function send(string $phone, string $message): bool
    {
        try {
            $response = Http::timeout(15)->withHeaders([
                'Authorization' => 'Bearer ' . config('services.otpiq.key'),
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post(config('services.otpiq.url'), [
                'phoneNumber' => $phone,
                'smsType' => 'notification',
                'message' => $message,
                'provider' => 'auto',
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::warning("Order notification to {$phone} rejected: " . $response->body());
        } catch (\Throwable $e) {
            Log::warning("Order notification to {$phone} failed: " . $e->getMessage());
        }

        return false;
    }
}
