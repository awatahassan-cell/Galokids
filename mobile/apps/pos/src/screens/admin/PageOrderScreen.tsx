import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  Alert,
  GOVERNORATES,
  formatIQD,
  orders as ordersApi,
  shop,
  useLayout,
  type Order,
} from '@galokids/core';
import { Button, Chips, Screen } from '@/components/kit';
import { ProductGrid } from '@/components/ProductGrid';
import { CustomerBox, DiscountBox, QuickAddSheet } from '@/components/TillTools';
import { printLabelSheet } from '@/labels/print';
import { buildWaybillHtml, storeInfo, whatsappUrl } from '@/print/receipt';
import { variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
import { Line, VariationPicker } from '@/screens/TillScreen';
import { useCart } from '@/state/useCart';
import { useFetch } from '@/state/useFetch';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Entering an order that came in through a page's messages.
 *
 * Much of this shop's trade starts as a chat on Instagram or Facebook, and the
 * order has to be typed in by hand: who, where, what, how it is paid, and what
 * delivery costs. This is the panel's "page order" form — the till's basket
 * with the delivery fields it does not need — and it records the order on the
 * social channel so it counts under the page, not the counter.
 *
 * Needs a connection: unlike a till sale there is no drawer to open and no
 * customer standing waiting, and the order has to exist on the server for the
 * delivery to be arranged.
 */

const PAYMENTS = [
  { id: 'cash', label: 'کاش لەکاتی وەرگرتن', value: 'Cash on Delivery (COD)' },
  { id: 'fib', label: 'FIB', value: 'FIB' },
  { id: 'fastpay', label: 'FastPay', value: 'FASTPAY' },
  { id: 'prepaid', label: 'پێشوەختە', value: 'PREPAID' },
] as const;

const STATUSES = [
  { id: 'pending', label: 'چاوەڕوان' },
  { id: 'processing', label: 'لە ئامادەکردندا' },
  { id: 'shipped', label: 'نێردراو' },
] as const;

export default function PageOrderScreen() {
  const { wide } = useLayout();
  const cart = useCart();
  const settings = useFetch(() => shop.settings(), []);

  const [governorate, setGovernorate] = useState('Erbil');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone2, setPhone2] = useState('');
  const [handle, setHandle] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]['id']>('cash');
  const [status, setStatus] = useState<(typeof STATUSES)[number]['id']>('pending');

  const [customShipping, setCustomShipping] = useState(false);
  const [shippingInput, setShippingInput] = useState('');
  const [quote, setQuote] = useState<number | null>(null);

  const [adding, setAdding] = useState(false);
  const [quick, setQuick] = useState(false);
  const [picking, setPicking] = useState<{ product: LocalProduct; options: LocalVariation[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Order | null>(null);
  const [attempt, setAttempt] = useState(() => Crypto.randomUUID());

  const gov = useMemo(() => GOVERNORATES.find(g => g.en === governorate), [governorate]);

  // What delivery costs is the server's to say — it has the rate card — and is
  // asked again when the place or the goods total changes, since some places
  // ship free above an amount.
  const goods = cart.totals.total;
  useEffect(() => {
    let alive = true;

    shop
      .shippingQuote(governorate, goods)
      .then(result => alive && setQuote(result.fee))
      .catch(() => alive && setQuote(null));

    return () => {
      alive = false;
    };
  }, [governorate, goods]);

  const shipping = customShipping ? Math.max(0, Number(shippingInput) || 0) : (quote ?? 0);
  const grandTotal = goods + shipping;

  const pick = async (product: LocalProduct, variation: LocalVariation | null) => {
    const options = variation ? [variation] : await variationsFor(product.id);

    if (options.length > 1) setPicking({ product, options });
    else {
      cart.add(product, options[0] ?? null);
      setAdding(false);
    }
  };

  const reset = () => {
    cart.clear();
    setDistrict('');
    setAddress('');
    setPhone2('');
    setHandle('');
    setNotes('');
    setCustomShipping(false);
    setShippingInput('');
    setAttempt(Crypto.randomUUID());
    setDone(null);
  };

  const place = async () => {
    if (cart.lines.length === 0) return Alert.alert('سەبەتە', 'سەرەتا بەرهەم زیاد بکە.');
    if (!cart.customer.phone.trim()) return Alert.alert('مۆبایل', 'ژمارەی مۆبایلی کڕیار پێویستە.');

    // Where it goes, as one line, with the page and the extras the server has
    // no column for kept in brackets — the same layout the panel writes, so
    // the two sources read alike in the orders list.
    const where = [gov?.ku ?? governorate, district, address.trim()].filter(Boolean).join(' - ');
    const extras = [
      `Source: SOCIAL${handle.trim() ? ` (@${handle.trim()})` : ''}`,
      phone2.trim() ? `Phone 2: ${phone2.trim()}` : null,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    setBusy(true);
    try {
      const order = await ordersApi.create({
        items: cart.lines.map(line =>
          line.custom
            ? { quantity: line.quantity, unit_price: line.unitPrice, name: line.custom.name }
            : {
                product_id: line.product.id,
                product_variation_id: line.variation?.id ?? null,
                quantity: line.quantity,
              }
        ),
        channel: 'social',
        status,
        payment_method: PAYMENTS.find(p => p.id === payment)!.value,
        customer_name: cart.customer.name.trim() || 'کڕیاری پەیج',
        customer_phone: cart.customer.phone.trim(),
        governorate,
        shipping_address: `${where} [${extras}]`,
        shipping_fee: shipping,
        discount_amount: cart.totals.discount || undefined,
        // A second tap, or a retry after a dropped connection, finds the
        // order that already exists instead of making another.
        idempotency_key: attempt,
      });

      setDone(order);
    } catch (error) {
      Alert.alert('نەتوانرا داواکاری تۆمار بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const print = () =>
    done &&
    printLabelSheet(buildWaybillHtml(done, storeInfo(settings.data))).catch(error =>
      Alert.alert('نەتوانرا چاپ بکرێت', (error as Error).message)
    );

  const whatsapp = () => {
    const url = done && whatsappUrl(done);
    if (url) Linking.openURL(url);
  };

  const form = (
    <View style={[styles.column, wide && styles.columnWide]}>
      {/* ---- basket ---- */}
      <Card title={`بەرهەمەکان · ${cart.totals.itemCount}`}>
        {cart.lines.map(line => (
          <Line key={line.key} line={line} onChange={cart.setQuantity} onRemove={cart.remove} />
        ))}

        <View style={styles.row}>
          <Button label="زیادکردنی بەرهەم" onPress={() => setAdding(true)} />
          <Button label="بەرهەمی خێرا" tone="quiet" onPress={() => setQuick(true)} />
        </View>
      </Card>

      {/* ---- customer ---- */}
      <Card title="کڕیار">
        <CustomerBox customer={cart.customer} onChange={cart.setCustomer} />
        <Field value={phone2} onChange={setPhone2} placeholder="مۆبایلی دووەم (ئارەزوومەندانە)" keyboard="phone-pad" />
        <Field value={handle} onChange={setHandle} placeholder="ناوی پەیج / @ئەکاونت" />
      </Card>

      {/* ---- where ---- */}
      <Card title="ناونیشان">
        <Chips
          value={governorate}
          onChange={next => {
            setGovernorate(next);
            setDistrict('');
          }}
          options={GOVERNORATES.map(g => ({ id: g.en, label: g.ku }))}
        />

        {gov && gov.districts.length > 0 && (
          <Chips
            value={district}
            onChange={setDistrict}
            options={[{ id: '', label: 'هەموو' }, ...gov.districts.map(d => ({ id: d.en, label: d.ku }))]}
          />
        )}

        <Field value={address} onChange={setAddress} placeholder="گەڕەک، شەقام، نزیک…" />
        <Field value={notes} onChange={setNotes} placeholder="تێبینی بۆ داواکارییەکە" />
      </Card>

      {/* ---- how ---- */}
      <Card title="پارەدان و دۆخ">
        <Chips value={payment} onChange={setPayment} options={PAYMENTS.map(p => ({ id: p.id, label: p.label }))} />
        <Chips value={status} onChange={setStatus} options={STATUSES.map(s => ({ id: s.id, label: s.label }))} />
      </Card>

      {/* ---- money ---- */}
      <Card title="کۆی گشتی">
        <DiscountBox discount={cart.discount} onChange={cart.setDiscount} />

        <View style={styles.shipRow}>
          <Text style={styles.label}>گەیاندن</Text>
          {customShipping ? (
            <TextInput
              style={[styles.input, { width: 140 }]}
              value={shippingInput}
              onChangeText={setShippingInput}
              keyboardType="number-pad"
              placeholder="کرێی گەیاندن"
              placeholderTextColor={colors.textFaint}
              textAlign="right"
            />
          ) : (
            <Text style={styles.value}>{quote == null ? '—' : quote > 0 ? formatIQD(quote) : 'خۆڕایی'}</Text>
          )}
          <Pressable onPress={() => setCustomShipping(v => !v)}>
            <Text style={styles.link}>{customShipping ? 'نرخی خۆکار' : 'نرخی دەستی'}</Text>
          </Pressable>
        </View>

        <Total label="کۆی بەرهەمەکان" value={formatIQD(cart.totals.subtotal)} />
        {cart.totals.discount > 0 && <Total label="داشکاندن" value={`−${formatIQD(cart.totals.discount)}`} />}
        <Total label="کۆی گشتی" value={formatIQD(grandTotal)} big />

        <Button
          label={busy ? 'تۆمار دەکرێت…' : 'تۆمارکردنی داواکاری'}
          onPress={place}
          disabled={busy || cart.lines.length === 0}
        />
      </Card>
    </View>
  );

  return (
    <Screen title="داواکاری پەیج" subtitle="تۆمارکردنی داواکاری سۆشیاڵ میدیا" scroll={false}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {form}
      </ScrollView>

      {/* The catalogue, raised on demand. */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { height: '88%' }]}>
            <View style={styles.sheetHead}>
              <Pressable onPress={() => setAdding(false)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>هەڵبژاردنی بەرهەم</Text>
            </View>

            <View style={{ flex: 1, padding: spacing.md }}>
              <ProductGrid onPick={pick} columns={wide ? 4 : 2} />
            </View>

            {picking && (
              <View style={styles.pickerLayer}>
                <VariationPicker
                  product={picking.product}
                  options={picking.options}
                  onPick={option => {
                    cart.add(picking.product, option);
                    setPicking(null);
                    setAdding(false);
                  }}
                  onCancel={() => setPicking(null)}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {quick && (
        <QuickAddSheet onClose={() => setQuick(false)} onAdd={(name, price, qty) => cart.addCustom(name, price, qty)} />
      )}

      {/* The order is in: what a page order needs next is the waybill. */}
      <Modal visible={done !== null} transparent animationType="fade">
        <View style={[styles.backdrop, { justifyContent: 'center', padding: spacing.lg }]}>
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>داواکارییەکە تۆمارکرا 🎉</Text>
            <Text style={styles.doneBody}>
              {done?.invoice_no ?? `#${done?.id}`} · {formatIQD(done?.total_amount ?? 0)}
            </Text>

            <View style={styles.row}>
              <Button label="وەسڵی گەیاندن" onPress={print} />
              <Button label="واتساپ" tone="quiet" onPress={whatsapp} />
            </View>
            <Button label="داواکاری نوێ" tone="quiet" onPress={reset} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboard?: 'phone-pad';
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboard}
      textAlign="right"
    />
  );
}

function Total({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.shipRow}>
      <Text style={big ? styles.bigLabel : styles.label}>{label}</Text>
      <Text style={big ? styles.bigValue : styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  column: { gap: spacing.md },
  columnWide: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
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
  shipRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { ...typography.small, color: colors.textMuted },
  value: { ...typography.small, color: colors.text },
  link: { ...typography.tiny, color: colors.brand },
  bigLabel: { ...typography.heading, color: colors.textMuted },
  bigValue: { ...typography.display, color: colors.text },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { ...typography.title, color: colors.text },
  close: { fontSize: 20, color: colors.textMuted },
  pickerLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  doneCard: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'stretch',
  },
  doneTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  doneBody: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
