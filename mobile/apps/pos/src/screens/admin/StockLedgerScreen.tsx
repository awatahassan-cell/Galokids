import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  formatDateTime,
  inventory,
  type Paginated,
  type StockMovement,
} from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { DateRange, sendable, type Range } from '@/components/DateRange';
import { Pill, Table, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';

import { colors, typography } from '@/theme';

/**
 * Where the stock went.
 *
 * Every movement with the reason attached, because "we are twelve short" is
 * only answerable if each change says whether it was a sale, a return, a
 * delivery or somebody correcting a count.
 */

const TYPES: { id: string; label: string }[] = [
  { id: 'all', label: 'هەموو' },
  { id: 'sale', label: 'فرۆشتن' },
  { id: 'purchase', label: 'کڕین' },
  { id: 'return', label: 'گەڕاندنەوە' },
  { id: 'adjustment', label: 'ڕاستکردنەوە' },
];

export default function StockLedgerScreen() {
  const [type, setType] = useState('all');
  const [term, setTerm] = useState('');
  const [range, setRange] = useState<Range>({ from: '', to: '' });

  const list = useFetch<Paginated<StockMovement>>(
    () => inventory.movements({ type: type === 'all' ? undefined : type, limit: 100, ...sendable(range) }),
    [type, range.from, range.to]
  );

  const offline = useNeedsConnection(list.error);

  // The server has no free-text search on the ledger, so this narrows the page
  // that is on screen — product name and the reason.
  const needle = term.trim().toLowerCase();
  const rows = (list.data?.data ?? []).filter(
    move =>
      !needle ||
      `${move.product_name ?? ''} ${move.note ?? ''} ${TYPE_LABEL[move.type] ?? move.type}`.toLowerCase().includes(needle)
  );

  return (
    <Screen title="مێژووی ستۆک" subtitle="هەموو جوڵەیەکی کۆگا، بە هۆکارەوە" scroll={false}>
      <SearchField value={term} onChange={setTerm} placeholder="گەڕان لەم لاپەڕەیەدا…" />
      <DateRange value={range} onChange={setRange} />
      <Chips value={type} onChange={setType} options={TYPES} />

      {offline ? (
        <NeedsConnection what="مێژووی ستۆک" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <Empty title="هیچ جوڵەیەک نییە" />
      ) : (
        <Table
          rows={rows}
          keyFor={move => String(move.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={COLUMNS}
        />
      )}
    </Screen>
  );
}

/** What each kind of movement is called, as the panel names them. */
const TYPE_LABEL: Record<string, string> = {
  sale: 'فرۆشتن',
  purchase: 'کڕین',
  adjustment: 'ڕاستکردنەوە',
  return: 'گەڕانەوە',
  refund: 'گەڕاندنەوە',
  exchange: 'گۆڕینەوە',
  cancel: 'هەڵوەشاندنەوە',
  initial: 'سەرەتایی',
};

// The panel's ledger, in its order: when, what, the kind of movement, how
// much it moved, what was left, and why.
const COLUMNS: Column<StockMovement>[] = [
  { title: 'بەروار', width: 1.2, render: move => formatDateTime(move.created_at) },
  {
    title: 'بەرهەم',
    width: 2,
    primary: true,
    render: move => move.product_name || `جۆری #${move.product_variation_id}`,
  },
  {
    title: 'چالاکی',
    width: 1,
    align: 'center',
    render: move => <Pill label={TYPE_LABEL[move.type] ?? move.type} tone="neutral" />,
  },
  {
    title: 'گۆڕان',
    width: 0.8,
    align: 'center',
    render: move => {
      const added = move.quantity_change > 0;
      // A movement that changed nothing is worth seeing, not hiding: it is
      // what a sale against empty stock looks like, and the shop needs to
      // notice.
      const nothing = move.quantity_change === 0;

      return (
        <Pill
          label={`${added ? '+' : ''}${move.quantity_change}`}
          tone={nothing ? 'warn' : added ? 'good' : 'bad'}
        />
      );
    },
  },
  {
    title: 'دوای گۆڕان',
    width: 0.8,
    align: 'center',
    render: move => <Text style={styles.after}>{move.quantity_after}</Text>,
  },
  { title: 'هۆکار', width: 1.8, render: move => move.note || '—' },
];

const styles = StyleSheet.create({
  after: { ...typography.heading, color: colors.text },
});
