<?php

namespace App\Support;

/**
 * Iraqi phone number helpers.
 *
 * Canonical storage format is `964XXXXXXXXX` (no plus, no leading zero) which
 * mirrors `formatIraqiPhone()` in `src/utils/phone.ts` on the frontend, so a
 * number typed as `0750 123 4567`, `+964 750 123 4567` or `7501234567` always
 * resolves to the same account.
 */
final class PhoneNumber
{
    /** Digits without any country prefix or leading zero, e.g. `7501234567`. */
    public static function local($phone): string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);
        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '00964')) {
            $digits = substr($digits, 5);
        } elseif (str_starts_with($digits, '964')) {
            $digits = substr($digits, 3);
        } elseif (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        return $digits;
    }

    /** Canonical `964XXXXXXXXX` form, or null when there is nothing usable. */
    public static function normalize($phone): ?string
    {
        $local = self::local($phone);

        return $local === '' ? null : '964' . $local;
    }

    /** True when the number looks like a real Iraqi mobile number. */
    public static function isValid($phone): bool
    {
        $local = self::local($phone);

        return strlen($local) >= 9 && strlen($local) <= 11;
    }

    /**
     * Every spelling the same number may already have in the database, so
     * lookups keep working for rows written before normalization existed.
     */
    public static function variants($phone): array
    {
        $local = self::local($phone);
        if ($local === '') {
            return [];
        }

        return array_values(array_unique([
            '964' . $local,
            '+964' . $local,
            '00964' . $local,
            '0' . $local,
            $local,
        ]));
    }

    /**
     * Apply a "same phone number, any format" filter to a query.
     * `$column` is trusted caller-supplied, never user input.
     */
    public static function scopeMatching($query, string $column, $phone)
    {
        $variants = self::variants($phone);
        if (empty($variants)) {
            // No usable digits: make sure the query matches nothing.
            return $query->whereRaw('1 = 0');
        }

        return $query->whereIn($column, $variants);
    }
}
