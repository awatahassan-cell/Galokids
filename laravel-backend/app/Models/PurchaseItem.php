<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_id',
        'product_id',
        'product_variation_id',
        'quantity',
        'previous_cost',
        'cost_price',
        'previous_price',
        'retail_price',
        'subtotal',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'previous_cost' => 'float',
        'cost_price' => 'float',
        'previous_price' => 'float',
        'retail_price' => 'float',
        'subtotal' => 'float',
    ];

    public function purchase()
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variation()
    {
        return $this->belongsTo(ProductVariation::class, 'product_variation_id');
    }
}
