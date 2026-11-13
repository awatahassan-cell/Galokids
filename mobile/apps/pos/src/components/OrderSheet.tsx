import { useCallback, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import {
  Alert,
  backoffice,
  displayPhone,
  formatDateTime,
  formatIQD,
  orders as ordersApi,
  orderStatusLabel,
  shop,
  type Order,
  type OrderHistoryEntry,
  type OrderStatus,
} from '@galokids/core';
import { Button, Loading } from '@/components/kit';
import { Pill } from '@/components/Table';
import { printLabelSheet } from '@/labels/print';
import { buildReceiptHtml, buildWaybillHtml, storeInfo, whatsappUrl } from '@/print/receipt';
import { useFetch } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * One order, in full.
 *
 * What the panel opens when a row is clicked: the lines with how many have come
 * back, the money, the status trail, and the things a shop does to an order —
 * move it on, take goods back, print it, message the customer, delete it.
 * Opened from the website orders, the page orders and the till's own sales, so
 * the same order reads the same wherever it is found.
 */

const FLOW: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: 'processing', label: 'ئامادەکردن' },
  processing: { to: 'shipped', label: 'ناردن' },
  shipped: { to: 'delivered', label: 'گەیەنرا' },
};

const TONE: Record<string, 'neutral' | 'good' | 'bad' | 'warn' | 'info'> = {
  pending: 'warn',
  processing: 'info',
  shipped: 'info',
  delivered: 'good',
  cancelled: 'bad',
  returned: 'bad',
};

