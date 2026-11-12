import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {
  backoffice,
  formatDateTime,
  formatIQD,
  inventory,
  type Paginated,
  type StockMovement,
} from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { catalogueSize, type LocalProduct } from '@/offline';
import { colors, radius, spacing, typography } from '@/theme';

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

  const list = useFetch<Paginated<StockMovement>>(
    () => inventory.movements({ type: type === 'all' ? undefined : type, limit: 100 }),
    [type]
  );

  const offline = useNeedsConnection(list.error);

  return (
    <Screen title="مێژووی ستۆک" subtitle="هەموو جوڵەیەکی کۆگا، بە هۆکارەوە" scroll={false}>
      <Chips value={type} onChange={setType} options={TYPES} />

      {offline ? (
        <NeedsConnection what="مێژووی ستۆک" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.data.length ?? 0) === 0 ? (
        <Empty title="هیچ جوڵەیەک نییە" />
      ) : (
        <FlatList
          data={list.data!.data}
          keyExtractor={move => String(move.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => <MovementRow movement={item} />}
        />
      )}
    </Screen>
  );
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const added = movement.quantity_change > 0;

  // A movement that changed nothing is worth seeing, not hiding: it is what a
  // sale against empty stock looks like, and the shop needs to notice.
  const nothing = movement.quantity_change === 0;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.delta,
          { backgroundColor: nothing ? colors.warningSoft : added ? colors.successSoft : colors.dangerSoft },
        ]}
      >
        <Text
          style={[
            styles.deltaText,
            { color: nothing ? colors.warning : added ? colors.success : colors.danger },
          ]}
        >
          {added ? '+' : ''}
          {movement.quantity_change}
        </Text>
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {movement.product_name || `جۆری #${movement.product_variation_id}`}
        </Text>
        <Text style={styles.rowNote} numberOfLines={1}>
          {movement.note || movement.type}
        </Text>
        <Text style={styles.rowWhen}>{formatDateTime(movement.created_at)}</Text>
      </View>

      <Text style={styles.after}>{movement.quantity_after}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  delta: { minWidth: 52, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  deltaText: { ...typography.heading, textAlign: 'center', ...typography.mono },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { ...typography.small, color: colors.text, textAlign: 'right' },
  rowNote: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  rowWhen: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  after: { ...typography.small, color: colors.textMuted, ...typography.mono },
});
