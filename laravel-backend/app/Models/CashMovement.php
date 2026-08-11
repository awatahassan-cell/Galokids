<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashMovement extends Model
{
    public const IN = 'in';
    public const OUT = 'out';

    protected $fillable = ['shift_id', 'user_id', 'direction', 'amount', 'reason'];

    protected $casts = ['amount' => 'float'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
