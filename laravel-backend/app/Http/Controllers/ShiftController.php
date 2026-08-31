<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use App\Models\Order;
use App\Models\Refund;
use App\Models\CashMovement;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftController extends Controller
{
    // Each method now names the permission it needs — running a till is
    // `pos.access`, reading what it took is `pos.reports` — so there is no
    // single guard left to share.

    /** The current open shift for the logged-in cashier (or null). */
    public function current(Request $request)
    {
        $this->requirePermission($request, 'pos.access');
        try {
            $shift = Shift::where('user_id', $request->user()->id)->where('status', 'open')->first();
            return response()->json($shift);
        } catch (\Exception $e) {
            return response()->json(null);
        }
    }

    public function open(Request $request)
    {
        $this->requirePermission($request, 'pos.access');
        $user = $request->user();

        try {
            $existing = Shift::where('user_id', $user->id)->where('status', 'open')->first();
            if ($existing) {
                return response()->json($existing); // already open — return it
            }

            $request->validate(['opening_float' => 'nullable|numeric|min:0']);

            $shift = Shift::create([
                'user_id' => $user->id,
                'opening_float' => (float) $request->input('opening_float', 0),
                'status' => 'open',
                'opened_at' => now(),
            ]);

            return response()->json($shift, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            // Never hand back a made-up shift id: sales would then be recorded
            // with no shift, and the Z-report would silently miss them.
            \Illuminate\Support\Facades\Log::error('Could not open shift: ' . $e->getMessage());

            return response()->json([
                'message' => 'Could not open the shift. Please try again.',
            ], 500);
        }
    }

    /**
     * Build the Z-report totals for a shift.
     *
     * Every order carrying this shift_id is a completed till sale, so all of
     * them count towards the money that entered the drawer — including the ones
     * later marked "cancelled".
     *
     * That matters: a full refund sets the order's status to cancelled. The old
     * version filtered those orders out of the sales figure AND subtracted the
     * refund, so one fully refunded cash sale made the drawer look short by
     * exactly that amount and the cashier was blamed for a shortage that never
     * happened.
     */
    private function summary(Shift $shift): array
    {
        $orders = Order::where('shift_id', $shift->id)->get();

        $cashSales = (float) $orders->where('payment_method', 'cash')->sum('total_amount');
        $cardSales = (float) $orders->where('payment_method', 'card')->sum('total_amount');
        $refundsTotal = (float) Refund::where('shift_id', $shift->id)->sum('amount');

        // Cash paid into or taken out of the drawer outside of a sale (paying a
        // driver, buying supplies). Without these the count never matched.
        $cashIn = (float) CashMovement::where('shift_id', $shift->id)
            ->where('direction', CashMovement::IN)->sum('amount');
        $cashOut = (float) CashMovement::where('shift_id', $shift->id)
            ->where('direction', CashMovement::OUT)->sum('amount');

        $expected = (float) $shift->opening_float + $cashSales - $refundsTotal + $cashIn - $cashOut;

        return [
            'orders_count' => $orders->count(),
            'cash_sales' => round($cashSales),
            'card_sales' => round($cardSales),
            'total_sales' => round((float) $orders->sum('total_amount')),
            'refunds' => round($refundsTotal),
            'cash_in' => round($cashIn),
            'cash_out' => round($cashOut),
            'opening_float' => round((float) $shift->opening_float),
            'expected_cash' => round($expected),
        ];
    }

    /** Live preview of the current shift's Z-report (before closing). */
    public function report(Request $request)
    {
        $this->requirePermission($request, 'pos.reports');
        $shift = Shift::where('user_id', $request->user()->id)->where('status', 'open')->first();
        if (!$shift) {
            return response()->json(['message' => 'No open shift.'], 404);
        }
        return response()->json(['shift' => $shift, 'summary' => $this->summary($shift)]);
    }

    public function close(Request $request)
    {
        $this->requirePermission($request, 'pos.access');
        $request->validate([
            'counted_cash' => 'required|numeric|min:0',
            'note' => 'nullable|string|max:1000',
        ]);

        $shift = Shift::where('user_id', $request->user()->id)->where('status', 'open')->first();
        if (!$shift) {
            return response()->json(['message' => 'No open shift to close.'], 404);
        }

        $summary = $this->summary($shift);
        $counted = (float) $request->counted_cash;

        $shift->update([
            'counted_cash' => $counted,
            'expected_cash' => $summary['expected_cash'],
            'difference' => round($counted - $summary['expected_cash'], 2),
            'status' => 'closed',
            'note' => $request->note,
            'closed_at' => now(),
        ]);

        return response()->json(['shift' => $shift, 'summary' => $summary]);
    }

    /**
     * Record cash moving into or out of the drawer outside a sale.
     */
    public function cashMovement(Request $request)
    {
        $this->requirePermission($request, 'pos.access');
        $user = $request->user();

        $data = $request->validate([
            'direction' => 'required|string|in:in,out',
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string|max:255',
        ]);

        $shift = Shift::where('user_id', $user->id)->where('status', 'open')->first();
        if (!$shift) {
            return response()->json(['message' => 'Open a shift first.'], 422);
        }

        $movement = CashMovement::create([
            'shift_id' => $shift->id,
            'user_id' => $user->id,
            'direction' => $data['direction'],
            'amount' => round((float) $data['amount']),
            'reason' => $data['reason'],
        ]);

        ActivityLogger::log(
            'cash.' . $data['direction'],
            'shift',
            $shift->id,
            $data['direction'] === 'in' ? 'Cash in: ' . $data['reason'] : 'Cash out: ' . $data['reason'],
            ['amount' => [null, $movement->amount]]
        );

        return response()->json([
            'movement' => $movement,
            'summary' => $this->summary($shift->fresh()),
        ], 201);
    }

    /** Cash movements for the cashier's open shift. */
    public function cashMovements(Request $request)
    {
        $this->requirePermission($request, 'pos.access');

        $shift = Shift::where('user_id', $request->user()->id)->where('status', 'open')->first();
        if (!$shift) {
            return response()->json([]);
        }

        return response()->json(
            CashMovement::where('shift_id', $shift->id)->orderByDesc('created_at')->get()
        );
    }

    /** Admin: list recent shifts (Z-report history). */
    public function index(Request $request)
    {
        $this->requireAdmin($request);
        return response()->json(
            Shift::with('user:id,name')->orderByDesc('opened_at')->limit(100)->get()
        );
    }
}
