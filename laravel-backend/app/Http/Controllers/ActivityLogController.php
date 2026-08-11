<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /** Admin only: the trail is about holding staff accountable. */
    public function index(Request $request)
    {
        $this->requireAdmin($request);

        $request->validate([
            'action' => 'nullable|string|max:60',
            'user_id' => 'nullable|integer',
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $query = ActivityLog::with('user:id,name')->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', 'like', $request->input('action') . '%');
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from') . ' 00:00:00');
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to') . ' 23:59:59');
        }

        $limit = max(1, min((int) $request->input('limit', 50), 200));

        return response()->json($query->paginate($limit));
    }
}
