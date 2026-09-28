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

    /**
     * What the shop paid is nobody else's business.
     *
     * `/api/products` is public — it has to be, the storefront reads it — and
     * it was answering with `cost` on every item. Anyone at all, a competitor
     * included, could read what Galokids pays for each product and work out its
     * margin to the dinar. The back office still needs the figure for margins,
     * stock valuation and the profit report, so it is removed only for callers
     * who are not signed in to it.
     *
     * Done here rather than in a controller so it holds wherever a product is
     * serialized — on its own, nested in an order, or inside a purchase.
     */
    public function toArray()
    {
        $data = parent::toArray();

        // Asked of Sanctum by name, not of `auth()`.
        //
        // `/api/products` is a public route, so no auth middleware runs on it
        // and the default guard never looks at the bearer token — the panel
        // would have been treated as a stranger and shown no cost at all.
        $user = auth('sanctum')->user();

        if (!$user || !$user->isPrivileged()) {
            unset($data['cost']);
        }

        return $data;
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
