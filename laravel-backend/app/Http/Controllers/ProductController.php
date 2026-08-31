<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // `light=1` skips the reviews. The inventory audit pulls the whole
        // catalogue and only needs stock and prices — shipping every review of
        // every product made that response many times larger than necessary.
        $query = $request->boolean('light')
            ? Product::with('variations')
            : Product::with(['variations', 'reviews']);

        // Filter by category_id
        if ($request->has('category_id') && $request->category_id != '') {
            $query->where('category_id', $request->category_id);
        }

        // Filter by gender if column exists safely
        if ($request->has('gender') && $request->gender != '') {
            if (\Illuminate\Support\Facades\Schema::hasColumn('products', 'gender')) {
                $query->where('gender', $request->gender);
            }
        }

        // Filter by in_stock
        if ($request->has('in_stock') && $request->in_stock == '1') {
            $query->whereHas('variations', function ($q) {
                $q->where('stock_quantity', '>', 0);
            });
        }

        // Filter by colors
        if ($request->has('colors') && is_array($request->colors) && count($request->colors) > 0) {
            $query->whereHas('variations', function ($q) use ($request) {
                $q->whereIn('color', $request->colors);
            });
        }

        // Filter by sizes
        if ($request->has('sizes') && is_array($request->sizes) && count($request->sizes) > 0) {
            $query->whereHas('variations', function ($q) use ($request) {
                $q->whereIn('size', $request->sizes);
            });
        }

        // Name, description, the product's own barcode, and the barcode of any
        // one of its variations.
        //
        // A product's barcode is its `sku` column — `barcode` on the model is
        // an accessor over it, and the panel writes the two together. There is
        // no `products.barcode` column, so matching one asked the database for
        // a field it does not have: on MySQL that is an error, and every
        // search in the shop and the panel came back as a 500. SQLite quietly
        // read it as the text "barcode" instead, which is why it looked fine.
        if ($request->has('search') && $request->search != '') {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_ku', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('description_ku', 'like', "%{$search}%")
                  ->orWhere('description_ar', 'like', "%{$search}%")
                  ->orWhereHas('variations', function ($vq) use ($search) {
                      $vq->where('barcode', 'like', "%{$search}%")
                         ->orWhere('sku', 'like', "%{$search}%");
                  });
            });
        }

        // Price range filter (uses the effective selling price where discounted)
        if ($request->filled('min_price')) {
            $query->whereRaw('COALESCE(discount_price, price) >= ?', [(float) $request->min_price]);
        }
        if ($request->filled('max_price')) {
            $query->whereRaw('COALESCE(discount_price, price) <= ?', [(float) $request->max_price]);
        }

        // Sorting (whitelisted to avoid SQL injection via ORDER BY)
        switch ($request->input('sort')) {
            case 'price_asc':
                $query->orderByRaw('COALESCE(discount_price, price) ASC');
                break;
            case 'price_desc':
                $query->orderByRaw('COALESCE(discount_price, price) DESC');
                break;
            case 'name_asc':
                $query->orderBy('name', 'asc');
                break;
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc');
                break;
        }

        // Pagination. The page size is clamped so one request can't be made to
        // pull the entire table (the inventory audit pages through it instead).
        if ($request->has('page')) {
            $limit = max(1, min((int) $request->input('limit', 10), 100));

            return response()->json($query->paginate($limit));
        }

        // No page requested: unchanged behaviour, return the full result set.
        return response()->json($query->get());
    }

    public function show($id)
    {
        $product = Product::with(['variations', 'reviews'])->findOrFail($id);
        return response()->json($product);
    }

    /**
     * Public: best-selling products by quantity sold on non-cancelled orders.
     * Falls back to newest products when there are not enough sales yet.
     */
    public function bestSellers(Request $request)
    {
        $limit = min((int) $request->input('limit', 10), 20);

        $topIds = \App\Models\OrderItem::whereNotNull('product_id')
            ->whereHas('order', function ($q) {
                $q->where('status', '!=', 'cancelled');
            })
            ->select('product_id', \Illuminate\Support\Facades\DB::raw('SUM(quantity) as sold'))
            ->groupBy('product_id')
            ->orderByDesc('sold')
            ->limit($limit)
            ->pluck('product_id')
            ->all();

        $products = Product::with(['variations', 'reviews'])
            ->whereIn('id', $topIds ?: [0])
            ->get()
            ->sortBy(function ($p) use ($topIds) {
                return array_search($p->id, $topIds);
            })->values();

        // Top up with newest products if there aren't enough sales-based results.
        if ($products->count() < $limit) {
            $fill = Product::with(['variations', 'reviews'])
                ->whereNotIn('id', $products->pluck('id')->all() ?: [0])
                ->orderByDesc('created_at')
                ->limit($limit - $products->count())
                ->get();
            $products = $products->concat($fill);
        }

        return response()->json($products);
    }

    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    private function validateProduct(Request $request, bool $partial = false)
    {
        $req = $partial ? 'sometimes|required' : 'required';
        $data = $request->validate([
            'name' => $req . '|string|max:255',
            'name_ku' => 'nullable|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_ku' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'price' => $req . '|numeric|min:0',
            // A discount above the normal price would charge the customer MORE
            // than the price shown struck through next to it.
            'discount_price' => 'nullable|numeric|min:0|lte:price',
            'cost' => 'nullable|numeric|min:0',
            'image_url' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'gender' => 'nullable|integer|in:0,1,2',
            'sku' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:255',
        ]);

        // "No discount" must be stored as NULL. A 0 here used to mean the item
        // was priced at zero, because the order code read
        // `discount_price ?? price` and 0 is not null — i.e. free products.
        if (array_key_exists('discount_price', $data)
            && ($data['discount_price'] === '' || $data['discount_price'] === null || (float) $data['discount_price'] <= 0)) {
            $data['discount_price'] = null;
        }

        // The barcode is where the product's code actually lives; `sku` is the
        // column holding it. Copying it only when `sku` was empty meant editing
        // the barcode of a product that already had one changed nothing.
        if (!empty($data['barcode'])) {
            $data['sku'] = $data['barcode'];
        }
        unset($data['barcode']);
        if (isset($data['images']) && is_array($data['images']) && count($data['images']) > 0) {
            if (empty($data['image_url'])) {
                $data['image_url'] = $data['images'][0];
            }
        } elseif (!empty($data['image_url']) && empty($data['images'])) {
            $data['images'] = [$data['image_url']];
        }

        return $data;
    }

    /**
     * Upload one or more product images. Stores them under public/uploads/products
     * and returns absolute URLs. Staff/admin only.
     */
    public function uploadImages(Request $request)
    {
        $this->requirePermission($request, 'products.manage');

        $request->validate([
            'images' => 'required|array|max:10',
            'images.*' => 'image|mimes:jpeg,jpg,png,webp,gif|max:10240', // 10 MB each
        ]);

        $dir = public_path('uploads/products');
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        // SECURITY: the stored extension is derived from the file's real type,
        // never from the uploaded filename. Taking the client's extension meant
        // an image/PHP polyglot uploaded as "evil.php" passed the image checks
        // and was then written into a web-served directory as .php.
        $allowed = [
            'image/jpeg' => 'jpg',
            'image/pjpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
        ];

        $urls = [];
        foreach ($request->file('images', []) as $file) {
            $mime = strtolower((string) $file->getMimeType());
            $ext = $allowed[$mime] ?? null;
            if (!$ext) {
                abort(response()->json(['message' => 'Unsupported image type.'], 422));
            }

            $name = 'p_' . date('Ymd') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $file->move($dir, $name);
            // Serve through the API route (guaranteed reachable via /API/api/...),
            // which avoids shared-hosting document-root mismatches where
            // /API/uploads/... is not web-accessible.
            $urls[] = rtrim($request->root(), '/') . '/api/media/products/' . $name;
        }

        return response()->json(['urls' => $urls]);
    }

    /**
     * Public: stream an uploaded product image. Goes through Laravel routing so
     * it works regardless of how the host maps the document root.
     */
    public function media($name)
    {
        // Only allow the filenames we generate — block path traversal.
        if (!preg_match('/^[A-Za-z0-9_\.\-]+$/', $name) || str_contains($name, '..')) {
            abort(404);
        }
        $path = public_path('uploads/products/' . basename($name));
        if (!is_file($path)) {
            abort(404);
        }
        return response()->file($path, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }

    /**
     * Persist the color/size/stock variations sent with a product. On update we
     * replace the whole set so the edited list is exactly what is saved.
     */
    private function syncVariations(Product $product, $variations, bool $replace = false)
    {
        if (!is_array($variations)) return;

        if ($replace) {
            $product->variations()->delete();
        }

        foreach ($variations as $v) {
            if (!is_array($v)) continue;
            $color = $v['color'] ?? null;
            $size = $v['size'] ?? null;
            $stock = (int) ($v['stock_quantity'] ?? $v['stockQuantity'] ?? 0);
            $barcode = $v['barcode'] ?? $v['sku'] ?? null;
            $sku = $v['sku'] ?? $v['barcode'] ?? null;

            // Skip empty rows.
            if (($color === null || $color === '') && ($size === null || $size === '') && $stock === 0 && ($barcode === null || $barcode === '')) continue;

            $product->variations()->create([
                'color' => $color,
                'size' => $size,
                'stock_quantity' => $stock,
                'sku' => $sku,
                'barcode' => $barcode,
                'price_override' => isset($v['price_override']) ? (float) $v['price_override'] : null,
            ]);
        }
    }

    public function store(Request $request)
    {
        $this->requirePermission($request, 'products.manage');
        $product = Product::create($this->validateProduct($request));
        $this->syncVariations($product, $request->input('variations', []));

        ActivityLogger::log('product.created', 'product', $product->id, $product->name);

        return response()->json($product->load('variations'), 201);
    }

    public function update(Request $request, $id)
    {
        $this->requirePermission($request, 'products.manage');
        $product = Product::findOrFail($id);

        $before = $product->only(['name', 'price', 'discount_price', 'cost', 'category_id']);
        $product->update($this->validateProduct($request, true));

        // Only touch variations when the client actually sent them.
        if ($request->has('variations')) {
            $this->syncVariations($product, $request->input('variations', []), true);
        }

        // Price and cost edits move every report — record who changed them.
        $changes = ActivityLogger::diff(
            $before,
            $product->only(['name', 'price', 'discount_price', 'cost', 'category_id']),
            ['name', 'price', 'discount_price', 'cost', 'category_id']
        );

        if ($changes) {
            ActivityLogger::log('product.updated', 'product', $product->id, $product->name, $changes);
        }

        return response()->json($product->load('variations'));
    }

    public function destroy(Request $request, $id)
    {
        $this->requirePermission($request, 'products.delete');
        $product = Product::findOrFail($id);
        $name = $product->name;
        $product->delete();

        ActivityLogger::log('product.deleted', 'product', $id, $name);

        return response()->json(null, 204);
    }
}
