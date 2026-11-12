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
        'sku',
        'is_active'
    ];

    protected $casts = [
        'price' => 'float',
        'discount_price' => 'float',
        'cost' => 'float',
        'images' => 'array',
        'gender' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = ['barcode'];

    public function getIsActiveAttribute($value)
    {
        return $value !== null ? (bool) $value : true;
    }

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

    /** True when the caller is signed in to the back office. */
    public static function viewerIsPrivileged(): bool
    {
        // Sanctum by name again: most of the routes that list products are
        // public, so no auth middleware runs and the default guard never looks
        // at the bearer token.
        $user = auth('sanctum')->user();

        return (bool) ($user && $user->isPrivileged());
    }

    /**
     * Hide products the shop has taken off the website.
     *
     * One place, used by every query that can reach a shopper — the catalogue,
     * a single product, the best-sellers strip, a category's products. Written
     * out per controller it was simply forgotten in three of them, and a
     * deactivated product went on being served from each.
     *
     * `orWhereNull` is for a column added by hand without a default: in SQL
     * `is_active = 1` drops a NULL rather than matching it, which would empty
     * the shop rather than fill it.
     */
    public function scopeVisibleToShoppers($query)
    {
        return $query->where(function ($q) {
            $q->where('is_active', true)->orWhereNull('is_active');
        });
    }

    /** The same, applied only when the caller is not back-office staff. */
    public function scopeVisibleToViewer($query)
    {
        return self::viewerIsPrivileged() ? $query : $query->visibleToShoppers();
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
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
