<?php

namespace App\Http\Controllers;

use App\Models\Look;
use App\Models\LookItem;
use App\Models\Product;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * "Try the Look": outfits shown on a model, each made of real products.
 *
 * The list is public — the storefront and the customer app read it — and shows
 * only what a shopper may see: active looks, and inside them only products that
 * are still on the website. A look whose every product has been taken down is
 * left out rather than shown empty. The back office asks for everything with
 * `?all=1`; managing looks is the same permission as managing products.
 */
class LookController extends Controller
{
    public function index(Request $request)
    {
        $staff = Product::viewerIsPrivileged() && $request->boolean('all');

        $query = Look::query()->orderBy('sort_order')->orderBy('id');
        if (!$staff) {
            $query->where('is_active', true);
        }

        $query->with(['items.product' => fn ($q) => $q->with('variations')]);

        $looks = $query->get()->map(function (Look $look) use ($staff) {
            if (!$staff) {
                // Products taken off the website stay off it, here too.
                $look->setRelation(
                    'items',
                    $look->items->filter(fn (LookItem $item) => $item->product && $item->product->is_active)->values()
                );
            }

            return $look;
        });

        if (!$staff) {
            $looks = $looks->filter(fn (Look $look) => $look->items->isNotEmpty())->values();
        }

        return response()->json($looks);
    }

    public function store(Request $request)
    {
        $this->requirePermission($request, 'products.manage');

        $look = DB::transaction(function () use ($request) {
            $data = $this->validated($request);
            $look = Look::create($this->attributes($data) + ['sort_order' => (int) Look::max('sort_order') + 1]);
            $this->syncItems($look, $data['items']);

            return $look;
        });

        ActivityLogger::log('look.created', 'look', $look->id, $look->title);

        return response()->json($this->fresh($look), 201);
    }

    public function update(Request $request, $id)
    {
        $this->requirePermission($request, 'products.manage');
        $look = Look::findOrFail($id);

        DB::transaction(function () use ($request, $look) {
            $data = $this->validated($request);
            $look->update($this->attributes($data));
            $this->syncItems($look, $data['items']);
        });

        ActivityLogger::log('look.updated', 'look', $look->id, $look->title);

        return response()->json($this->fresh($look));
    }

    public function destroy(Request $request, $id)
    {
        $this->requirePermission($request, 'products.manage');
        $look = Look::findOrFail($id);
        $title = $look->title;
        $look->delete();

        ActivityLogger::log('look.deleted', 'look', $id, $title);

        return response()->json(null, 204);
    }

    /** The order the looks stand in on the page, as the ids in that order. */
    public function reorder(Request $request)
    {
        $this->requirePermission($request, 'products.manage');
        $data = $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:looks,id']);

        DB::transaction(function () use ($data) {
            foreach (array_values($data['ids']) as $position => $id) {
                Look::where('id', $id)->update(['sort_order' => $position]);
            }
        });

        return response()->json(['message' => 'ok']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:255',
            'title_ku' => 'nullable|string|max:255',
            'title_ar' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:1000',
            'subtitle_ku' => 'nullable|string|max:1000',
            'subtitle_ar' => 'nullable|string|max:1000',
            'gender' => 'nullable|integer|in:0,1,2',
            'age_range' => 'nullable|string|max:60',
            'accent_color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'image_url' => 'required|string',
            'is_active' => 'nullable|boolean',
            'items' => 'required|array|min:1|max:12',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.slot' => 'nullable|string|in:' . implode(',', LookItem::SLOTS),
            'items.*.hotspot_x' => 'nullable|numeric|min:0|max:100',
            'items.*.hotspot_y' => 'nullable|numeric|min:0|max:100',
        ]);
    }

    /** The look's own columns, with the defaults a blank form leaves out. */
    private function attributes(array $data): array
    {
        $attrs = collect($data)->except('items')->all();
        $attrs['gender'] = $attrs['gender'] ?? 0;
        $attrs['accent_color'] = $attrs['accent_color'] ?? '#141518';
        $attrs['is_active'] = $attrs['is_active'] ?? true;

        return $attrs;
    }

    /** Replace the look's pieces with exactly these, in this order. */
    private function syncItems(Look $look, array $items): void
    {
        $look->items()->delete();

        foreach (array_values($items) as $position => $item) {
            $look->items()->create([
                'product_id' => $item['product_id'],
                'slot' => $item['slot'] ?? 'top',
                'hotspot_x' => $item['hotspot_x'] ?? 50,
                'hotspot_y' => $item['hotspot_y'] ?? 50,
                'sort_order' => $position,
            ]);
        }
    }

    private function fresh(Look $look): Look
    {
        return Look::with(['items.product' => fn ($q) => $q->with('variations')])->findOrFail($look->id);
    }
}
