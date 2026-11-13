import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import {
  Alert,
  backoffice,
  formatDateTime,
  formatIQD,
  orders as ordersApi,
  type CustomerLookup,
  type Order,
  type Paginated,
} from '@galokids/core';
import { Loading } from '@/components/kit';
import { OrderSheet } from '@/components/OrderSheet';
import { NavIcon } from '@/navigation/NavIcon';
import type { Customer, DiscountSpec } from '@/state/useCart';
import type { HeldSale } from '@/state/useHeld';
import { useFetch } from '@/state/useFetch';
import { colors, fonts, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The till's side tools: the strip above the products, and the sheets it opens.
 *
 * What the panel's till has around its cart — the shift, cash in and out,
 * sales put aside, the last sales for a reprint or a return, and the quick
 * add for something not in the catalogue.
 */

/* ------------------------------------------------------------- strip --- */

export function TillBar({
  shiftState,
  heldCount,
  canHold,
  onShift,
  onCash,
  onHold,
  onHeld,
  onRecent,
  onReturn,
  onQuick,
}: {
  shiftState: 'open' | 'closed' | 'unknown';
  heldCount: number;
  canHold: boolean;
  onShift: () => void;
  onCash: () => void;
  onHold: () => void;
  onHeld: () => void;
  onRecent: () => void;
  onReturn: () => void;
  onQuick: () => void;
}) {
  const shiftLabel =
    shiftState === 'open' ? 'شیفت کراوەیە' : shiftState === 'closed' ? 'شیفت دابخراوە' : 'شیفت نەزانراو';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.stripScroll}
      contentContainerStyle={styles.strip}
    >
      <Pressable
        style={[
          styles.shiftChip,
          shiftState === 'open' && styles.shiftOpen,
          shiftState === 'closed' && styles.shiftClosed,
        ]}
        onPress={onShift}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: shiftState === 'open' ? colors.success : shiftState === 'closed' ? colors.danger : colors.textFaint },
          ]}
        />
        <Text style={styles.shiftText}>{shiftLabel}</Text>
        <Text style={styles.shiftAction}>{shiftState === 'open' ? 'داخستن' : shiftState === 'closed' ? 'کردنەوە' : ''}</Text>
      </Pressable>

      <Tool label="پارە لە دراوەر" onPress={onCash} disabled={shiftState !== 'open'} />
      <Tool label="هێشتنەوە" onPress={onHold} disabled={!canHold} />
      <Tool label={heldCount ? `هێڵراوەکان (${heldCount})` : 'هێڵراوەکان'} onPress={onHeld} />
      <Tool label="فرۆشتنەکانی ئەمڕۆ" onPress={onRecent} />
      <Tool label="گەڕاندنەوە / گۆڕینەوە" onPress={onReturn} />
      <Tool label="بەرهەمی خێرا" onPress={onQuick} />
    </ScrollView>
  );
}

