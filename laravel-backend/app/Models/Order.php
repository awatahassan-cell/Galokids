<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'shift_id',
        'invoice_no',
        'customer_name',
        'customer_phone',
        'customer_email',
        'status',
        'subtotal',
        'discount_amount',
        'shipping_fee',
        'governorate',
        'coupon_code',
        'total_amount',
        'refunded_amount',
        'amount_paid',
        'change_due',
        'shipping_address',
        'payment_method',
        'channel',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'discount_amount' => 'float',
        'shipping_fee' => 'float',
        'total_amount' => 'float',
        'refunded_amount' => 'float',
        'amount_paid' => 'float',
        'change_due' => 'float',
    ];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
