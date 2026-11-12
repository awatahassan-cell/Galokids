<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        // PERFORMANCE: the category list (nav/sidebar) is a hot path. Eager-loading
        // every product of every category shipped a huge payload the UI never used.
        // Return a lightweight product_count instead.
        return response()->json(Category::withCount('products')->get());
    }

    public function show($id)
    {
        // Its products, minus the ones taken off the website.
        //
        // This route is public, and it was eager-loading the lot: a product
        // deactivated in the panel was still served here, in full, to anyone
        // who asked for the category it belongs to — the same enumeration of
        // taken-down stock that filtering the catalogue was meant to close.
        $category = Category::with(['products' => fn ($q) => $q->visibleToViewer()])
            ->findOrFail($id);

        return response()->json($category);
    }

    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    public function store(Request $request)
    {
        $this->requirePermission($request, 'categories.manage');
        $request->validate([
            'name' => 'required|string|max:255',
            'name_ku' => 'nullable|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'slug' => 'required|string|unique:categories,slug',
            'icon' => 'nullable|string|max:255',
        ]);

        $category = Category::create($request->all());
        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        $this->requirePermission($request, 'categories.manage');
        $category = Category::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_ku' => 'nullable|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'slug' => 'sometimes|required|string|unique:categories,slug,' . $id,
            'icon' => 'nullable|string|max:255',
        ]);

        $category->update($request->all());
        return response()->json($category);
    }

    public function destroy(Request $request, $id)
    {
        $this->requirePermission($request, 'categories.manage');
        Category::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
