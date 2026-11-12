import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDay, formatIQD, presetRanges, reports, type CashierReportRow } from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Who sold what.
 *
 * Ordered by takings, with a bar against the best so the shop can see the
 * spread rather than read a column of numbers. The figures are the server's
 * own — a device cannot total a colleague's till from its own slice.
 */
export default function CashiersScreen() {
  const ranges = presetRanges();
  const [key, setKey] = useState<keyof typeof ranges>('month');
  const range = ranges[key]!;

  const list = useFetch<CashierReportRow[]>(
    () => reports.cashiers({ from: range.from, to: range.to }),
    [range.from, range.to]
  );

  const offline = useNeedsConnection(list.error);
  const rows = [...(list.data ?? [])].sort((a, b) => b.revenue - a.revenue);
  const best = Math.max(...rows.map(row => row.revenue), 1);

  return (
    <Screen
      title="فرۆشتنی کاشێرەکان"
      subtitle={`${formatDay(range.from)} — ${formatDay(range.to)}`}
      onRefresh={list.refresh}
      refreshing={list.refreshing}
    >
      <Chips
        value={key as string}
        onChange={next => setKey(next as keyof typeof ranges)}
        options={Object.entries(ranges).map(([id, value]) => ({ id, label: value.label }))}
      />

      {offline ? (
        <NeedsConnection what="ئەم ڕاپۆرتە" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <Empty title="هیچ فرۆشتنێک نییە" body="لەم ماوەیەدا هیچ کاشێرێک نەیفرۆشتووە." />
      ) : (
        <View style={styles.list}>
          {rows.map((row, index) => (
            <View key={row.user_id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.revenue}>{formatIQD(row.revenue)}</Text>

                <View style={styles.cardHeadText}>
                  <Text style={styles.name}>
                    {index === 0 ? '🥇 ' : ''}{row.name}
                  </Text>
                  <Text style={styles.count}>{row.order_count} فرۆشتن</Text>
                </View>
              </View>

              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((row.revenue / best) * 100)}%` }]} />
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  cardHeadText: { flex: 1 },
  name: { ...typography.heading, color: colors.text, textAlign: 'right' },
  count: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  revenue: { ...typography.heading, color: colors.brand, ...typography.mono },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.brandSoft, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brand, borderRadius: radius.pill },
});