function Tool({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.tool, disabled && styles.toolDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

/* ----------------------------------------------------- customer/discount --- */

/**
 * Phone, name and — when the phone is one the shop has seen — who that is.
 *
 * Online only and best-effort: a returning customer's history is a courtesy,
 * and the sale must go through with the field empty when there is no signal.
 */
export function CustomerBox({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange: (next: Customer) => void;
}) {
  const [found, setFound] = useState<CustomerLookup | null>(null);
  const digits = customer.phone.replace(/\D/g, '');

  useEffect(() => {
    setFound(null);
    if (digits.length < 9) return;

    let alive = true;
    const timer = setTimeout(() => {
      backoffice
        .lookupCustomer(customer.phone)
        .then(result => {
          if (!alive) return;
          setFound(result);
          // Fill the name only if the cashier has not typed one.
          if (result.found && result.name && !customer.name) onChange({ ...customer, name: result.name });
        })
        .catch(() => {});
    }, 500);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // Looking up on the number alone: the name changing must not re-ask.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <View style={styles.box}>
      <View style={styles.pair}>
        <TextInput
          style={[styles.input, styles.half]}
          value={customer.name}
          onChangeText={name => onChange({ ...customer, name })}
          placeholder="ناوی کڕیار"
          placeholderTextColor={colors.textFaint}
          textAlign="right"
        />
        <TextInput
          style={[styles.input, styles.half]}
          value={customer.phone}
          onChangeText={phone => onChange({ ...customer, phone })}
          placeholder="مۆبایل"
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          textAlign="right"
        />
      </View>

      {found?.found ? (
        <Text style={styles.found}>
          کڕیاری جاران · {found.orders_count} داواکاری · {formatIQD(found.total_spent ?? 0)}
        </Text>
      ) : null}
    </View>
  );
}

export function DiscountBox({
  discount,
  onChange,
}: {
  discount: DiscountSpec;
  onChange: (next: DiscountSpec) => void;
}) {
  return (
    <View style={styles.pair}>
      <View style={styles.modeToggle}>
        {(['amount', 'percent'] as const).map(mode => (
          <Pressable
            key={mode}
            style={[styles.modeBtn, discount.mode === mode && styles.modeOn]}
            onPress={() => onChange({ ...discount, mode })}
          >
            <Text style={[styles.modeText, discount.mode === mode && styles.modeTextOn]}>
              {mode === 'amount' ? 'د.ع' : '%'}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={[styles.input, { flex: 1, flexBasis: 0, minWidth: 0 }]}
        value={discount.value ? String(discount.value) : ''}
        onChangeText={text => onChange({ ...discount, value: Number(text.replace(/[^\d.]/g, '')) || 0 })}
        placeholder="داشکاندن"
        placeholderTextColor={colors.textFaint}
        keyboardType="number-pad"
        textAlign="right"
      />
    </View>
  );
}

/* -------------------------------------------------------------- sheets --- */

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function QuickAddSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, price: number, quantity: number) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const add = () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('نرخ', 'نرخێکی دروست بنووسە.');

    const detail = [color.trim(), size.trim()].filter(Boolean).join(' · ');
    const label = (name.trim() || 'بەرهەمی گشتی') + (detail ? ` (${detail})` : '');

    onAdd(label, value, quantity);
    onClose();
  };

  return (
    <Shell title="بەرهەمی خێرا" onClose={onClose}>
      <Text style={styles.hint}>بۆ شتێک کە لە کەتەلۆگدا نییە. لە کۆگا کەم ناکرێتەوە.</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ناو (بەرهەمی گشتی)"
        placeholderTextColor={colors.textFaint} textAlign="right" />
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="نرخ"
        placeholderTextColor={colors.textFaint} keyboardType="number-pad" textAlign="right" />
      <View style={styles.pair}>
        <TextInput style={[styles.input, styles.half]} value={color} onChangeText={setColor} placeholder="ڕەنگ"
          placeholderTextColor={colors.textFaint} textAlign="right" />
        <TextInput style={[styles.input, styles.half]} value={size} onChangeText={setSize} placeholder="قەبارە"
          placeholderTextColor={colors.textFaint} textAlign="right" />
      </View>

      <View style={styles.qty}>
        <Pressable style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
        <Text style={styles.qtyValue}>{quantity}</Text>
        <Pressable style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
          <Text style={styles.qtyBtnText}>−</Text>
        </Pressable>
      </View>

      <Pressable style={styles.primary} onPress={add}>
        <Text style={styles.primaryText}>زیادکردن بۆ سەبەتە</Text>
      </Pressable>
    </Shell>
  );
}

export function HeldSheet({
  held,
  onClose,
  onResume,
  onDiscard,
}: {
  held: HeldSale[];
  onClose: () => void;
  onResume: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  return (
    <Shell title="فرۆشتنە هێڵراوەکان" onClose={onClose}>
      {held.length === 0 ? (
        <Text style={styles.hint}>هیچ فرۆشتنێکی هێڵراو نییە.</Text>
      ) : (
        held.map(entry => {
          const total = entry.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
          const count = entry.lines.reduce((sum, line) => sum + line.quantity, 0);

          return (
            <View key={entry.id} style={styles.heldRow}>
              <Pressable onPress={() => onDiscard(entry.id)} hitSlop={8}>
                <Text style={styles.discard}>سڕینەوە</Text>
              </Pressable>
              <View style={styles.heldText}>
                <Text style={styles.heldTitle}>
                  {entry.customer.name || entry.customer.phone || 'کڕیاری بێ ناو'} · {count} دانە
                </Text>
                <Text style={styles.hint}>
                  {formatDateTime(entry.at)} · {formatIQD(total)}
                </Text>
              </View>
              <Pressable style={styles.resume} onPress={() => onResume(entry.id)}>
                <Text style={styles.resumeText}>بەردەوامبوون</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </Shell>
  );
}

/**
 * The till's last sales: reprint a receipt, or take something back.
 *
 * Opens the same order sheet the back office uses, so a return rung up here
 * and one rung up there go through one path and read the same on the report.
 */
export function RecentSalesSheet({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<Order | null>(null);
  const list = useFetch<Paginated<Order>>(() => ordersApi.list({ channel: 'pos', limit: 20 }), []);

  return (
    <>
      <Shell title="فرۆشتنەکانی دوایی" onClose={onClose}>
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <Text style={styles.hint}>ئەم بەشە پێویستی بە ئینتەرنێت هەیە.</Text>
        ) : (list.data?.data.length ?? 0) === 0 ? (
          <Text style={styles.hint}>هێشتا هیچ فرۆشتنێک نییە.</Text>
        ) : (
          list.data!.data.map(order => (
            <Pressable key={order.id} style={styles.heldRow} onPress={() => setOpen(order)}>
              <Text style={styles.heldTotal}>{formatIQD(order.total_amount)}</Text>
              <View style={styles.heldText}>
                <Text style={styles.heldTitle}>
                  {order.invoice_no ?? `#${order.id}`}
                  {order.fully_returned ? ' · گەڕێنراوە' : order.refunded_amount ? ' · بەشێکی گەڕاوە' : ''}
                </Text>
                <Text style={styles.hint}>
                  {formatDateTime(order.created_at)} · {order.customer_name || 'کڕیاری بێ ناو'}
                </Text>
              </View>
              <NavIcon name="orders" size={16} color={colors.textFaint} />
            </Pressable>
          ))
        )}
      </Shell>

      <OrderSheet order={open} onClose={() => setOpen(null)} onChanged={list.refresh} />
    </>
  );
}

const styles = StyleSheet.create({
  stripScroll: { flexGrow: 0, marginBottom: spacing.sm },
  strip: { flexDirection: 'row-reverse', gap: spacing.sm, alignItems: 'center' },
  shiftChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shiftOpen: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  shiftClosed: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  dot: { width: 8, height: 8, borderRadius: 4 },
  shiftText: { ...typography.tiny, color: colors.text },
  shiftAction: { ...typography.tiny, color: colors.brand },
  tool: {
    height: 36,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolDisabled: { opacity: 0.4 },
  toolText: { ...typography.tiny, color: colors.text },

  box: { gap: 4 },
  pair: { flexDirection: 'row-reverse', gap: spacing.sm, alignItems: 'center' },
  half: { flex: 1, flexBasis: 0, minWidth: 0 },
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.small,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  found: { ...typography.tiny, color: colors.success, textAlign: 'right' },
  modeToggle: { flexDirection: 'row', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  modeBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  modeOn: { backgroundColor: colors.ink },
  modeText: { ...typography.small, color: colors.textMuted },
  modeTextOn: { color: '#fff' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.title, color: colors.text },
  close: { fontSize: 20, color: colors.textMuted },
  body: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'right' },

  qty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, fontFamily: fonts.bold, color: colors.brand },
  qtyValue: { ...typography.title, color: colors.text, minWidth: 30, textAlign: 'center' },
  primary: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', ...typography.heading },

  heldRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  heldText: { flex: 1, alignItems: 'flex-end' },
  heldTitle: { ...typography.small, color: colors.text, textAlign: 'right' },
  heldTotal: { ...typography.heading, color: colors.text },
  discard: { ...typography.tiny, color: colors.danger },
  resume: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.ink },
  resumeText: { color: '#fff', ...typography.tiny },
});

/**
 * Taking goods back: a refund, or an exchange against what is in the cart.
 *
 * The same two moves the panel's till has. The receipt number finds the sale,
 * the cashier says how many of each line are coming back, and then either the
 * money goes back, or — with the replacement garments already in the cart —
 * the two legs are recorded together so stock for both moves at once and the
 * day's takings are not counted twice.
 */
export function ReturnSheet({
  cartLines,
  onClose,
  onExchanged,
}: {
  cartLines: { variationId: number | null; quantity: number }[];
  onClose: () => void;
  onExchanged: () => void;
}) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const replacements = cartLines
    .filter(line => line.variationId != null)
    .map(line => ({ product_variation_id: line.variationId as number, quantity: line.quantity }));

  const chosen = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ order_item_id: Number(id), quantity: qty }));

  const find = async () => {
    const term = query.trim();
    if (!term) return;

    setBusy(true);
    try {
      const result = await ordersApi.list({ search: term, limit: 10 });
      // The receipt number is exact; a loose match must not return someone else's sale.
      const hit =
        result.data.find(o => o.invoice_no?.toLowerCase() === term.toLowerCase() || String(o.id) === term) ??
        (result.data.length === 1 ? result.data[0] : undefined);

      if (!hit) return Alert.alert('نەدۆزرایەوە', 'هیچ فرۆشتنێک بەم ژمارەیە نەدۆزرایەوە.');

      setOrder(await ordersApi.get(hit.id));
      setQuantities({});
    } catch (error) {
      Alert.alert('نەتوانرا بگەڕێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    if (!order || chosen.length === 0) return;

    setBusy(true);
    try {
      await backoffice.refundOrder(order.id, { items: chosen, reason: reason.trim() || undefined });
      Alert.alert('گەڕێنرایەوە', 'پارەکە بگەڕێنەوە بۆ کڕیار.');
      onClose();
    } catch (error) {
      Alert.alert('نەتوانرا بگەڕێنرێتەوە', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exchange = async () => {
    if (!order || chosen.length === 0) return;
    if (replacements.length === 0) {
      return Alert.alert('بەرهەمی جێگرەوە', 'بەرهەمی جێگرەوە بخە ناو سەبەتەکە.');
    }

    setBusy(true);
    try {
      const result = await backoffice.exchangeOrder(order.id, {
        returned_items: chosen,
        new_items: replacements,
        reason: reason.trim() || undefined,
      });

      const difference = Number(result.difference || 0);
      Alert.alert(
        'گۆڕینەوە تەواو بوو',
        difference > 0
          ? `کڕیار ${formatIQD(difference)} دەدات.`
          : difference < 0
            ? `${formatIQD(-difference)} بگەڕێنەوە بۆ کڕیار.`
            : 'هیچ جیاوازییەک نییە.'
      );
      onExchanged();
      onClose();
    } catch (error) {
      Alert.alert('نەتوانرا بگۆڕدرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="گەڕاندنەوە و گۆڕینەوە" onClose={onClose}>
      <View style={styles.pair}>
        <Pressable style={styles.resume} onPress={find} disabled={busy}>
          <Text style={styles.resumeText}>{busy && !order ? '…' : 'گەڕان'}</Text>
        </Pressable>
        <TextInput
          style={[styles.input, { flex: 1, flexBasis: 0, minWidth: 0 }]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={find}
          placeholder="ژمارەی پسووڵە"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
          textAlign="right"
        />
      </View>

      {order && (
        <>
          <Text style={styles.heldTitle}>
            {order.invoice_no ?? `#${order.id}`} · {formatDateTime(order.created_at)} · {formatIQD(order.total_amount)}
          </Text>

          {order.items.map(item => {
            const left = item.quantity - (item.returned_quantity ?? 0);

            return (
              <View key={item.id} style={styles.heldRow}>
                {left > 0 ? (
                  <View style={styles.qty}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => setQuantities(q => ({ ...q, [item.id]: Math.min(left, (q[item.id] ?? 0) + 1) }))}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{quantities[item.id] ?? 0}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => setQuantities(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.hint}>گەڕاوەتەوە</Text>
                )}
                <View style={styles.heldText}>
                  <Text style={styles.heldTitle}>{item.product_name_ku || item.product_name}</Text>
                  <Text style={styles.hint}>
                    {[item.variation_label, `${item.quantity} × ${formatIQD(item.price)}`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            );
          })}

          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="هۆکار (ئارەزوومەندانە)"
            placeholderTextColor={colors.textFaint}
            textAlign="right"
          />

          <Pressable
            style={[styles.primary, (busy || chosen.length === 0) && { opacity: 0.4 }]}
            onPress={refund}
            disabled={busy || chosen.length === 0}
          >
            <Text style={styles.primaryText}>گەڕاندنەوەی پارە</Text>
          </Pressable>

          <Pressable
            style={[styles.primary, { backgroundColor: colors.ink }, (busy || chosen.length === 0) && { opacity: 0.4 }]}
            onPress={exchange}
            disabled={busy || chosen.length === 0}
          >
            <Text style={styles.primaryText}>
              گۆڕینەوە بە سەبەتە ({replacements.reduce((sum, line) => sum + line.quantity, 0)})
            </Text>
          </Pressable>

          <Text style={styles.hint}>
            بۆ گۆڕینەوە: یەکەم بەرهەمی جێگرەوە بخە ناو سەبەتەکە، پاشان لێرە بەرهەمی گەڕاو دیاری بکە.
          </Text>
        </>
      )}
    </Shell>
  );
}
