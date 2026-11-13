import { StyleSheet, Text, View } from 'react-native';
import { backoffice, formatDateTime, formatIQD, type Paginated, type Purchase } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { Pill, Table, Titled, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, spacing, typography } from '@/theme';

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
            <Table
              rows={rows}
              keyFor={purchase => String(purchase.id)}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              columns={COLUMNS}
            />
          )}
        </>
      )}
    </Screen>
  );
}

// The panel's purchase list: the invoice, who it was bought from, when, what
// it came to, what has been paid, and what is still owed.
const COLUMNS: Column<Purchase>[] = [
  {
    title: 'ژمارەی پسووڵە',
    width: 1.4,
    primary: true,
    render: purchase => (
      <Titled
        title={purchase.reference || `کڕینی #${purchase.id}`}
        sub={`${purchase.items?.length ?? 0} بەرهەم`}
      />
    ),
  },
  { title: 'دابینکەر', width: 1.6, render: purchase => purchase.supplier_name || '—' },
  { title: 'بەروار', width: 1.2, render: purchase => formatDateTime(purchase.purchased_at) },
  {
    title: 'کۆی پسووڵە',
    width: 1.1,
    align: 'center',
    render: purchase => <Text style={styles.total}>{formatIQD(purchase.total_amount)}</Text>,
  },
  {
    title: 'بڕی دراو',
    width: 1.1,
    align: 'center',
    render: purchase => formatIQD(purchase.amount_paid),
  },
  {
    title: 'قەرزی ماوە',
    width: 1.1,
    align: 'center',
    render: purchase => {
      const remaining = Math.max(0, purchase.total_amount - purchase.amount_paid);

      return remaining > 0 ? (
        <Pill label={formatIQD(remaining)} tone="bad" />
      ) : (
        <Pill label="دراوە" tone="good" />
      );
    },
  },
];

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', gap: spacing.sm },
  total: { ...typography.heading, color: colors.text },
});
