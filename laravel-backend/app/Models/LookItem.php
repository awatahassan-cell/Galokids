<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LookItem extends Model
{
    public const SLOTS = ['top', 'bottom', 'shoes', 'hat', 'other'];

    protected $fillable = ['look_id', 'product_id', 'slot', 'hotspot_x', 'hotspot_y', 'sort_order'];

    protected $casts = [
        'hotspot_x' => 'float',
        'hotspot_y' => 'float',
        'sort_order' => 'integer',
    ];

    public function look()
    {
        return $this->belongsTo(Look::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
