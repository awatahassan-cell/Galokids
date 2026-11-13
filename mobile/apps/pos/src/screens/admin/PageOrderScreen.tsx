import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import * as Crypto from 'expo-crypto';
import {
  Alert,
  GOVERNORATES,
  backoffice,
  catalogue,
  type Category,
  type CustomerLookup,
  formatIQD,
  orders as ordersApi,
  shop,
  useLayout,
  type Order,
} from '@galokids/core';
import { Button, Chips, Screen } from '@/components/kit';
import { ProductGrid } from '@/components/ProductGrid';
import { DiscountBox, QuickAddSheet } from '@/components/TillTools';
import { Labeled } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { NavIcon } from '@/navigation/NavIcon';
import { printLabelSheet } from '@/labels/print';
import { buildWaybillHtml, storeInfo, whatsappUrl } from '@/print/receipt';
import { variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
import { Line, VariationPicker } from '@/screens/TillScreen';
import { useCart } from '@/state/useCart';
import { useFetch } from '@/state/useFetch';
import { colors, fonts, radius, spacing, typography } from '@/theme';

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
  const [scanning, setScanning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [found, setFound] = useState<CustomerLookup | null>(null);
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

  useEffect(() => {
    catalogue.categories().then(setCategories).catch(() => {});
  }, []);

  // A returning customer, found by phone — best-effort, never in the way.
  const digits = cart.customer.phone.replace(/\D/g, '');
  useEffect(() => {
    setFound(null);
    if (digits.length < 9) return;

    let alive = true;
    const timer = setTimeout(() => {
      backoffice
        .lookupCustomer(cart.customer.phone)
        .then(result => {
          if (!alive) return;
          setFound(result);
          if (result.found && result.name && !cart.customer.name) cart.setCustomer({ ...cart.customer, name: result.name });
        })
        .catch(() => {});
    }, 500);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleScan = async (code: string) => {
    const result = await cart.scan(code);
    if (result.ok) return setScanning(false);

    if (result.reason === 'unknown') return Alert.alert('نەدۆزرایەوە', `بارکۆدی ${code} لە کەتەلۆگدا نییە.`);

    setScanning(false);
    setPicking({ product: result.product!, options: await variationsFor(result.product!.id) });
  };

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

  const itemCount = cart.totals.itemCount;
  const canSubmit = cart.lines.length > 0 && cart.customer.phone.trim().length > 0 && !busy;

  const barcodeTool = (
    <Pressable style={styles.tool} onPress={() => setScanning(true)}>
      <NavIcon name="labels" size={15} color={colors.textMuted} />
      <Text style={styles.toolText}>بارکۆد</Text>
    </Pressable>
  );

  const quickTool = (
    <Pressable style={[styles.tool, styles.toolPink]} onPress={() => setQuick(true)}>
      <Text style={styles.toolPlus}>＋</Text>
      <Text style={[styles.toolText, { color: '#e11d48' }]}>کاڵای دیاریکراو</Text>
    </Pressable>
  );

  // The catalogue, as the panel has it: search with the barcode and custom-item
  // buttons, the sections as chips, and the products beneath.
  const catalogueView = (
    <View style={styles.catalogue}>
      <View style={{ flex: 1 }}>
        <ProductGrid
          onPick={pick}
          columns={wide ? 3 : 2}
          toolbar={wide ? <>{quickTool}{barcodeTool}</> : barcodeTool}
          categoryId={categoryFilter ? Number(categoryFilter) : null}
          belowSearch={
            categories.length > 0 ? (
              <Chips
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[{ id: '', label: 'هەموو پۆلەکان' }, ...categories.map(c => ({ id: String(c.id), label: c.name_ku || c.name }))]}
              />
            ) : undefined
          }
        />
      </View>
    </View>
  );

  const panel = (
    <View style={[styles.panel, wide && styles.panelWide]}>
      <View style={styles.panelHead}>
        <View style={styles.panelIcon}>
          <NavIcon name="suppliers" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.panelTitle}>تۆمارکردنی داواکاری و گەیاندن</Text>
          <Text style={styles.panelSub}>{itemCount} کاڵا دیاریکراوە</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.panelBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {cart.lines.length === 0 ? (
          <Pressable style={styles.dropzone} onPress={() => !wide && setAdding(true)}>
            <View style={styles.dropIcon}>
              <NavIcon name="orders" size={20} color="#f9a8b8" />
            </View>
            <Text style={styles.dropText}>
              {wide ? 'کلیک لە کاڵاکانی لای ڕاست بکە بۆ زیادکردن' : 'کلیک بکە بۆ زیادکردنی کاڵا'}
            </Text>
          </Pressable>
        ) : (
          <View style={{ gap: spacing.xs }}>
            {cart.lines.map(line => (
              <Line key={line.key} line={line} onChange={cart.setQuantity} onRemove={cart.remove} />
            ))}
            {!wide && (
              <View style={styles.row}>
                <Button label="زیادکردنی کاڵا" tone="ink" onPress={() => setAdding(true)} />
                <Button label="کاڵای دیاریکراو" tone="quiet" onPress={() => setQuick(true)} />
              </View>
            )}
          </View>
        )}

        <View style={styles.pair}>
          <Labeled label="ناوی سیانی کڕیار" half>
            <TextInput style={styles.input} value={cart.customer.name} onChangeText={name => cart.setCustomer({ ...cart.customer, name })} placeholder="ناوی کڕیار…" placeholderTextColor={colors.textFaint} />
          </Labeled>
          <Labeled label="ژمارەی مۆبایل" required half>
            <TextInput style={styles.input} value={cart.customer.phone} onChangeText={phone => cart.setCustomer({ ...cart.customer, phone })} placeholder="0750 123 4567" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
          </Labeled>
        </View>
        {found?.found ? (
          <Text style={styles.found}>
            کڕیاری جاران · {found.orders_count} داواکاری · {formatIQD(found.total_spent ?? 0)}
          </Text>
        ) : null}

        <View style={styles.pair}>
          <Labeled label="ژمارەی دووەم (ئارەزوومەندانە)" half>
            <TextInput style={styles.input} value={phone2} onChangeText={setPhone2} placeholder="0770 000 0000" placeholderTextColor={colors.textFaint} keyboardType="phone-pad" />
          </Labeled>
          <Labeled label="یوزەری پەیج / کۆدی چات" half>
            <TextInput style={styles.input} value={handle} onChangeText={setHandle} placeholder="username@" placeholderTextColor={colors.textFaint} />
          </Labeled>
        </View>

        <View style={styles.pair}>
          <Labeled label="پارێزگا" half>
            <Select
              value={governorate}
              options={GOVERNORATES.map(g => ({ id: g.en, label: g.ku }))}
              onChange={next => {
                setGovernorate(next);
                setDistrict('');
              }}
            />
          </Labeled>
          <Labeled label="قەزا / ناوچە" half>
            <Select
              value={district}
              options={[{ id: '', label: '— هەڵبژێرە —' }, ...(gov?.districts ?? []).map(d => ({ id: d.en, label: d.ku }))]}
              onChange={setDistrict}
              disabled={(gov?.districts.length ?? 0) === 0}
            />
          </Labeled>
        </View>

        <Labeled label="ناونیشانی تەواو (گەڕەک، کۆڵان، خاڵی دیار)">
          <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} placeholder="نموونە: شەقامی ٤٠ مەتری، نزیک مارکێتی بەختیاری…" placeholderTextColor={colors.textFaint} multiline />
        </Labeled>

        <View style={styles.shipBox}>
          <View style={styles.shipHead}>
            <Pressable style={styles.shipToggle} onPress={() => setCustomShipping(v => !v)}>
              <Text style={styles.shipToggleText}>دەستکاری بە دەستی</Text>
              <View style={[styles.check, customShipping && styles.checkOn]}>
                {customShipping && <Text style={styles.checkMark}>●</Text>}
              </View>
            </Pressable>
            <Text style={styles.shipTitle}>کرێی گەیاندن:</Text>
          </View>
          <View style={styles.shipRow}>
            <Text style={styles.shipLabel}>{customShipping ? 'کرێی دیاریکراو' : 'نرخی پێشوەختە بۆ ئەم شارە'}</Text>
            {customShipping ? (
              <TextInput style={[styles.input, { width: 130, minHeight: 38 }]} value={shippingInput} onChangeText={setShippingInput} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textFaint} />
            ) : (
              <Text style={styles.shipValue}>{quote == null ? '—' : quote > 0 ? formatIQD(quote) : 'خۆڕایی'}</Text>
            )}
          </View>
        </View>

        <View style={styles.pair}>
          <Labeled label="داشکاندن" half>
            <DiscountBox discount={cart.discount} onChange={cart.setDiscount} />
          </Labeled>
          <Labeled label="شێوازی پارەدان" half>
            <Select value={payment} options={PAYMENTS.map(p => ({ id: p.id, label: p.label }))} onChange={setPayment} />
          </Labeled>
        </View>

        <Labeled label="دۆخی داواکاری">
          <Select value={status} options={STATUSES.map(st => ({ id: st.id, label: st.label }))} onChange={setStatus} />
        </Labeled>

        <Labeled label="تێبینی بۆ پاکەت یان دلیڤەری">
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="نموونە: بەستەی دیاری بێت، گەیاندنی ئێواران…" placeholderTextColor={colors.textFaint} />
        </Labeled>

      </ScrollView>

      {/* Pinned under the form, as the panel has it: the total and the button to
          send are always on screen, whatever has been scrolled to above. */}
      <View style={styles.footer}>
        <View style={styles.totals}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>کۆی کاڵاکان:</Text>
              <Text style={styles.totalValue}>{formatIQD(cart.totals.subtotal)}</Text>
            </View>
            {cart.totals.discount > 0 && (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>داشکاندن:</Text>
                <Text style={styles.totalValue}>{formatIQD(-cart.totals.discount)}</Text>
              </View>
            )}
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>کرێی گەیاندن:</Text>
              <Text style={styles.totalValue}>{shipping > 0 ? formatIQD(shipping) : 'خۆڕایی'}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalLine}>
              <Text style={styles.grandLabel}>کۆی گشتی بۆ وەرگرتن:</Text>
              <Text style={styles.grandValue}>{formatIQD(grandTotal)}</Text>
            </View>
          </View>

          <Pressable style={[styles.submit, !canSubmit && styles.submitOff]} onPress={place} disabled={!canSubmit}>
            <Text style={styles.submitText}>{busy ? 'تۆمار دەکرێت…' : 'تۆمارکردنی داواکاری و ناردن'}</Text>
          </Pressable>
      </View>
    </View>
  );

  return (
    <Screen title="داواکاری پەیج" subtitle="تۆمارکردنی فرۆشتن و دلیڤەری پەیجەکان" scroll={false}>
      {wide ? (
        <View style={styles.split}>
          {catalogueView}
          {panel}
        </View>
      ) : (
        <View style={{ flex: 1 }}>{panel}</View>
      )}

      {/* The catalogue, raised on demand (phone). */}
      <Modal visible={adding && !wide} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { height: '88%' }]}>
            <View style={styles.sheetHead}>
              <Pressable onPress={() => setAdding(false)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>هەڵبژاردنی بەرهەم</Text>
            </View>

            <View style={{ flex: 1, padding: spacing.md }}>
              <ProductGrid onPick={pick} columns={2} />
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

      {/* On a desk the choice of colour and size opens over the page. */}
      <Modal visible={wide && picking !== null} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <View style={[styles.backdrop, { justifyContent: 'center', padding: spacing.lg }]}>
          {picking && (
            <VariationPicker
              product={picking.product}
              options={picking.options}
              onPick={option => {
                cart.add(picking.product, option);
                setPicking(null);
              }}
              onCancel={() => setPicking(null)}
            />
          )}
        </View>
      </Modal>

      <Modal visible={scanning} transparent animationType="fade" onRequestClose={() => setScanning(false)}>
        <View style={[styles.backdrop, { justifyContent: 'center', padding: spacing.lg }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScanning(false)} />
          <View style={styles.scanCard}>
            <BarcodeScanner onScan={handleScan} paused={false} />
            <Pressable style={{ alignItems: 'center', padding: spacing.md }} onPress={() => setScanning(false)}>
              <Text style={styles.close}>داخستن</Text>
            </Pressable>
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

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row-reverse', gap: spacing.lg, paddingBottom: spacing.lg },
  catalogue: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  panel: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: 'hidden',
  },
  panelWide: { flexGrow: 0, flexShrink: 0, flexBasis: 520 },
  panelHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  panelIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...typography.heading, color: colors.text },
  panelSub: { ...typography.tiny, color: colors.textFaint },
  panelBody: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  dropzone: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(248,250,252,0.6)',
  },
  dropIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  dropText: { ...typography.small, color: colors.textFaint, textAlign: 'center' },

  pair: { flexDirection: 'row-reverse', gap: spacing.sm },
  row: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...typography.small,
    color: colors.text,
    backgroundColor: 'rgba(241,245,249,0.85)',
  },
  multiline: { minHeight: 72, paddingTop: spacing.sm, textAlignVertical: 'top' },
  found: { ...typography.tiny, color: colors.success, textAlign: 'right', marginTop: -spacing.xs },

  shipBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(248,250,252,0.8)',
  },
  shipHead: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  shipTitle: { ...typography.small, color: '#e11d48', fontFamily: fonts.bold },
  shipToggle: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs },
  shipToggleText: { ...typography.tiny, color: colors.textMuted },
  check: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkMark: { color: '#fff', fontSize: 7 },
  shipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#fff',
  },
  shipLabel: { ...typography.tiny, color: colors.textMuted },
  shipValue: { ...typography.small, color: colors.text, fontFamily: fonts.bold },

  totals: { gap: 4, padding: spacing.md, borderRadius: radius.xl, backgroundColor: '#0f172a' },
  totalLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...typography.small, color: '#94a3b8' },
  totalValue: { ...typography.small, color: '#fff' },
  totalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },
  grandLabel: { ...typography.heading, color: '#fff' },
  grandValue: { fontSize: 22, fontFamily: fonts.bold, lineHeight: 32, color: '#fb7185' },

  submit: { minHeight: 52, borderRadius: radius.lg, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  submitOff: { backgroundColor: '#cbd5e1' },
  submitText: { color: '#fff', ...typography.heading },

  tool: {
    height: 46,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(241,245,249,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolPink: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  toolText: { ...typography.small, color: colors.textMuted },
  toolPlus: { color: '#e11d48', fontSize: 15 },

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
  close: { fontSize: 16, color: colors.textMuted },
  pickerLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scanCard: { width: '100%', maxWidth: 420, borderRadius: radius.xl, backgroundColor: colors.surface, overflow: 'hidden' },
  doneCard: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'stretch',
  },
  doneTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  doneBody: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
