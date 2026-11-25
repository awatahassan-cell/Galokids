<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_variation_id',
        // What was sold, recorded at the time of sale. A receipt must not
        // change when the catalogue does — and the product may later be gone.
        'product_name',
        'product_name_ku',
        'product_name_ar',
        'variation_label',
        'quantity',
        // How many of this line the customer brought back. Kept here rather
        // than only inside the refund record so reports can net it out in SQL.
        'returned_quantity',
        'price',
        // What one piece cost the shop when it was sold. Frozen, so a later
        // change to the product's cost cannot rewrite profit already made.
        'unit_cost',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'returned_quantity' => 'integer',
        'price' => 'float',
        'unit_cost' => 'float',
    ];

    /** What the shop paid is for the shop: customers' order lines never carry it. */
    public function toArray()
    {
        $data = parent::toArray();

        if (!Product::viewerIsPrivileged()) {
            unset($data['unit_cost']);
        }

        return $data;
    }

    /** Pieces of this line the shop actually parted with. */
    public function netQuantity(): int
    {
        return max(0, (int) $this->quantity - (int) $this->returned_quantity);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
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
