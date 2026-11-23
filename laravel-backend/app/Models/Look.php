<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Look extends Model
{
    protected $fillable = [
        'title', 'title_ku', 'title_ar',
        'subtitle', 'subtitle_ku', 'subtitle_ar',
        'gender', 'age_range', 'accent_color', 'image_url', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'gender' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(LookItem::class)->orderBy('sort_order')->orderBy('id');
    }

    public function toArray()
    {
        $data = parent::toArray();
        // The same promise products make: an image URL a phone can actually fetch.
        $data['image_url'] = Product::absoluteImageUrl($data['image_url'] ?? null);

        return $data;
    }
}
