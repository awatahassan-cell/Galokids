<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'company',
        'contact_person',
        'phone',
        'email',
        'address',
        'opening_balance',
        'notes',
    ];

    protected $casts = [
        'opening_balance' => 'float',
    ];

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function payments()
    {
        return $this->hasMany(SupplierPayment::class);
    }

    public function getTotalPurchasesAttribute()
    {
        return (float) $this->purchases()->sum('total_amount');
    }

    public function getTotalPaidAttribute()
    {
        $purchasesPaid = (float) $this->purchases()->sum('paid_amount');
        $directPayments = (float) $this->payments()->whereNull('purchase_id')->sum('amount');
        return $purchasesPaid + $directPayments;
    }

    public function getBalanceAttribute()
    {
        return ($this->opening_balance + $this->total_purchases) - $this->total_paid;
    }
}
