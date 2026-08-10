<?php

namespace App\Models;

use App\Support\PhoneNumber;
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
        'max_uses',
        'max_uses_per_customer',
        'min_order_amount',
        'is_active',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'discount_percentage' => 'float',
        'max_uses' => 'integer',
        'max_uses_per_customer' => 'integer',
        'min_order_amount' => 'float',
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

    /**
     * How many times this code has been redeemed.
     *
     * Counted from the orders themselves rather than a counter column, so a
     * cancelled order releases its use and the number can never drift out of
     * step with reality.
     */
    public function timesUsed(): int
    {
        return (int) Order::whereRaw('UPPER(coupon_code) = ?', [strtoupper($this->code)])
            ->where('status', '!=', 'cancelled')
            ->count();
    }

    /** How many times one customer (by account or phone) has redeemed it. */
    public function timesUsedBy(?int $userId, ?string $phone): int
    {
        if (!$userId && !$phone) {
            return 0;
        }

        $phoneVariants = $phone ? PhoneNumber::variants($phone) : [];

        return (int) Order::whereRaw('UPPER(coupon_code) = ?', [strtoupper($this->code)])
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($userId, $phoneVariants) {
                if ($userId) {
                    $query->orWhere('user_id', $userId);
                }
                if (!empty($phoneVariants)) {
                    $query->orWhereIn('customer_phone', $phoneVariants);
                }
            })
            ->count();
    }

    /**
     * Why this coupon cannot be used right now, or null when it can.
     *
     * Returns a translatable reason so the checkout can explain itself instead
     * of silently charging full price.
     */
    public function redemptionProblem(float $subtotal, ?int $userId, ?string $phone): ?string
    {
        if ($this->min_order_amount > 0 && $subtotal < $this->min_order_amount) {
            return 'min_order_amount';
        }

        if ($this->max_uses !== null && $this->timesUsed() >= $this->max_uses) {
            return 'fully_used';
        }

        if ($this->max_uses_per_customer !== null
            && $this->timesUsedBy($userId, $phone) >= $this->max_uses_per_customer) {
            return 'already_used_by_customer';
        }

        return null;
    }
}
