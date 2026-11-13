import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  Alert,
  backoffice,
  displayPhone,
  formatDateTime,
  formatIQD,
  orders as ordersApi,
  type Order,
  type OrderCounts,
  type OrderStatus,
  type Paginated,
} from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { OrderSheet } from '@/components/OrderSheet';
import { Pill, Table, Titled, type Column } from '@/components/Table';
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
  const [open, setOpen] = useState<Order | null>(null);

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

  // The panel's chips carry a count each, taken over the whole channel rather
  // than the page on screen.
  const counts = useFetch<OrderCounts>(() => backoffice.orderCounts({ channel }), [channel]);

  const advance = useCallback(
    async (order: Order) => {
      const next = NEXT[order.status];
      if (!next || busyId) return;

      setBusyId(order.id);

      try {
        await ordersApi.updateStatus(order.id, next.to);
        list.refresh();
        counts.refresh();
      } catch (error) {
        Alert.alert('نەتوانرا بگۆڕدرێت', (error as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, list]
  );

  // The panel's own columns, in the panel's order: who, what, when, how much,
  // where it has got to, and the one thing a shop does to an order.
  const canManage = can('orders.manage');

  const columns: Column<Order>[] = [
    {
      title: 'داواکاری',
      width: 1.2,
      primary: true,
      render: order => (
        <Titled
          title={order.invoice_no ?? `#${order.id}`}
          sub={
            order.offline_stock_conflict
              ? '⚠ ئۆفلاین تۆمارکراوە — کۆگا بژمێرە'
              : null
          }
        />
      ),
    },
    {
      title: 'کڕیار',
      width: 1.6,
      render: order => (
        <Titled
          title={order.customer_name || 'کڕیاری بێ ناو'}
          // The same number is stored three ways depending on who typed it; shown
          // one way, so two rows for one customer look like one customer.
          sub={displayPhone(order.customer_phone) || null}
        />
      ),
    },
    {
      title: 'دانە',
      width: 0.6,
      align: 'center',
      render: order =>
        String(order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0),
    },
    { title: 'بەروار', width: 1.2, render: order => formatDateTime(order.created_at) },
    {
      title: 'بڕ',
      width: 1,
      render: order => <Text style={styles.total}>{formatIQD(order.total_amount)}</Text>,
    },
    {
      title: 'دۆخ',
      width: 1,
      align: 'center',
      render: order => {
        const tone = STATUS_TONE[order.status];

        return <Pill label={tone?.label ?? order.status} tone={tone?.tone ?? 'neutral'} />;
      },
    },
    {
      title: 'کردار',
      width: 1,
      align: 'center',
      render: order => {
        const next = NEXT[order.status];
        if (!canManage || !next) return <Text style={styles.none}>—</Text>;

        return (
          <Pressable
            style={styles.advance}
            onPress={() => advance(order)}
            disabled={busyId === order.id}
          >
            <Text style={styles.advanceText}>{busyId === order.id ? '…' : next.label}</Text>
          </Pressable>
        );
      },
    },
  ];

  return (
    <Screen title={title} subtitle={subtitle} scroll={false}>
      <SearchField value={search} onChange={setSearch} placeholder="ژمارەی پسووڵە، ناو یان مۆبایل…" />

      <Chips
        value={status as string}
        onChange={next => setStatus(next as OrderStatus | 'all')}
        options={STATUSES.map(s => {
          const n = s.id === 'all' ? counts.data?.total : counts.data?.[s.id as keyof OrderCounts];

          return { id: s.id as string, label: typeof n === 'number' ? `${s.label} ${n}` : s.label };
        })}
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
        <Table
          rows={list.data!.data}
          keyFor={order => String(order.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={columns}
          onPress={setOpen}
        />
      )}

      <OrderSheet
        order={open}
        onClose={() => setOpen(null)}
        onChanged={() => {
          list.refresh();
          counts.refresh();
        }}
      />
    </Screen>
  );
}

const STATUS_TONE: Record<
  string,
  { label: string; tone: 'neutral' | 'good' | 'bad' | 'warn' | 'info' }
> = {
  pending: { label: 'چاوەڕوان', tone: 'warn' },
  processing: { label: 'لە ئامادەکردندا', tone: 'info' },
  shipped: { label: 'نێردراو', tone: 'info' },
  delivered: { label: 'گەیەنراو', tone: 'good' },
  cancelled: { label: 'هەڵوەشێنراو', tone: 'bad' },
  returned: { label: 'گەڕێنراوە', tone: 'bad' },
};

const styles = StyleSheet.create({
  total: { ...typography.heading, color: colors.text },
  none: { ...typography.small, color: colors.textFaint },
  advance: {
    minHeight: TOUCH_TARGET - 14,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  advanceText: { color: '#fff', ...typography.tiny },
});
