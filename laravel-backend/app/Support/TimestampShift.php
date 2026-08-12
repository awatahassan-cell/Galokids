<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Move every stored timestamp by a fixed number of hours.
 *
 * Laravel writes timestamps in the application's timezone without converting
 * them, so changing that timezone changes what the rows already in the database
 * mean. Everything recorded while the app ran on UTC has to be moved forward to
 * the Baghdad clock, or a sale rung up at 21:00 would start reading as 18:00.
 *
 * Iraq dropped daylight saving in 2008, so Asia/Baghdad is UTC+3 the whole year
 * and one constant covers every row ever written.
 *
 * Date columns are deliberately left alone: an expense dated "the 12th" is the
 * 12th in any timezone, and shifting it by hours would drag some of them into
 * the wrong day.
 */
final class TimestampShift
{
    /** Column types that carry a time of day and therefore need moving. */
    private const TIME_TYPES = ['datetime', 'timestamp'];

    /**
     * @return array<string,int> how many rows were touched, per table.column
     */
    public static function shiftAllBy(int $hours): array
    {
        if ($hours === 0) {
            return [];
        }

        $touched = [];

        foreach (self::tables() as $table) {
            foreach (self::timeColumns($table) as $column) {
                $touched["$table.$column"] = self::shiftColumn($table, $column, $hours);
            }
        }

        return $touched;
    }

    /** @return string[] */
    public static function tables(): array
    {
        return collect(Schema::getTables())
            ->pluck('name')
            // The migration log itself has no timestamps worth moving, and
            // rewriting it while a migration is running is asking for trouble.
            ->reject(fn ($name) => in_array($name, ['migrations', 'sqlite_sequence'], true))
            ->values()
            ->all();
    }

    /** @return string[] */
    public static function timeColumns(string $table): array
    {
        return collect(Schema::getColumns($table))
            ->filter(fn ($column) => in_array(
                strtolower($column['type_name'] ?? ''),
                self::TIME_TYPES,
                true
            ))
            ->pluck('name')
            ->all();
    }

    private static function shiftColumn(string $table, string $column, int $hours): int
    {
        $driver = DB::connection()->getDriverName();
        $sign = $hours >= 0 ? '+' : '-';
        $size = abs($hours);

        $expression = match ($driver) {
            'sqlite' => "datetime($column, '$sign$size hours')",
            'mysql', 'mariadb' => $hours >= 0
                ? "DATE_ADD($column, INTERVAL $size HOUR)"
                : "DATE_SUB($column, INTERVAL $size HOUR)",
            'pgsql' => "$column $sign INTERVAL '$size hours'",
            default => null,
        };

        if ($expression === null) {
            // An unknown driver is not worth guessing at: leaving the rows
            // untouched is recoverable, corrupting every timestamp is not.
            return 0;
        }

        return DB::table($table)
            ->whereNotNull($column)
            ->update([$column => DB::raw($expression)]);
    }
}
