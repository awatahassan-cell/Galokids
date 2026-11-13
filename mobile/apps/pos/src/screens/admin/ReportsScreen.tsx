import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  formatIQD,
  formatDay,
  presetRanges,
  reports,
  type DailyReport,
  type DailyReportRow,
  type SalesReport,
} from '@galokids/core';
import { Chips, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { Table, type Column } from '@/components/Table';
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
  const [key, setKey] = useState<string>('month');
  const [channel, setChannel] = useState<'all' | 'online' | 'pos' | 'social'>('all');
  const [customFrom, setCustomFrom] = useState(ranges.month!.from);
  const [customTo, setCustomTo] = useState(ranges.month!.to);

  const range =
    key === 'custom' ? { from: customFrom, to: customTo, label: '' } : ranges[key as keyof typeof ranges]!;
  const channelParam = channel === 'all' ? undefined : channel;

  const summary = useFetch<SalesReport>(
    () => reports.sales({ from: range.from, to: range.to, channel: channelParam }),
    [range.from, range.to, channel]
  );

  const daily = useFetch<DailyReport>(
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
        value={key}
        onChange={setKey}
        options={[
          ...Object.entries(ranges).map(([id, value]) => ({ id, label: value.label })),
          { id: 'custom', label: 'دیاریکراو' },
        ]}
      />

      {key === 'custom' && (
        <View style={styles.dates}>
          <TextInput style={styles.date} value={customFrom} onChangeText={setCustomFrom} placeholder="لە (YYYY-MM-DD)" placeholderTextColor={colors.textFaint} textAlign="right" />
          <TextInput style={styles.date} value={customTo} onChangeText={setCustomTo} placeholder="بۆ (YYYY-MM-DD)" placeholderTextColor={colors.textFaint} textAlign="right" />
        </View>
      )}

      <Chips
        value={channel}
        onChange={setChannel}
        options={[
          { id: 'all', label: 'هەموو کەناڵەکان' },
          { id: 'pos', label: 'فرۆشتنی دوکان' },
          { id: 'online', label: 'وێبسایت' },
          { id: 'social', label: 'پەیج' },
        ]}
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
            <Stat label="قازانجی خاو" value={formatIQD(summary.data?.gross_profit ?? 0)} />
            <Stat label="دانەی فرۆشراو" value={String(summary.data?.items_sold ?? 0)} />
            {(summary.data?.refunded ?? 0) > 0 && (
              <Stat label="گەڕاوەتەوە" value={formatIQD(summary.data!.refunded)} tone="bad" />
            )}

            {summary.data?.cogs != null && (
              <Stat label="تێچووی کاڵا" value={formatIQD(summary.data.cogs)} />
            )}

            {summary.data?.expenses != null && (
              <Stat label="خەرجی" value={formatIQD(summary.data.expenses)} tone="bad" />
            )}

            {summary.data?.net_profit != null && (
              <Stat
                label="قازانجی پوخت"
                value={formatIQD(summary.data.net_profit)}
                hint="دوای خەرجی"
                tone={summary.data.net_profit >= 0 ? 'good' : 'bad'}
              />
            )}

            {summary.data?.average_order_value != null && (
              <Stat label="ناوەندی داواکاری" value={formatIQD(summary.data.average_order_value)} />
            )}
          </View>

          {channel === 'all' && (
            <View style={styles.stats}>
              <Stat label="فرۆشتنی دوکان" value={formatIQD(summary.data?.pos_revenue ?? 0)} />
              <Stat label="وێبسایت" value={formatIQD(summary.data?.online_revenue ?? 0)} />
              <Stat label="پەیج" value={formatIQD(summary.data?.social_revenue ?? 0)} />
            </View>
          )}

          <DailyBars rows={daily.data?.days ?? []} loading={daily.loading} />

          {(summary.data?.top_products?.length ?? 0) > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.chartTitle}>باشترین بەرهەمەکان</Text>
              <Table
                inline
                rows={summary.data!.top_products!}
                keyFor={row => String(row.id)}
                columns={TOP}
              />
            </View>
          )}
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
          const height = Math.max(2, Math.round((row.revenue / busiest) * TRACK));
          const loss = row.net_profit < 0;

          return (
            <View key={row.day} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height, backgroundColor: loss ? colors.danger : colors.brand },
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

const TRACK = 120;

const TOP: Column<NonNullable<SalesReport['top_products']>[number]>[] = [
  { title: 'بەرهەم', width: 2.4, primary: true, render: row => row.name },
  { title: 'دانە', width: 0.8, align: 'center', render: row => String(row.qty) },
  { title: 'داهات', width: 1.2, align: 'center', render: row => formatIQD(row.revenue) },
];

const styles = StyleSheet.create({
  dates: { flexDirection: 'row-reverse', gap: spacing.sm },
  date: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.small,
    color: colors.text,
    backgroundColor: colors.surface,
  },
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
  bars: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 3 },
  barColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  // A fixed height: a percentage bar has nothing definite to be a percentage
  // of inside a flex row, and collapsed to a hairline.
  barTrack: { height: TRACK, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 2 },
  barLabel: { ...typography.tiny, color: colors.textFaint, fontSize: 9 },
  legend: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  legendText: { ...typography.tiny, color: colors.textMuted },
});
