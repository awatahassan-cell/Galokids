<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    /** Paid back out of the cashier's drawer. The only kind the drawer count subtracts. */
    public const CASH = 'cash';
    /** Paid back to the customer's card. */
    public const CARD = 'card';
    /** Transfer, courier, anything that did not come from the drawer. */
    public const OTHER = 'other';

    protected $fillable = [
        'order_id', 'user_id', 'shift_id', 'amount', 'method', 'reason', 'items',
    ];

    protected $casts = [
        'amount' => 'float',
        'items' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
