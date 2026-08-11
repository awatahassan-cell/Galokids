<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One line of the stock ledger. See StockLedger for how entries are written.
 */
class StockMovement extends Model
{
    public const TYPE_SALE       = 'sale';
    public const TYPE_REFUND     = 'refund';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_PURCHASE   = 'purchase';
    public const TYPE_COUNT      = 'count';
    public const TYPE_INITIAL    = 'initial';

    protected $fillable = [
        'product_variation_id', 'product_id', 'type',
        'quantity_change', 'quantity_after',
        'user_id', 'order_id', 'note',
    ];

    protected $casts = [
        'quantity_change' => 'integer',
        'quantity_after' => 'integer',
    ];

    public function variation()
    {
        return $this->belongsTo(ProductVariation::class, 'product_variation_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
