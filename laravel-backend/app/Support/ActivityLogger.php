<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Records who did what. Never throws: an audit trail must not be able to break
 * the action it is recording.
 */
final class ActivityLogger
{
    public static function log(
        string $action,
        ?string $subjectType = null,
        $subjectId = null,
        ?string $summary = null,
        array $changes = []
    ): void {
        try {
            $user = Auth::user();

            ActivityLog::create([
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'action' => $action,
                'subject_type' => $subjectType,
                'subject_id' => $subjectId === null ? null : (string) $subjectId,
                'summary' => $summary ? mb_substr($summary, 0, 500) : null,
                'changes' => $changes ?: null,
                'ip' => Request::ip(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Activity log failed: ' . $e->getMessage());
        }
    }

    /**
     * Field-by-field difference, for logging an edit.
     * Only the listed fields are compared, and only real changes are returned.
     */
    public static function diff(array $before, array $after, array $fields): array
    {
        $changes = [];

        foreach ($fields as $field) {
            $old = $before[$field] ?? null;
            $new = $after[$field] ?? null;

            // Loose compare so "100" and 100 are not reported as a change.
            if ((string) $old !== (string) $new) {
                $changes[$field] = [$old, $new];
            }
        }

        return $changes;
    }
}
