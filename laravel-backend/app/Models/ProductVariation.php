<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariation extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'color',
        'size',
        'stock_quantity',
        'sku',
        'price_override',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
