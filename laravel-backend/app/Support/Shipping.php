<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Delivery charge for an online order.
 *
 * Rates are configured in the admin settings as a JSON map of governorate to
 * price, with a default for anywhere not listed and a basket value above which
 * delivery is free. Everything is optional: with nothing configured the charge
 * is zero, which is how the shop behaved before.
 */
final class Shipping
{
    /** @return array{rates: array<string,float>, default: float, free_over: float} */
    public static function config(): array
    {
        $rates = [];
        $default = 0.0;
        $freeOver = 0.0;

        try {
            $settings = Setting::whereIn('key', [
                'shipping_rates', 'shipping_default_fee', 'shipping_free_over',
            ])->pluck('value', 'key');

            $decoded = json_decode((string) ($settings['shipping_rates'] ?? ''), true);
            if (is_array($decoded)) {
                foreach ($decoded as $governorate => $fee) {
                    $rates[self::key($governorate)] = (float) $fee;
                }
            }

            $default = (float) ($settings['shipping_default_fee'] ?? 0);
            $freeOver = (float) ($settings['shipping_free_over'] ?? 0);
        } catch (\Throwable $e) {
            // Settings table unavailable — fall back to no delivery charge.
        }

        return ['rates' => $rates, 'default' => $default, 'free_over' => $freeOver];
    }

    /**
     * What to charge for delivery.
     *
     * @param float  $subtotalAfterDiscount what the customer pays for the goods
     * @param string|null $governorate      canonical English governorate name
     */
    public static function feeFor(?string $governorate, float $subtotalAfterDiscount): float
    {
        $config = self::config();

        if ($config['free_over'] > 0 && $subtotalAfterDiscount >= $config['free_over']) {
            return 0.0;
        }

        $fee = $config['rates'][self::key($governorate)] ?? $config['default'];

        return round(max(0, $fee));
    }

    private static function key(?string $governorate): string
    {
        return mb_strtolower(trim((string) $governorate));
    }
}
