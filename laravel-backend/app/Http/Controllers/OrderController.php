<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Coupon;
use App\Models\Shift;
use App\Models\Refund;
use App\Models\StockMovement;
use App\Models\OrderStatusHistory;
use App\Services\CustomerNotifier;
use App\Support\ActivityLogger;
use App\Support\PhoneNumber;
use App\Support\Shipping;
use App\Support\StockLedger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    /**
     * Exchange: give an item back and take a different one, in one go.
     *
     * Swapping a size is the most common counter request in a children's
     * clothing shop, and doing it as "refund, then a new sale" left two
     * unrelated records and double-counted the day's takings. This records the
     * return and the replacement together and reports the difference to pay
     * (or to give back).
     */
    public function exchange(Request $request, $id)
    {
        $user = $this->requirePrivileged($request);

        $data = $request->validate([
            'returned_items' => 'required|array|min:1',
            'returned_items.*.order_item_id' => 'required|integer|exists:order_items,id',
            'returned_items.*.quantity' => 'required|integer|min:1',
            'new_items' => 'required|array|min:1',
            'new_items.*.product_variation_id' => 'required|integer|exists:product_variations,id',
            'new_items.*.quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:500',
        ]);

        $result = DB::transaction(function () use ($data, $id, $user, $request) {
            $order = Order::with('items')->lockForUpdate()->findOrFail($id);

            // --- what is coming back -------------------------------------
            $alreadyReturned = $order->returnedQuantitiesByItem();
            $paidRatio = $order->paidRatio();

            $returnedValue = 0.0;
            $snapshot = [];

            foreach ($data['returned_items'] as $line) {
                $item = $order->items->firstWhere('id', $line['order_item_id']);
                if (!$item) {
                    abort(response()->json(['message' => 'Item does not belong to this order.'], 422));
                }

                $remaining = (int) $item->quantity - (int) ($alreadyReturned[$item->id] ?? 0);
                $qty = min((int) $line['quantity'], $remaining);
                if ($qty <= 0) {
                    continue;
                }

                $returnedValue += (float) $item->price * $qty * $paidRatio;
                $snapshot[] = ['order_item_id' => $item->id, 'quantity' => $qty, 'price' => (float) $item->price];

                // An exchange returns the original line just as a refund does.
                $item->returned_quantity = (int) $item->returned_quantity + $qty;
                $item->save();

                if ($item->product_variation_id) {
                    $variation = ProductVariation::lockForUpdate()->find($item->product_variation_id);
                    if ($variation) {
                        StockLedger::move(
                            $variation,
                            $qty,
                            StockMovement::TYPE_REFUND,
                            'Exchange from ' . ($order->invoice_no ?: ('#' . $order->id)),
                            $order->id,
                            $user->id
                        );
                    }
                }
            }

            if ($returnedValue <= 0) {
                abort(response()->json(['message' => 'Nothing left to exchange on this order.'], 422));
            }

            // --- what is going out ---------------------------------------
            $newValue = 0.0;
            $newLines = [];

            foreach ($data['new_items'] as $line) {
                $variation = ProductVariation::with('product')
                    ->lockForUpdate()
                    ->find($line['product_variation_id']);

                if (!$variation || !$variation->product) {
                    abort(response()->json(['message' => 'Replacement item could not be priced.'], 422));
                }

                $qty = (int) $line['quantity'];
                $unitPrice = $this->effectiveUnitPrice($variation->product, $variation);

                $newValue += $unitPrice * $qty;
                $newLines[] = [
                    'product_id' => $variation->product_id,
                    'product_variation_id' => $variation->id,
                    'quantity' => $qty,
                    'price' => $unitPrice,
                ];

                StockLedger::move(
                    $variation,
                    -$qty,
                    StockMovement::TYPE_SALE,
                    'Exchange for ' . ($order->invoice_no ?: ('#' . $order->id)),
                    $order->id,
                    $user->id
                );
            }

            $returnedValue = round($returnedValue);
            $newValue = round($newValue);
            $difference = $newValue - $returnedValue;   // > 0 customer pays, < 0 shop refunds

            $shift = Shift::where('user_id', $user->id)->where('status', 'open')->first();

            // The return leg is recorded as a refund so the shift reconciles.
            $refund = Refund::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'shift_id' => $shift?->id,
                'amount' => $returnedValue,
                'reason' => 'Exchange' . (!empty($data['reason']) ? ': ' . $data['reason'] : ''),
                'items' => $snapshot,
            ]);

            $order->refunded_amount = min(
                (float) $order->refunded_amount + $returnedValue,
                (float) $order->total_amount
            );
            $order->save();

            // Same rule as a plain refund: counted in units, and recorded as a
            // return rather than a cancellation. Every item on the original
            // receipt went back over the counter — the replacements are their
            // own sale below.
            if ($order->isFullyReturned()) {
                $order->status = Order::STATUS_RETURNED;
                $order->save();
            }

            // The replacement leg becomes its own small sale, linked by note.
            $replacement = Order::create([
                'user_id' => $order->user_id,
                'shift_id' => $shift?->id,
                'customer_name' => $order->customer_name,
                'customer_phone' => $order->customer_phone,
                'customer_email' => $order->customer_email,
                'status' => 'delivered',
                'subtotal' => $newValue,
                'discount_amount' => 0,
                'shipping_fee' => 0,
                'total_amount' => $newValue,
                'amount_paid' => max(0, $difference),
                'change_due' => 0,
                'shipping_address' => 'Exchange for ' . ($order->invoice_no ?: ('#' . $order->id)),
                'payment_method' => $order->payment_method,
                'channel' => 'pos',
            ]);

            foreach ($newLines as $line) {
                $replacement->items()->create($line);
            }

            $replacement->invoice_no = 'EXC-' . $replacement->created_at->format('Ymd')
                . '-' . str_pad((string) $replacement->id, 4, '0', STR_PAD_LEFT);
            $replacement->save();

            ActivityLogger::log(
                'order.exchanged',
                'order',
                $order->id,
                'Exchange on ' . ($order->invoice_no ?: ('#' . $order->id))
                    . ' — returned ' . $returnedValue . ', new ' . $newValue
            );

            return [
                'returned_value' => $returnedValue,
                'new_value' => $newValue,
                // Positive: collect from the customer. Negative: give back.
                'difference' => $difference,
                'refund' => $refund,
                'original_order' => $order->fresh(),
                'replacement_order' => $replacement->load('items.product', 'items.variation'),
            ];
        });

        return response()->json($result, 201);
    }

    /** Human-readable reason a coupon was refused. */
    private function couponProblemMessage(string $problem, Coupon $coupon): string
    {
        return match ($problem) {
            'min_order_amount' => 'ئەم کوپۆنە تەنها بۆ داواکاری سەرووی '
                . number_format((float) $coupon->min_order_amount) . ' دینارە.',
            'fully_used' => 'ئەم کوپۆنە بەتەواوی بەکارهێنراوە.',
            'already_used_by_customer' => 'تۆ پێشتر ئەم کوپۆنەت بەکارهێناوە.',
            default => 'ئەم کوپۆنە شیاو نییە.',
        };
    }

    /**
     * What one piece costs the customer.
     *
     * Mirrors `getUnitPrice()` in the frontend (src/utils/pricing.ts) — the two
     * must agree, or the cart shows one number and the order stores another.
     * Zero and negative values mean "not set", never "free".
     */
    private function effectiveUnitPrice(Product $product, ?ProductVariation $variation = null): float
    {
        $override = $variation ? (float) $variation->price_override : 0.0;
        if ($override > 0) {
            return $override;
        }

        $discount = (float) $product->discount_price;
        if ($discount > 0) {
            return $discount;
        }

        return (float) $product->price;
    }

    /**
     * The order list, a page at a time.
     *
     * This used to return every order the shop had ever taken on every request.
     * That is fine for a few hundred and ruinous for a few thousand — the whole
     * table plus its line items, its products and its variations, serialised
     * into one response, on every visit to the panel.
     *
     * Searching and filtering happen here too. They used to be done in the
     * browser over that full list, which only worked *because* it was the full
     * list: filtering a page would silently search one page and call it the
     * whole shop.
     */
    public function index(Request $request)
    {
        $user = $this->requireAuth($request);

        $request->validate([
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1',
            'channel' => 'nullable|string|in:pos,online',
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,cancelled,returned',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'search' => 'nullable|string|max:255',
            'mine' => 'nullable|boolean',
        ]);

        $query = Order::with('items.product', 'items.variation');

        if (!$user->isPrivileged() || $request->boolean('mine')) {
            // A customer sees their own orders: the ones linked to their account
            // and the guest orders placed with the same phone number. The
            // phone is matched across every format it may have been stored in,
            // otherwise an order saved as "0750…" stays invisible to an account
            // saved as "964750…".
            $phoneVariants = PhoneNumber::variants($user->phone);

            $query->where(function ($q) use ($user, $phoneVariants) {
                $q->where('user_id', $user->id);
                if (!empty($phoneVariants)) {
                    $q->orWhereIn('customer_phone', $phoneVariants);
                }
            });
        }

        $this->applyOrderFilters($query, $request);

        $limit = max(1, min((int) $request->input('limit', 50), 200));

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate($limit)
        );
    }

    /**
     * How many orders sit in each status, for the panel's summary chips.
     *
     * The chips used to count the array the browser was holding. That was the
     * whole table, so it was right; against a page it would report "3 pending"
     * when the shop had ninety. Counting in the database keeps the headline
     * honest no matter how little of the list is on screen.
     *
     * Takes the same filters as the list, so the chips describe the view the
     * user is actually looking at.
     */
    public function counts(Request $request)
    {
        $this->checkStaffOrAdmin($request);

        $request->validate([
            'channel' => 'nullable|string|in:pos,online',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'search' => 'nullable|string|max:255',
            'mine' => 'nullable|boolean',
        ]);

        $query = Order::query();
        $this->applyOrderFilters($query, $request);

        $byStatus = $query
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $counts = [];
        foreach (['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] as $status) {
            $counts[$status] = (int) ($byStatus[$status] ?? 0);
        }

        // An order with no status set reads as pending everywhere else, so it
        // has to be counted as pending here too or the chips will not add up.
        $counts['pending'] += (int) ($byStatus[''] ?? 0);
        $counts['total'] = (int) $byStatus->sum();
        $counts['new_and_pending'] = $counts['pending'] + $counts['processing'];

        return response()->json($counts);
    }

    /**
     * The filters the order tables offer, applied in the database.
     *
     * "online" is written as "not POS" rather than as a match on the word, so
     * the two channel filters partition the table exactly: every order shows up
     * under one of them and none can hide from both, whatever ends up in the
     * column.
     */
    private function applyOrderFilters($query, Request $request): void
    {
        // The POS tab shows a cashier their own takings. It is a view filter,
        // not a permission — any of them may still look an order up at the
        // counter to take a return.
        if ($request->boolean('mine') && $request->user()) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->filled('channel')) {
            if ($request->channel === 'pos') {
                $query->where(function ($q) {
                    $q->where('channel', 'pos')
                        ->orWhere('source', 'pos')
                        ->orWhere('customer_name', 'like', '%POS Cash Sale%')
                        ->orWhere('customer_email', 'like', '%cashier@%');
                });
            } else {
                $query->where(function ($q) {
                    $q->where('channel', '!=', 'pos')->orWhereNull('channel');
                })
                ->where(function ($q) {
                    $q->where('source', '!=', 'pos')->orWhereNull('source');
                })
                ->where('customer_name', 'not like', '%POS Cash Sale%')
                ->where(function ($q) {
                    $q->where('customer_email', 'not like', '%cashier@%')->orWhereNull('customer_email');
                });
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from . ' 00:00:00');
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }

        if ($request->filled('search')) {
            $term = '%' . trim($request->search) . '%';
            $phoneVariants = PhoneNumber::variants($request->search);

            $query->where(function ($q) use ($term, $request, $phoneVariants) {
                $q->where('invoice_no', 'like', $term)
                    ->orWhere('customer_name', 'like', $term)
                    ->orWhere('customer_phone', 'like', $term)
                    ->orWhere('shipping_address', 'like', $term)
                    // A shop looks an order up by the number on the receipt, so
                    // the plain id has to match exactly as well.
                    ->orWhere('id', $request->search)
                    // Matching by product means joining the lines; a customer
                    // asking about "the pink dress" is a normal counter request.
                    ->orWhereHas('items', function ($line) use ($term) {
                        $line->where('product_name', 'like', $term)
                            ->orWhere('product_name_ku', 'like', $term)
                            ->orWhere('product_name_ar', 'like', $term)
                            ->orWhere('variation_label', 'like', $term);
                    });

                if (!empty($phoneVariants)) {
                    $q->orWhereIn('customer_phone', $phoneVariants);
                }

                // A shop looks an order up by the number on the receipt. Only
                // worth asking when the search actually is a number — comparing
                // an integer column against a word makes the database coerce
                // every row before it can rule any of them out.
                if (ctype_digit(trim((string) $request->search))) {
                    $q->orWhere('id', (int) trim($request->search));
                }
            });
        }
    }

    /**
     * Staff/admin: look up a customer's history by phone (for POS loyalty).
     */
    public function customerLookup(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        $request->validate(['phone' => 'required|string']);

        // Match on the local part (no country code / leading zero) so a cashier
        // typing 0750…, 750… or +964750… always finds the same customer.
        $phone = PhoneNumber::local($request->phone);
        if ($phone === '') {
            return response()->json(['found' => false]);
        }

        $orders = Order::whereRaw("REPLACE(REPLACE(REPLACE(customer_phone,' ',''),'-',''),'+','') LIKE ?", ['%' . $phone])
            ->where('status', '!=', 'cancelled')
            ->get();

        if ($orders->isEmpty()) {
            return response()->json(['found' => false]);
        }

        return response()->json([
            'found' => true,
            'name' => optional($orders->sortByDesc('created_at')->first())->customer_name,
            'orders_count' => $orders->count(),
            'total_spent' => round((float) $orders->sum('total_amount'), 2),
            'last_order_at' => optional($orders->max('created_at'))?->__toString(),
        ]);
    }

    /**
     * Public order tracking. Requires BOTH the order id and the matching phone
     * number, so orders can't be enumerated by id alone. Returns a limited view.
     */
    public function track(Request $request)
    {
        $request->validate([
            'id' => 'required',
            'phone' => 'required|string',
        ]);

        $order = Order::with('items.product')->find($request->id);
        $phone = preg_replace('/\D/', '', (string) $request->phone);
        $orderPhone = $order ? preg_replace('/\D/', '', (string) $order->customer_phone) : '';

        if (!$order || $phone === '' || $orderPhone === '' || $phone !== $orderPhone) {
            return response()->json(['message' => 'No matching order found.'], 404);
        }

        return response()->json([
            'id' => $order->id,
            'status' => $order->status,
            'created_at' => $order->created_at,
            'total_amount' => $order->total_amount,
            'customer_name' => $order->customer_name,
            'shipping_address' => $order->shipping_address,
            'items' => $order->items->map(fn ($i) => [
                'name' => $i->product_name ?: optional($i->product)->name,
                'quantity' => $i->quantity,
                'price' => $i->price,
            ]),
        ]);
    }

    public function show(Request $request, $id)
    {
        $order = Order::with('items.product', 'items.variation')->findOrFail($id);
        $user = $this->requireAuth($request);

        if (!$user->isPrivileged()) {
            $ownsById    = $order->user_id && $order->user_id == $user->id;
            $ownsByPhone = $user->phone
                && in_array((string) $order->customer_phone, PhoneNumber::variants($user->phone), true);

            if (!$ownsById && !$ownsByPhone) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
        }

        return response()->json($order);
    }

    /**
     * Create an order. Prices, discounts and totals are ALWAYS computed on the
     * server from the database — the client price/total is never trusted. This
     * closes the classic e-commerce price-tampering hole and also persists the
     * line items and decrements stock (which the old implementation never did).
     */
    public function store(Request $request)
    {
        $user = $request->user();
        // Admin + cashier + staff all sell through the POS, so all three count
        // as staff here (this used to exclude the admin role by mistake).
        $isStaff = $user && $user->isPrivileged();

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer|exists:products,id',
            'items.*.product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.name' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:pending,processing,shipped,delivered,cancelled',
            'shipping_address' => 'nullable|string|max:1000',
            'governorate' => 'nullable|string|max:120',
            'payment_method' => 'nullable|string|max:255',
            'customer_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:255',
            'customer_email' => 'nullable|string|email|max:255',
            'coupon_code' => 'nullable|string|max:255',
            'discount_amount' => 'nullable|numeric|min:0',
            'amount_paid' => 'nullable|numeric|min:0',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        try {
            $order = DB::transaction(function () use ($validated, $request, $user, $isStaff) {
                $subtotal = 0;
                $lineItems = [];
                $stockToDeduct = [];

                foreach ($validated['items'] as $item) {
                    $qty = (int) $item['quantity'];
                    $variation = null;
                    $productId = $item['product_id'] ?? null;
                    $unitPrice = null;
                    $product = null;

                    if (!empty($item['product_variation_id'])) {
                        // Lock the row to avoid overselling under concurrent checkout.
                        $variation = ProductVariation::with('product')
                            ->lockForUpdate()
                            ->find($item['product_variation_id']);
                        if ($variation) {
                            $productId = $variation->product_id;
                            $product = $variation->product;
                            $unitPrice = $this->effectiveUnitPrice($product, $variation);

                            // Stock control: never let a customer oversell.
                            if ($variation->stock_quantity < $qty && !$isStaff) {
                                abort(response()->json([
                                    'message' => 'Insufficient stock for one of the selected items.',
                                ], 422));
                            }
                            // Recorded in the stock ledger further down, once
                            // the order exists and can be referenced.
                            $stockToDeduct[] = ['variation' => $variation, 'qty' => $qty];
                        }
                    } elseif (!empty($productId)) {
                        $product = Product::find($productId);
                        if ($product) {
                            $unitPrice = $this->effectiveUnitPrice($product);
                        }
                    }

                    // Custom / POS "quick add" line with no catalog product: only
                    // trusted staff may set an arbitrary price for it.
                    if ($unitPrice === null) {
                        if ($isStaff && isset($item['unit_price'])) {
                            $unitPrice = (float) $item['unit_price'];
                            $productId = null; // not a real catalog product
                        } else {
                            abort(response()->json([
                                'message' => 'Invalid order item: product could not be priced.',
                            ], 422));
                        }
                    }

                    $subtotal += $unitPrice * $qty;

                    // Record what was sold alongside the id. The catalogue can
                    // change or the product can be deleted; the order is a
                    // receipt and must still read correctly years later.
                    $variationLabel = $variation
                        ? trim(implode(' · ', array_filter([$variation->color, $variation->size])))
                        : null;

                    $lineItems[] = [
                        'product_id' => $productId,
                        'product_variation_id' => $item['product_variation_id'] ?? null,
                        'product_name' => $product->name ?? ($item['name'] ?? null),
                        'product_name_ku' => $product->name_ku ?? null,
                        'product_name_ar' => $product->name_ar ?? null,
                        'variation_label' => $variationLabel ?: null,
                        'quantity' => $qty,
                        'price' => $unitPrice,
                    ];
                }

                // Discount — server validates the coupon; POS staff may apply a flat discount.
                $discount = 0;
                $couponCode = null;
                if (!empty($validated['coupon_code'])) {
                    $coupon = Coupon::findRedeemable($validated['coupon_code']);

                    if ($coupon) {
                        // Lock the coupon row for the rest of the transaction so
                        // two shoppers redeeming the last use at the same moment
                        // cannot both get through the limit check.
                        Coupon::where('id', $coupon->id)->lockForUpdate()->first();

                        $problem = $coupon->redemptionProblem(
                            $subtotal,
                            $user->id ?? null,
                            $validated['customer_phone'] ?? ($user->phone ?? null)
                        );

                        if ($problem) {
                            abort(response()->json([
                                'message' => $this->couponProblemMessage($problem, $coupon),
                                'coupon_problem' => $problem,
                            ], 422));
                        }

                        $discount = $subtotal * ((float) $coupon->discount_percentage / 100);
                        $couponCode = $coupon->code;
                    }
                }
                if ($isStaff && isset($validated['discount_amount'])) {
                    $discount += (float) $validated['discount_amount'];
                }

                // Iraqi dinar is used in whole units — round here so receipts,
                // the cash drawer and the shift report cannot disagree by the
                // fractions a percentage discount produces.
                $subtotal = round($subtotal);
                $discount = min(round($discount), $subtotal);
                $goodsTotal = max(0, $subtotal - $discount);

                // Delivery is charged on web orders only — a walk-in customer
                // carries the bag home.
                $shippingFee = $isStaff
                    ? 0.0
                    : Shipping::feeFor($validated['governorate'] ?? null, $goodsTotal);

                $total = $goodsTotal + $shippingFee;

                // Ownership: a customer can only order for themselves.
                $userId = $isStaff
                    ? ($validated['user_id'] ?? ($user->id ?? null))
                    : ($user->id ?? null);

                // Cash handling for POS.
                $amountPaid = ($isStaff && isset($validated['amount_paid']))
                    ? (float) $validated['amount_paid'] : null;
                $changeDue = $amountPaid !== null ? max(0, $amountPaid - $total) : null;

                // Attach the cashier's open shift (POS) and a friendly invoice no.
                $shiftId = null;
                if ($isStaff) {
                    $shift = Shift::where('user_id', $user->id)->where('status', 'open')->first();
                    $shiftId = $shift?->id;
                }
                $order = Order::create([
                    'user_id' => $userId,
                    'shift_id' => $shiftId,
                    'customer_name' => $validated['customer_name'] ?? ($user->name ?? null),
                    // Store the canonical 964… form so "my orders" and the POS
                    // customer lookup find this order whatever format was typed.
                    'customer_phone' => PhoneNumber::normalize(
                        $validated['customer_phone'] ?? ($user->phone ?? null)
                    ),
                    'customer_email' => $validated['customer_email'] ?? ($user->email ?? null),
                    'status' => $isStaff ? ($validated['status'] ?? 'pending') : 'pending',
                    'subtotal' => $subtotal,
                    'discount_amount' => $discount,
                    'shipping_fee' => $shippingFee,
                    'governorate' => $validated['governorate'] ?? null,
                    'coupon_code' => $couponCode,
                    'total_amount' => $total,
                    'amount_paid' => $amountPaid,
                    'change_due' => $changeDue,
                    'shipping_address' => $validated['shipping_address'] ?? null,
                    'payment_method' => $validated['payment_method'] ?? null,
                    'channel' => $isStaff ? 'pos' : 'online',
                ]);

                foreach ($lineItems as $li) {
                    $order->items()->create($li);
                }

                // Invoice number is derived from the order id, which the
                // database has already made unique. The old version counted
                // today's orders and added one, so two cashiers checking out at
                // the same moment produced the SAME invoice number — and the
                // count was an unindexed full scan on every single sale.
                $order->invoice_no = 'INV-' . $order->created_at->format('Ymd') . '-' . str_pad((string) $order->id, 4, '0', STR_PAD_LEFT);
                $order->save();

                // Stock ledger: one entry per line, pointing back at the order.
                foreach ($stockToDeduct as $deduction) {
                    StockLedger::move(
                        $deduction['variation'],
                        -$deduction['qty'],
                        StockMovement::TYPE_SALE,
                        $order->invoice_no,
                        $order->id,
                        $user->id ?? null
                    );
                }

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => null,
                    'to_status' => $order->status,
                    'user_id' => $user->id ?? null,
                    'note' => $isStaff ? 'POS sale' : 'Placed online',
                ]);

                return $order;
            });
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            throw $e;
        }

        return response()->json($order->load('items.product', 'items.variation'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = $this->requirePrivileged($request);
        $order = Order::findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:pending,processing,shipped,delivered,cancelled,returned',
            'shipping_address' => 'sometimes|nullable|string|max:1000',
            'payment_method' => 'sometimes|nullable|string|max:255',
            'note' => 'sometimes|nullable|string|max:500',
        ]);

        $previousStatus = $order->status;

        DB::transaction(function () use ($order, $validated, $user, $previousStatus) {
            $order->update(collect($validated)->except('note')->all());
            StockLedger::reconcileOrderStatus($order, $previousStatus, $order->status, $user->id);
        });

        $newStatus = $order->status;

        if ($newStatus !== $previousStatus) {
            // Tell the customer their order moved on. Best-effort: a failed SMS
            // must not undo the status change.
            $notified = app(CustomerNotifier::class)->orderStatusChanged($order, $newStatus);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $previousStatus,
                'to_status' => $newStatus,
                'user_id' => $user->id,
                'note' => $validated['note'] ?? null,
                'customer_notified' => $notified,
            ]);

            ActivityLogger::log(
                'order.status_changed',
                'order',
                $order->id,
                ($order->invoice_no ?: "#{$order->id}") . ": {$previousStatus} → {$newStatus}",
                ['status' => [$previousStatus, $newStatus]]
            );
        }

        return response()->json($order->load('items.product', 'items.variation'));
    }

    /** Status changes for one order, newest first. */
    public function history(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);

        return response()->json(
            OrderStatusHistory::with('user:id,name')
                ->where('order_id', $id)
                ->orderByDesc('created_at')
                ->get()
        );
    }

    /**
     * Cancel / refund an order and return its stock to inventory. Staff/admin only.
     */
    public function destroy(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);

        $order = Order::with('items')->find($id);
        if (!$order) {
            return response()->json(['message' => 'Order already deleted or not found.'], 200);
        }

        $actorId = $request->user()->id;
        $label = $order->invoice_no ?: ('#' . $order->id);

        DB::transaction(function () use ($order, $actorId, $label) {
            // Restock anything still owed. A cancelled order was already put
            // back by the status change, and a returned one line by line by the
            // refund, so neither is restocked again here.
            if (!in_array($order->status, Order::STATUSES_WITHOUT_STOCK_HELD, true)) {
                foreach ($order->items as $item) {
                    if ($item->product_variation_id) {
                        $variation = ProductVariation::lockForUpdate()->find($item->product_variation_id);
                        if ($variation) {
                            StockLedger::move(
                                $variation,
                                (int) $item->quantity,
                                StockMovement::TYPE_ADJUSTMENT,
                                'Order deleted: ' . $label,
                                null,
                                $actorId
                            );
                        }
                    }
                }
            }

            $order->delete();
        });

        // Deleting a sale removes money from every report — always leave a trace.
        ActivityLogger::log('order.deleted', 'order', $id, 'Deleted order ' . $label);

        return response()->json(['message' => 'Order deleted successfully.'], 200);
    }

    /**
     * Refund / return items from an order (POS returns). Restocks the returned
     * quantities, records a refund (linked to the cashier's shift for the
     * Z-report), and updates the order's refunded amount / status. Staff/admin.
     */
    public function refund(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
        $user = $request->user();

        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.order_item_id' => 'required|integer|exists:order_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:1000',
        ]);

        $result = DB::transaction(function () use ($data, $id, $user) {
            $order = Order::with('items')->lockForUpdate()->findOrFail($id);

            // How much of each line has already been given back. Without this
            // the same item could be refunded over and over: every call paid
            // out again and put the stock back again.
            $alreadyRefunded = $order->returnedQuantitiesByItem();

            // The share of the ticket price the customer actually paid, with
            // delivery excluded. This used to divide the total — which includes
            // the delivery fee — by the goods subtotal, so the ratio came out
            // above 1 and every refund handed the delivery fee back on top of
            // the item.
            $paidRatio = $order->paidRatio();

            $amount = 0;
            $snapshot = [];

            foreach ($data['items'] as $line) {
                $item = $order->items->firstWhere('id', $line['order_item_id']);
                if (!$item) {
                    abort(response()->json(['message' => 'Item does not belong to this order.'], 422));
                }

                $refundable = (int) $item->quantity - (int) ($alreadyRefunded[$item->id] ?? 0);
                $qty = min((int) $line['quantity'], $refundable);
                if ($qty <= 0) continue;

                $amount += (float) $item->price * $qty * $paidRatio;
                $snapshot[] = ['order_item_id' => $item->id, 'quantity' => $qty, 'price' => (float) $item->price];

                // Record it on the line as well as in the refund. The reports
                // net returned pieces out of what was sold, and they can only
                // do that against a column.
                $item->returned_quantity = (int) $item->returned_quantity + $qty;
                $item->save();

                // Return stock.
                if ($item->product_variation_id) {
                    $variation = ProductVariation::lockForUpdate()->find($item->product_variation_id);
                    if ($variation) {
                        StockLedger::move(
                            $variation,
                            $qty,
                            StockMovement::TYPE_REFUND,
                            'Refund for ' . ($order->invoice_no ?: ('#' . $order->id)),
                            $order->id,
                            $user->id
                        );
                    }
                }
            }

            if ($amount <= 0) {
                abort(response()->json([
                    'message' => 'Nothing left to refund on this order.',
                ], 422));
            }

            $shift = Shift::where('user_id', $user->id)->where('status', 'open')->first();

            $refund = Refund::create([
                'order_id' => $order->id,
                'user_id' => $user->id,
                'shift_id' => $shift?->id,
                'amount' => round($amount),
                'reason' => $data['reason'] ?? null,
                'items' => $snapshot,
            ]);

            $order->refunded_amount = min(
                (float) $order->refunded_amount + round($amount),
                (float) $order->total_amount
            );

            // Counted in units, not money: an order charged for delivery can
            // never refund up to its total, so the old money comparison never
            // fired on an online sale. A fully returned order is also recorded
            // as `returned` rather than `cancelled` — the shop needs to tell
            // "the customer brought it back" from "it was called off".
            $order->save();
            if ($order->isFullyReturned()) {
                $order->status = Order::STATUS_RETURNED;
                $order->save();
            }

            ActivityLogger::log(
                'order.refunded',
                'order',
                $order->id,
                'Refunded ' . round($amount) . ' on ' . ($order->invoice_no ?: ('#' . $order->id))
            );

            return ['refund' => $refund, 'order' => $order->load('items.product', 'items.variation')];
        });

        return response()->json($result, 201);
    }
}
