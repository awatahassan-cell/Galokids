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
        'cost',
        'image_url',
        'category_id',
        'sku'
    ];

    public function variations()
    {
        return $this->hasMany(ProductVariation::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }
}
