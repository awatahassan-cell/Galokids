<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_ku',
        'name_ar',
        'description',
        'description_ku',
        'description_ar',
        'price',
        'discount_price',
        'cost',
        'image_url',
        'images',
        'category_id',
        'gender',
        'sku'
    ];

    protected $casts = [
        'price' => 'float',
        'discount_price' => 'float',
        'cost' => 'float',
        'images' => 'array',
        'gender' => 'integer',
    ];

    protected $appends = ['barcode'];

    public function getBarcodeAttribute()
    {
        return $this->sku;
    }

    public function variations()
    {
        return $this->hasMany(ProductVariation::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }
}
