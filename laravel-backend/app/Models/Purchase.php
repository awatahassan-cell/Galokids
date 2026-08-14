<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'supplier_name',
        'supplier_phone',
        'purchase_date',
        'total_amount',
        'paid_amount',
        'payment_status',
        'payment_method',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'purchase_date' => 'date:Y-m-d',
        'total_amount' => 'float',
        'paid_amount' => 'float',
    ];

    public function items()
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