export function OrderSheet({
  order: initial,
  onClose,
  onChanged,
}: {
  order: Order | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  if (!initial) return null;

  return <Sheet key={initial.id} initial={initial} onClose={onClose} onChanged={onChanged} />;
}

function Sheet({
  initial,
  onClose,
  onChanged,
}: {
  initial: Order;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { can } = useSession();
  const [order, setOrder] = useState<Order>(initial);
  const [busy, setBusy] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');

  const history = useFetch<OrderHistoryEntry[]>(() => backoffice.orderHistory(order.id), [order.id, order.status]);

  const manage = can('orders.manage');
  const canDelete = can('orders.delete');

  /** Reload this order after something changed it, and tell the list behind. */
  const reload = useCallback(async () => {
    const fresh = await ordersApi.get(order.id);
    setOrder(fresh);
    onChanged();
  }, [order.id, onChanged]);

  const run = async (work: () => Promise<unknown>, failure: string) => {
    if (busy) return;
    setBusy(true);

    try {
      await work();
    } catch (error) {
      Alert.alert(failure, (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const advance = (to: OrderStatus) =>
    run(async () => {
      await ordersApi.updateStatus(order.id, to);
      await reload();
    }, 'نەتوانرا دۆخ بگۆڕدرێت');

  const cancel = () =>
    Alert.alert('هەڵوەشاندنەوە', 'دڵنیایت لە هەڵوەشاندنەوەی ئەم داواکارییە؟', [
      { text: 'نەخێر', style: 'cancel' },
      { text: 'هەڵیبوەشێنەوە', style: 'destructive', onPress: () => advance('cancelled') },
    ]);

  const remove = () =>
    Alert.alert('سڕینەوە', 'ئەم داواکارییە بە یەکجاری دەسڕدرێتەوە. دڵنیایت؟', [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بیسڕەوە',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await backoffice.deleteOrder(order.id);
            onChanged();
            onClose();
          }, 'نەتوانرا بسڕدرێتەوە'),
      },
    ]);

  const print = (build: typeof buildReceiptHtml) =>
    run(async () => {
      // The shop's own name, logo and footer. Missing settings print a plain
      // receipt rather than refusing to print at all.
      const settings = await shop.settings().catch(() => ({}));
      await printLabelSheet(build(order, storeInfo(settings)));
    }, 'نەتوانرا چاپ بکرێت');

  const whatsapp = () => {
    const url = whatsappUrl(order);
    if (!url) return Alert.alert('ژمارەی مۆبایل نییە', 'ئەم داواکارییە ژمارەی مۆبایلی نییە.');
    Linking.openURL(url);
  };

  const returnable = (item: Order['items'][number]) => item.quantity - (item.returned_quantity ?? 0);

  const chosen = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ order_item_id: Number(id), quantity: qty }));

  const refund = () =>
    run(async () => {
      await backoffice.refundOrder(order.id, { items: chosen, reason: reason.trim() || undefined });
      setRefunding(false);
      setQuantities({});
      setReason('');
      await reload();
    }, 'نەتوانرا بگەڕێنرێتەوە');

  const next = FLOW[order.status];
  const canRefund =
    manage && order.status !== 'cancelled' && !order.fully_returned && order.items.some(i => returnable(i) > 0);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>

            <View style={styles.headText}>
              <Text style={styles.title}>{order.invoice_no ?? `#${order.id}`}</Text>
              <Text style={styles.sub}>{formatDateTime(order.created_at)}</Text>
            </View>

            <Pill label={orderStatusLabel(order.status)} tone={TONE[order.status] ?? 'neutral'} />
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* ---- customer ---- */}
            <Section title="کڕیار">
              <Line label="ناو" value={order.customer_name || 'کڕیاری بێ ناو'} />
              {order.customer_phone ? <Line label="مۆبایل" value={displayPhone(order.customer_phone)} /> : null}
              {order.governorate ? <Line label="پارێزگا" value={order.governorate} /> : null}
              {order.shipping_address ? <Line label="ناونیشان" value={order.shipping_address} /> : null}
              <Line label="کەناڵ" value={CHANNEL[order.channel ?? ''] ?? '—'} />
              {order.payment_method ? <Line label="پارەدان" value={order.payment_method} /> : null}
            </Section>

            {/* ---- lines ---- */}
            <Section title="بەرهەمەکان">
              {order.items.map(item => {
                const back = item.returned_quantity ?? 0;
                const left = returnable(item);

                return (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.product_name_ku || item.product_name || 'بەرهەم'}
                      </Text>
                      <Text style={styles.itemSub}>
                        {[item.variation_label, `${item.quantity} × ${formatIQD(item.price)}`]
                          .filter(Boolean)
                          .join(' · ')}
                        {back > 0 ? `  ·  گەڕاوەتەوە ${back}` : ''}
                      </Text>
                    </View>

                    {refunding && left > 0 ? (
                      <Stepper
                        value={quantities[item.id] ?? 0}
                        max={left}
                        onChange={qty => setQuantities(prev => ({ ...prev, [item.id]: qty }))}
                      />
                    ) : (
                      <Text style={styles.itemTotal}>{formatIQD(item.price * item.quantity)}</Text>
                    )}
                  </View>
                );
              })}
            </Section>

            {/* ---- money ---- */}
            <Section title="پارە">
              <Line label="کۆی بەرهەمەکان" value={formatIQD(order.subtotal)} />
              {order.discount_amount > 0 ? (
                <Line
                  label={order.coupon_code ? `داشکاندن (${order.coupon_code})` : 'داشکاندن'}
                  value={formatIQD(-order.discount_amount)}
                />
              ) : null}
              {order.shipping_fee > 0 ? <Line label="گەیاندن" value={formatIQD(order.shipping_fee)} /> : null}
              <Line label="کۆی گشتی" value={formatIQD(order.total_amount)} strong />
              {order.amount_paid != null ? <Line label="وەرگیراو" value={formatIQD(order.amount_paid)} /> : null}
              {order.change_due ? <Line label="ماوە بۆ کڕیار" value={formatIQD(order.change_due)} /> : null}
              {order.refunded_amount ? (
                <Line label="گەڕێنراوەتەوە" value={formatIQD(-order.refunded_amount)} tone="bad" />
              ) : null}
            </Section>

            {/* ---- refund form ---- */}
            {refunding && (
              <Section title="گەڕاندنەوە">
                <TextInput
                  style={styles.input}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="هۆکار (ئارەزوومەندانە)"
                  placeholderTextColor={colors.textFaint}
                  textAlign="right"
                />
                <View style={styles.actions}>
                  <Button label="پاشگەزبوونەوە" tone="quiet" onPress={() => setRefunding(false)} />
                  <Button
                    label={busy ? '…' : 'گەڕاندنەوە'}
                    tone="danger"
                    disabled={busy || chosen.length === 0}
                    onPress={refund}
                  />
                </View>
              </Section>
            )}

            {/* ---- trail ---- */}
            <Section title="مێژووی دۆخ">
              {history.loading && !history.data ? (
                <Loading />
              ) : (history.data?.length ?? 0) === 0 ? (
                <Text style={styles.sub}>هیچ گۆڕانکارییەک تۆمار نەکراوە.</Text>
              ) : (
                history.data!.map(entry => (
                  <View key={entry.id} style={styles.trail}>
                    <Text style={styles.trailWhen}>{formatDateTime(entry.created_at)}</Text>
                    <Text style={styles.trailWhat}>
                      {entry.from_status ? `${orderStatusLabel(entry.from_status)} ← ` : ''}
                      {orderStatusLabel(entry.to_status)}
                      {entry.user?.name ? `  ·  ${entry.user.name}` : ''}
                    </Text>
                    {entry.note ? <Text style={styles.sub}>{entry.note}</Text> : null}
                  </View>
                ))
              )}
            </Section>
          </ScrollView>

          {/* ---- actions ---- */}
          {!refunding && (
            <View style={styles.footer}>
              <View style={styles.actions}>
                {manage && next && (
                  <Button label={busy ? '…' : next.label} disabled={busy} onPress={() => advance(next.to)} />
                )}
                {canRefund && <Button label="گەڕاندنەوە" tone="quiet" onPress={() => setRefunding(true)} />}
                <Button label="پسوولە" tone="quiet" onPress={() => print(buildReceiptHtml)} />
                {order.channel !== 'pos' && (
                  <Button label="وەسڵی گەیاندن" tone="quiet" onPress={() => print(buildWaybillHtml)} />
                )}
                {order.customer_phone ? <Button label="واتساپ" tone="quiet" onPress={whatsapp} /> : null}
                {manage && order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <Button label="هەڵوەشاندنەوە" tone="danger" onPress={cancel} />
                )}
                {canDelete && <Button label="سڕینەوە" tone="danger" onPress={remove} />}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const CHANNEL: Record<string, string> = {
  pos: 'فرۆشتنی دوکان',
  online: 'وێبسایت',
  social: 'پەیج',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'bad';
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineValue, strong && styles.lineStrong, tone === 'bad' && { color: colors.danger }]}>
        {value}
      </Text>
      <Text style={styles.lineLabel}>{label}</Text>
    </View>
  );
}

function Stepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(0, value - 1))}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headText: { flex: 1, alignItems: 'flex-end' },
  title: { ...typography.title, color: colors.text },
  sub: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  close: { fontSize: 20, color: colors.textMuted },
  body: { padding: spacing.lg, gap: spacing.lg },

  section: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sectionTitle: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right', marginBottom: 2 },

  line: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: spacing.md },
  lineLabel: { ...typography.small, color: colors.textMuted },
  lineValue: { ...typography.small, color: colors.text, flexShrink: 1, textAlign: 'left' },
  lineStrong: { ...typography.heading },

  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  itemText: { flex: 1, alignItems: 'flex-end' },
  itemName: { ...typography.small, color: colors.text, textAlign: 'right' },
  itemSub: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  itemTotal: { ...typography.small, color: colors.text },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { ...typography.heading, color: colors.brand },
  stepValue: { ...typography.body, minWidth: 22, textAlign: 'center', color: colors.text },

  trail: { gap: 1, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  trailWhen: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  trailWhat: { ...typography.small, color: colors.text, textAlign: 'right' },

  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
});
