import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDay, formatIQD, presetRanges, reports, type CashierReport } from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { Table } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, typography } from '@/theme';

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

  const list = useFetch<CashierReport>(
    () => reports.cashiers({ from: range.from, to: range.to }),
    [range.from, range.to]
  );

  const offline = useNeedsConnection(list.error);
  // The endpoint already sorts by takings; copy before touching it anyway so
  // a re-render never mutates what the fetch is holding.
  const rows = [...(list.data?.cashiers ?? [])];
  const best = Math.max(...rows.map(row => row.total), 1);

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
        <Table
          inline
          rows={rows}
          keyFor={row => String(row.user_id ?? row.name)}
          columns={[
            {
              title: 'کاشێر',
              width: 1.8,
              primary: true,
              render: row => (
                <View style={styles.who}>
                  <Text style={styles.name}>{row.name}</Text>
                  <View style={styles.track}>
                    <View
                      style={[styles.fill, { width: `${Math.round((row.total / best) * 100)}%` }]}
                    />
                  </View>
                </View>
              ),
            },
            { title: 'فرۆشتن', width: 0.8, align: 'center', render: row => String(row.orders_count) },
            { title: 'POS', width: 1.1, align: 'center', render: row => formatIQD(row.pos_total) },
            { title: 'وێبسایت', width: 1.1, align: 'center', render: row => formatIQD(row.online_total) },
            { title: 'پەیج', width: 1.1, align: 'center', render: row => formatIQD(row.social_total) },
            {
              title: 'کۆی گشتی',
              width: 1.2,
              align: 'center',
              render: row => <Text style={styles.revenue}>{formatIQD(row.total)}</Text>,
            },
          ]}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { alignSelf: 'stretch', alignItems: 'flex-end', gap: 4 },
  name: { ...typography.small, color: colors.text, textAlign: 'right' },
  revenue: { ...typography.heading, color: colors.text },
  // How each cashier compares with the best of them, drawn under the name.
  track: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
  },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.brand },
});
