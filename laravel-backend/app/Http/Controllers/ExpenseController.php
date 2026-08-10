<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    private function checkStaffOrAdmin(Request $request)
    {
        // 1 = admin, 2 = cashier, 3 = staff (see App\Support\Roles).
        $this->requirePrivileged($request);
    }

    public function index(Request $request)
    {
        $this->checkStaffOrAdmin($request);
        return response()->json(Expense::orderBy('date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $this->checkStaffOrAdmin($request);
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
        $this->checkStaffOrAdmin($request);
        $expense = Expense::findOrFail($id);
        return response()->json($expense);
    }

    public function update(Request $request, $id)
    {
        $this->checkStaffOrAdmin($request);
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
        $this->checkStaffOrAdmin($request);
        $expense = Expense::findOrFail($id);
        $expense->delete();
        return response()->json(null, 204);
    }
}
