<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'shift_id',
        'invoice_no',
        'customer_name',
        'customer_phone',
        'customer_email',
        'status',
        'subtotal',
        'discount_amount',
        'shipping_fee',
        'governorate',
        'coupon_code',
        'total_amount',
        'refunded_amount',
        'amount_paid',
        'change_due',
        'shipping_address',
        'payment_method',
        'channel',
    ];

    /**
     * Fields the tables need but the columns do not hold.
     *
     * Every screen that lists orders has to say whether something came back
     * and how much of it. Appending them here means the answer is computed in
     * one place instead of each table inventing its own.
     */
    protected $appends = ['returned_quantity', 'total_quantity', 'fully_returned'];

    protected $casts = [
        'subtotal' => 'float',
        'discount_amount' => 'float',
        'shipping_fee' => 'float',
        'total_amount' => 'float',
        'refunded_amount' => 'float',
        'amount_paid' => 'float',
        'change_due' => 'float',
    ];

    /** Every item on this order came back. */
    public const STATUS_RETURNED = 'returned';

    /** The order was called off before it was handed over. */
    public const STATUS_CANCELLED = 'cancelled';

    /** Statuses in which the shop is not holding the goods for a customer. */
    public const STATUSES_WITHOUT_STOCK_HELD = [self::STATUS_CANCELLED, self::STATUS_RETURNED];

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The share of an item's list price the customer actually paid.
     *
     * A discount means they paid less than the ticket, so a refund has to give
     * back that share and no more. Delivery is deliberately excluded: it is
     * charged on top of the goods and is not part of what any item cost, so
     * refunding one item must never hand the delivery fee back with it.
     *
     * Both the refund and the exchange path use this. They each had their own
     * copy, and they had already drifted apart — one subtracted the delivery
     * fee and the other did not.
     */
    public function paidRatio(): float
    {
        $subtotal = (float) $this->subtotal;
        if ($subtotal <= 0) {
            return 1.0;
        }

        $goodsPaid = (float) $this->total_amount - (float) $this->shipping_fee;

        return $goodsPaid / $subtotal;
    }

    /** How many units of each order line have already been given back. */
    public function returnedQuantitiesByItem(): array
    {
        $returned = [];

        // Use the loaded relation when the caller eager-loaded it; listing a
        // page of orders would otherwise fire one query per row.
        $refunds = $this->relationLoaded('refunds')
            ? $this->refunds
            : Refund::where('order_id', $this->id)->get();

        foreach ($refunds as $refund) {
            foreach ((array) $refund->items as $line) {
                $itemId = $line['order_item_id'] ?? null;
                if ($itemId !== null) {
                    $returned[$itemId] = ($returned[$itemId] ?? 0) + (int) ($line['quantity'] ?? 0);
                }
            }
        }

        return $returned;
    }

    /** Units returned across the whole order. */
    public function returnedQuantity(): int
    {
        return array_sum($this->returnedQuantitiesByItem());
    }

    /** Units originally sold on this order. */
    public function totalQuantity(): int
    {
        // Prefer already-loaded items so listing a page of orders does not fire
        // one COUNT per row.
        if ($this->relationLoaded('items')) {
            return (int) $this->items->sum('quantity');
        }

        return (int) $this->items()->sum('quantity');
    }

    public function getReturnedQuantityAttribute(): int
    {
        return $this->returnedQuantity();
    }

    public function getTotalQuantityAttribute(): int
    {
        return $this->totalQuantity();
    }

    public function getFullyReturnedAttribute(): bool
    {
        return $this->isFullyReturned();
    }

    /**
     * Nothing is left with the customer.
     *
     * Counted in units rather than money, because the money comparison could
     * never be true on an order that was charged for delivery: the goods total
     * is always less than what was paid.
     */
    public function isFullyReturned(): bool
    {
        $total = $this->totalQuantity();

        return $total > 0 && $this->returnedQuantity() >= $total;
    }

    /**
     * Write each line's returned quantity onto the loaded item, so a receipt can
     * show which rows came back and not merely that some of it did.
     *
     * The value rides along as a plain attribute rather than an accessor on
     * OrderItem, because an accessor would have to look the refunds up itself —
     * one query per line of every order on the page.
     */
    public function stampReturnedQuantitiesOnItems(): self
    {
        if (!$this->relationLoaded('items')) {
            return $this;
        }

        $byItem = $this->returnedQuantitiesByItem();

        foreach ($this->items as $item) {
            $item->setAttribute('returned_quantity', (int) ($byItem[$item->id] ?? 0));
        }

        return $this;
    }
}
