import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  backoffice,
  formatDateTime,
  formatIQD,
  orders as ordersApi,
  type Order,
  type OrderStatus,
  type Paginated,
} from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The orders the shop has to act on.
 *
 * Status is the only thing this screen changes, and it is the thing a shop
 * does twenty times a day — so moving one along is a tap on the row, not a
 * trip into a detail screen and back.
 */

const STATUSES: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'هەموو' },
  { id: 'pending', label: 'چاوەڕوان' },
  { id: 'processing', label: 'لە ئامادەکردندا' },
  { id: 'shipped', label: 'نێردراو' },
  { id: 'delivered', label: 'گەیەنراو' },
  { id: 'cancelled', label: 'هەڵوەشێنراو' },
];

/** What a shop moves an order to next, in the order it actually happens. */
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'processing', label: 'ئامادەکردن' },
  processing: { to: 'shipped', label: 'ناردن' },
  shipped: { to: 'delivered', label: 'گەیەنرا' },
};

export function OrdersScreen({
  channel,
  title,
  subtitle,
}: {
  channel: 'online' | 'social' | 'pos';
  title: string;
  subtitle: string;
}) {
  const { can } = useSession();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const list = useFetch<Paginated<Order>>(
    () =>
      ordersApi.list({
        channel,
        status: status === 'all' ? undefined : status,
        search: search.trim() || undefined,
        limit: 50,
      }),
    [channel, status, search]
  );

  const offline = useNeedsConnection(list.error);

  const advance = useCallback(
    async (order: Order) => {
      const next = NEXT[order.status];
      if (!next || busyId) return;

      setBusyId(order.id);

      try {
        await ordersApi.updateStatus(order.id, next.to);
        list.refresh();
      } catch (error) {
        Alert.alert('نەتوانرا بگۆڕدرێت', (error as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, list]
  );

  return (
    <Screen title={title} subtitle={subtitle} scroll={false}>
      <SearchField value={search} onChange={setSearch} placeholder="ژمارەی پسووڵە، ناو یان مۆبایل…" />

      <Chips
        value={status as string}
        onChange={next => setStatus(next as OrderStatus | 'all')}
        options={STATUSES.map(s => ({ id: s.id as string, label: s.label }))}
      />

      {offline ? (
        <NeedsConnection what="داواکارییەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.data.length ?? 0) === 0 ? (
        <Empty title="هیچ داواکارییەک نییە" body="لەم دۆخەدا هیچ داواکارییەک نەدۆزرایەوە." />
      ) : (
        <FlatList
          data={list.data!.data}
          keyExtractor={order => String(order.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => (
            <OrderRow
              order={item}
              busy={busyId === item.id}
              canManage={can('orders.manage')}
              onAdvance={() => advance(item)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function OrderRow({
  order,
  busy,
  canManage,
  onAdvance,
}: {
  order: Order;
  busy: boolean;
  canManage: boolean;
  onAdvance: () => void;
}) {
  const next = NEXT[order.status];
  const tone = STATUS_TONE[order.status] ?? { bg: colors.brandSoft, fg: colors.brand, label: order.status };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.label}</Text>
        </View>

        <View style={styles.cardHeadText}>
          <Text style={styles.invoice}>{order.invoice_no ?? `#${order.id}`}</Text>
          <Text style={styles.when}>{formatDateTime(order.created_at)}</Text>
        </View>
      </View>

      <Text style={styles.customer} numberOfLines={1}>
        {order.customer_name || 'کڕیاری بێ ناو'}
        {order.customer_phone ? ` · ${order.customer_phone}` : ''}
      </Text>

      {order.offline_stock_conflict && (
        <Text style={styles.conflict}>
          ⚠ ئەم فرۆشتنە لە کاتی ئۆفلایندا تۆمارکراوە و ستۆکەکە ناتەواو بووە — کۆگا بژمێرە.
        </Text>
      )}

      <View style={styles.cardFoot}>
        {canManage && next && (
          <Pressable style={styles.advance} onPress={onAdvance} disabled={busy}>
            <Text style={styles.advanceText}>{busy ? '…' : next.label}</Text>
          </Pressable>
        )}

        <Text style={styles.total}>{formatIQD(order.total_amount)}</Text>
        <Text style={styles.itemCount}>
          {order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} دانە
        </Text>
      </View>
    </View>
  );
}

const STATUS_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningSoft, fg: colors.warning, label: 'چاوەڕوان' },
  processing: { bg: colors.brandSoft, fg: colors.brand, label: 'لە ئامادەکردندا' },
  shipped: { bg: '#eff6ff', fg: '#2563eb', label: 'نێردراو' },
  delivered: { bg: colors.successSoft, fg: colors.success, label: 'گەیەنراو' },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger, label: 'هەڵوەشێنراو' },
  returned: { bg: colors.dangerSoft, fg: colors.danger, label: 'گەڕێنراوە' },
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  cardHeadText: { flex: 1 },
  invoice: { ...typography.heading, color: colors.text, textAlign: 'right', ...typography.mono },
  when: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { ...typography.tiny },
  customer: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  conflict: { ...typography.tiny, color: colors.warning, textAlign: 'right' },
  cardFoot: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  total: { ...typography.heading, color: colors.brand, ...typography.mono },
  itemCount: { flex: 1, ...typography.tiny, color: colors.textFaint, textAlign: 'left' },
  advance: {
    minHeight: TOUCH_TARGET - 12,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  advanceText: { color: '#fff', ...typography.small },
});
