<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    /**
     * Public submission of contact inquiries.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'nullable|string|email|max:255',
            'phone'   => 'nullable|string|max:50',
            'message' => 'required|string|max:5000',
        ]);

        if (!$request->filled('email') && !$request->filled('phone')) {
            return response()->json([
                'message' => 'تکایە ئیمەیڵ یان ژمارەی مۆبایل بنووسە بۆ ئەوەی بتوانین وەڵامت بدەینەوە.',
            ], 422);
        }

        $phone = $request->filled('phone') ? PhoneNumber::normalize($request->input('phone')) ?? $request->input('phone') : null;

        $msg = ContactMessage::create([
            'name'       => trim($request->input('name')),
            'email'      => $request->filled('email') ? strtolower(trim($request->input('email'))) : null,
            'phone'      => $phone,
            'message'    => trim($request->input('message')),
            'status'     => 'unread',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'سوپاس بۆ پەیوەندیکردنت! پەیامەکەت بە سەرکەوتوویی گەیشت و لە نزیکترین کاتدا وەڵامت دەدەینەوە.',
            'data'    => $msg,
        ], 201);
    }

    /**
     * Admin/Staff list of received contact inquiries.
     */
    public function index(Request $request)
    {
        $this->requirePrivileged($request);

        $query = ContactMessage::orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('email', 'like', $term)
                  ->orWhere('phone', 'like', $term)
                  ->orWhere('message', 'like', $term);
            });
        }

        $limit = max(1, min((int) $request->input('limit', 20), 100));

        return response()->json($query->paginate($limit));
    }

    /**
     * Mark a message as read or update status.
     */
    public function markRead(Request $request, $id)
    {
        $this->requirePrivileged($request);

        $msg = ContactMessage::findOrFail($id);
        $status = $request->input('status', 'read');
        if (!in_array($status, ['unread', 'read', 'replied'], true)) {
            $status = 'read';
        }

        $msg->status = $status;
        $msg->save();

        return response()->json([
            'success' => true,
            'data'    => $msg,
        ]);
    }

    /**
     * Delete an inquiry.
     */
    public function destroy(Request $request, $id)
    {
        $this->requirePrivileged($request);

        $msg = ContactMessage::findOrFail($id);
        $msg->delete();

        return response()->json([
            'success' => true,
            'message' => 'پەیامەکە بە سەرکەوتوویی سڕدرایەوە.',
        ]);
    }

    /**
     * Unread messages count for badges.
     */
    public function unreadCount(Request $request)
    {
        $this->requirePrivileged($request);

        $count = ContactMessage::where('status', 'unread')->count();

        return response()->json([
            'unread' => $count,
        ]);
    }
}
