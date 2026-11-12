import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatIQD,
  formatDay,
  presetRanges,
  reports,
  type DailyReportRow,
  type SalesReport,
} from '@galokids/core';
import { Chips, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * What the shop made.
 *
 * Revenue, cost and profit over a range, plus the shape of it day by day. The
 * bars are drawn from plain views rather than a charting library: this is one
 * series of positive numbers, and a library for that is a megabyte of
 * JavaScript on a till that may be on a shop's wifi.
 */
export default function ReportsScreen() {
  const ranges = useMemo(() => presetRanges(), []);
  const [key, setKey] = useState<keyof typeof ranges>('month');
  const range = ranges[key]!;

  const summary = useFetch<SalesReport>(
    () => reports.sales({ from: range.from, to: range.to }),
    [range.from, range.to]
  );

  const daily = useFetch<DailyReportRow[]>(
    () => reports.daily({ from: range.from, to: range.to }),
    [range.from, range.to]
  );

  const offline = useNeedsConnection(summary.error ?? daily.error);

  return (
    <Screen
      title="ڕاپۆرتەکان"
      subtitle={`${formatDay(range.from)} — ${formatDay(range.to)}`}
      onRefresh={() => {
        summary.refresh();
        daily.refresh();
      }}
      refreshing={summary.refreshing || daily.refreshing}
    >
      <Chips
        value={key as string}
        onChange={next => setKey(next as keyof typeof ranges)}
        options={Object.entries(ranges).map(([id, value]) => ({ id, label: value.label }))}
      />

      {offline ? (
        <NeedsConnection what="ڕاپۆرتەکان" />
      ) : summary.loading && !summary.data ? (
        <Loading />
      ) : summary.error ? (
        <Problem error={summary.error} onRetry={summary.reload} />
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="داهات" value={formatIQD(summary.data?.revenue ?? 0)} tone="good" />
            <Stat label="ژمارەی داواکاری" value={String(summary.data?.order_count ?? 0)} />

            {summary.data?.cost != null && (
              <Stat label="تێچوو" value={formatIQD(summary.data.cost)} />
            )}

            {summary.data?.profit != null && (
              <Stat
                label="قازانجی پوخت"
                value={formatIQD(summary.data.profit)}
                tone={summary.data.profit >= 0 ? 'good' : 'bad'}
              />
            )}

            {summary.data?.average_order != null && (
              <Stat label="ناوەندی داواکاری" value={formatIQD(summary.data.average_order)} />
            )}
          </View>

          <DailyBars rows={daily.data ?? []} loading={daily.loading} />
        </>
      )}
    </Screen>
  );
}

/**
 * The range, day by day.
 *
 * Bars are scaled against the busiest day rather than a round number, because
 * a shop wants to see the shape of its week — which day was quiet — and a
 * fixed scale flattens that whenever takings are small.
 */
function DailyBars({ rows, loading }: { rows: DailyReportRow[]; loading: boolean }) {
  if (loading && rows.length === 0) return <Loading />;
  if (rows.length === 0) return null;

  const busiest = Math.max(...rows.map(row => row.revenue), 1);

  return (
    <View style={styles.chart}>
      <Text style={styles.chartTitle}>ڕۆژانە</Text>

      <View style={styles.bars}>
        {rows.map(row => {
          const height = Math.max(2, Math.round((row.revenue / busiest) * 100));
          const loss = row.net_profit < 0;

          return (
            <View key={row.day} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: `${height}%`, backgroundColor: loss ? colors.danger : colors.brand },
                  ]}
                />
              </View>
              <Text style={styles.barLabel} numberOfLines={1}>
                {row.day.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>بەرزترین ڕۆژ: {formatIQD(busiest)}</Text>
        <Text style={styles.legendText}>
          ڕۆژی زیان: {rows.filter(row => row.net_profit < 0).length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  chart: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  chartTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  bars: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 3, height: 140 },
  barColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 2 },
  barLabel: { ...typography.tiny, color: colors.textFaint, fontSize: 9 },
  legend: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  legendText: { ...typography.tiny, color: colors.textMuted },
});
