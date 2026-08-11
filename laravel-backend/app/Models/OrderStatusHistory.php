<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusHistory extends Model
{
    protected $table = 'order_status_history';

    protected $fillable = [
        'order_id', 'from_status', 'to_status', 'user_id', 'note', 'customer_notified',
    ];

    protected $casts = ['customer_notified' => 'boolean'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
