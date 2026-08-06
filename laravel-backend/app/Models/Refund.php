<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $fillable = [
        'order_id', 'user_id', 'shift_id', 'amount', 'reason', 'items',
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
