<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    protected $fillable = [
        'user_id', 'opening_float', 'counted_cash', 'expected_cash',
        'difference', 'status', 'note', 'opened_at', 'closed_at',
    ];

    protected $casts = [
        'opening_float' => 'float',
        'counted_cash' => 'float',
        'expected_cash' => 'float',
        'difference' => 'float',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
