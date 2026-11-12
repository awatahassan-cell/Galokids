import { FlatList, StyleSheet, Text, View } from 'react-native';
import { backoffice, formatDateTime, formatIQD, type Paginated, type Purchase } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * What the shop bought in.
 *
 * The unpaid balance is the figure that matters — a delivery taken on credit
 * is money owed, and it is easy to lose track of when the stock has already
 * been put on the shelves.
 */
export default function PurchasesScreen() {
  const list = useFetch<Paginated<Purchase>>(() => backoffice.purchases({ limit: 50 }), []);
  const offline = useNeedsConnection(list.error);

  const rows = list.data?.data ?? [];
  const owed = rows.reduce((sum, p) => sum + Math.max(0, p.total_amount - p.amount_paid), 0);
  const spent = rows.reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <Screen title="کڕین" subtitle="وەصڵی کڕین و تێچووی کۆگا" scroll={false}>
      {offline ? (
        <NeedsConnection what="کڕینەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="کۆی کڕین" value={formatIQD(spent)} />
            <Stat label="قەرزی ماوە" value={formatIQD(owed)} tone={owed > 0 ? 'bad' : 'good'} />
          </View>

          {rows.length === 0 ? (
            <Empty title="هیچ کڕینێک تۆمار نەکراوە" />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={purchase => String(purchase.id)}
              contentContainerStyle={styles.list}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              renderItem={({ item }) => {
                const remaining = Math.max(0, item.total_amount - item.amount_paid);

                return (
                  <View style={styles.card}>
                    <View style={styles.head}>
                      <Text style={styles.total}>{formatIQD(item.total_amount)}</Text>

                      <View style={styles.headText}>
                        <Text style={styles.supplier} numberOfLines={1}>
                          {item.supplier_name || item.reference || `کڕینی #${item.id}`}
                        </Text>
                        <Text style={styles.when}>{formatDateTime(item.purchased_at)}</Text>
                      </View>
                    </View>

                    <View style={styles.footer}>
                      <Text style={styles.items}>{item.items?.length ?? 0} بەرهەم</Text>
                      {remaining > 0 ? (
                        <Text style={styles.owed}>قەرز: {formatIQD(remaining)}</Text>
                      ) : (
                        <Text style={styles.settled}>پارەکەی دراوە</Text>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', gap: spacing.sm },
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  supplier: { ...typography.heading, color: colors.text, textAlign: 'right' },
  when: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  total: { ...typography.heading, color: colors.text, ...typography.mono },
  footer: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  items: { ...typography.tiny, color: colors.textMuted },
  owed: { ...typography.tiny, color: colors.danger },
  settled: { ...typography.tiny, color: colors.success },
});
