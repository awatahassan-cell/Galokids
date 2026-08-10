<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'code',
        'discount_percentage',
        'is_active',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'discount_percentage' => 'float',
    ];

    /**
     * Find a redeemable coupon by code.
     *
     * Shared by the checkout "is this code valid?" endpoint and by order
     * creation. They used to look it up differently — one case-insensitive, the
     * other an exact match — so a shopper who typed "save15" was told the code
     * was valid, saw the discount, and was then charged the full price.
     */
    public static function findRedeemable(?string $code): ?self
    {
        $code = trim((string) $code);
        if ($code === '') {
            return null;
        }

        $today = now()->toDateString();

        return static::whereRaw('UPPER(code) = ?', [strtoupper($code)])
            ->where('is_active', true)
            ->where(function ($query) use ($today) {
                $query->whereNull('start_date')->orWhere('start_date', '<=', $today);
            })
            ->where(function ($query) use ($today) {
                $query->whereNull('end_date')->orWhere('end_date', '>=', $today);
            })
            ->first();
    }
}
