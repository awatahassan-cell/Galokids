<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePermission($request, 'expenses.manage');
    }

    /**
     * The expense list, a page at a time when the caller asks for one.
     *
     * A shop records these every day and never deletes them, so the table only
     * grows. The reports total expenses in SQL, so nothing here needs the whole
     * list in hand any more.
     */
    public function index(Request $request)
    {
        $this->requirePermission($request, 'expenses.manage');

        $request->validate([
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'category' => 'nullable|string|max:255',
        ]);

        $query = Expense::orderBy('date', 'desc');

        if ($request->filled('from')) {
            $query->whereDate('date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('date', '<=', $request->to);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('page')) {
            $limit = max(1, min((int) $request->input('limit', 25), 200));

            return response()->json($query->paginate($limit));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $this->requirePermission($request, 'expenses.manage');
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'category' => 'required|string|max:255',
            'description' => 'nullable|string',
            'date' => 'required|date',
        ]);

        $expense = Expense::create($request->all());
        return response()->json($expense, 201);
    }

    public function show(Request $request, $id)
    {
        $this->requirePermission($request, 'expenses.manage');
        $expense = Expense::findOrFail($id);
        return response()->json($expense);
    }

    public function update(Request $request, $id)
    {
        $this->requirePermission($request, 'expenses.manage');
        $expense = Expense::findOrFail($id);

        $request->validate([
            'amount' => 'sometimes|required|numeric|min:0',
            'category' => 'sometimes|required|string|max:255',
            'date' => 'sometimes|required|date',
        ]);

        $expense->update($request->all());
        return response()->json($expense);
    }

    public function destroy(Request $request, $id)
    {
        $this->requirePermission($request, 'expenses.manage');
        $expense = Expense::findOrFail($id);
        $expense->delete();
        return response()->json(null, 204);
    }
}
