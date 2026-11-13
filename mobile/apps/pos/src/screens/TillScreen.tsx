import { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Image } from 'expo-image';
import { Alert, formatIQD, shop, useLayout, type Order } from '@galokids/core';
import { enqueueSale, variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
import { useCart, type CartLine } from '@/state/useCart';
import { useHeld } from '@/state/useHeld';
import { useShift } from '@/state/useShift';
import { useFetch } from '@/state/useFetch';
import { CashSheet, CloseShiftSheet, OpenShiftSheet } from '@/components/ShiftModals';
import { CustomerBox, DiscountBox, HeldSheet, QuickAddSheet, RecentSalesSheet, ReturnSheet, TillBar } from '@/components/TillTools';
import { printLabelSheet } from '@/labels/print';
import { buildReceiptHtml, storeInfo } from '@/print/receipt';
import { useSync } from '@/state/useSync';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ProductGrid } from '@/components/ProductGrid';
import { NavIcon } from '@/navigation/NavIcon';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The counter.
 *
 * The panel's till, in the panel's shape: a wall of products on one side and
 * the cart on the other. A cashier picks a garment by tapping its picture far
 * more often than by scanning it — children's clothes arrive without a tag as
 * often as with one — so the scanner is a tool on this screen rather than the
 * screen itself.
 *
 * Taking the money never depends on the network. The sale is written to the
 * device, the receipt number comes from the device, and the drawer opens —
 * then, separately and later, the sale is sent. A cashier should not be able
 * to tell from this screen whether the shop has a connection, except by
 * reading the strip at the top because they chose to.
 */
export default function TillScreen() {
  const cart = useCart();
  const { syncNow } = useSync();
  const { wide, width } = useLayout();

  const [busy, setBusy] = useState(false);
  const [cashGiven, setCashGiven] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');
  const [scanning, setScanning] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [sheet, setSheet] = useState<'shift' | 'cash' | 'held' | 'recent' | 'return' | 'quick' | null>(null);
  const shift = useShift();
  const held = useHeld();
  const settings = useFetch(() => shop.settings(), []);
  const [picking, setPicking] = useState<{
    product: LocalProduct;
    options: LocalVariation[];
  } | null>(null);

  // Four across on a phone is unreadable and two on a desk is a lot of
  // scrolling, so the grid is sized from the space it actually has.
  const gridWidth = wide ? width - 232 - 420 : width;
  const columns = Math.max(2, Math.min(6, Math.floor(gridWidth / 150)));

  const pick = useCallback(
    async (product: LocalProduct, variation: LocalVariation | null) => {
      if (variation) {
        cart.add(product, variation);
        return;
      }

      const options = await variationsFor(product.id);

      // Several colours or sizes behind one tap: the cashier says which,
      // because guessing puts the shop's stock wrong where nobody sees it.
      if (options.length > 1) setPicking({ product, options });
      else cart.add(product, options[0] ?? null);
    },
    [cart]
  );

  const handleScan = useCallback(
    async (code: string) => {
      const result = await cart.scan(code);
      if (result.ok) return;

      if (result.reason === 'unknown') {
        // Said once, plainly. A cashier scanning a garment the till has never
        // heard of needs to know the till is not simply slow.
        Alert.alert('نەدۆزرایەوە', `بارکۆدی ${code} لە کەتەلۆگی ئەم ئامێرەدا نییە.`);
        return;
      }

      setPicking({ product: result.product!, options: await variationsFor(result.product!.id) });
    },
    [cart]
  );

  const takePayment = useCallback(
    async (print: boolean) => {
      if (cart.lines.length === 0 || busy) return;
      const method = payMethod;

      // Only a definite "no shift" stops a sale. If the till cannot reach the
      // server it cannot know, and a shop that has lost its wifi still has to
      // be able to sell.
      if (shift.state === 'closed') {
        Alert.alert('شیفت دابخراوە', 'پێش فرۆشتن شیفتێک بکەرەوە.');
        setSheet('shift');
        return;
      }

      if (method === 'cash' && cashGiven !== '' && Number(cashGiven) < cart.totals.total) {
        Alert.alert('پارەی وەرگیراو', 'پارەی وەرگیراو لە کۆی گشتی کەمترە.');
        return;
      }

      setBusy(true);

      try {
        const paid = method === 'cash' ? Number(cashGiven || cart.totals.total) : cart.totals.total;

        const row = await enqueueSale(
          {
            items: cart.lines.map(line =>
              line.custom
                ? { quantity: line.quantity, unit_price: line.unitPrice, name: line.custom.name }
                : {
                    product_id: line.product.id,
                    product_variation_id: line.variation?.id ?? null,
                    quantity: line.quantity,
                  }
            ),
            customer_name: cart.customer.name.trim() || undefined,
            customer_phone: cart.customer.phone.trim() || undefined,
            channel: 'pos',
            payment_method: method,
            discount_amount: cart.totals.discount || undefined,
            amount_paid: paid,
          },
          {
            totalAmount: cart.totals.total,
            stockLines: cart.lines
              .filter(line => line.variation)
              .map(line => ({ variationId: line.variation!.id, quantity: line.quantity })),
          }
        );

        const change = Math.max(0, paid - cart.totals.total);
        const total = cart.totals.total;

        // What was just sold, as the receipt needs it. Taken before the cart
        // is cleared; built here rather than read back from the server so the
        // receipt prints with no connection, like the sale itself.
        const sold: Order = {
          id: 0,
          invoice_no: row.invoice_no,
          customer_name: cart.customer.name.trim() || null,
          customer_phone: cart.customer.phone.trim() || null,
          status: 'delivered',
          subtotal: cart.totals.subtotal,
          discount_amount: cart.totals.discount,
          shipping_fee: 0,
          total_amount: total,
          amount_paid: paid,
          change_due: change,
          governorate: null,
          shipping_address: null,
          payment_method: method,
          channel: 'pos',
          created_at: new Date().toISOString(),
          items: cart.lines.map((line, index) => ({
            id: index,
            product_id: line.custom ? null : line.product.id,
            product_variation_id: line.variation?.id ?? null,
            product_name: line.custom?.name ?? line.product.name,
            product_name_ku: line.custom ? null : line.product.name_ku,
            variation_label: [line.variation?.color, line.variation?.size].filter(Boolean).join(' · ') || null,
            quantity: line.quantity,
            price: line.unitPrice,
          })),
        };

        cart.clear();
        setCashGiven('');
        setCartOpen(false);

        // Sent in the background. The sale is already safe on the device, so
        // nothing here waits for it and nothing here fails if it cannot go.
        syncNow({ pullCatalogue: false });

        if (print) {
          // Sell and print, as the panel's button does: the receipt goes
          // straight to the printer with nothing to confirm in between.
          printLabelSheet(buildReceiptHtml(sold, storeInfo(settings.data))).catch(error =>
            Alert.alert('نەتوانرا چاپ بکرێت', (error as Error).message)
          );
        } else {
          Alert.alert(
            'فرۆشتن تۆمارکرا',
            `پسووڵە ${row.invoice_no}\nکۆی گشتی ${formatIQD(total)}` +
              (change > 0 ? `\nگەڕاوە ${formatIQD(change)}` : '')
          );
        }
      } catch (error) {
        Alert.alert('نەتوانرا تۆمار بکرێت', (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [busy, cart, cashGiven, syncNow, shift.state, settings.data, payMethod]
  );

  const holdSale = () => {
    if (cart.lines.length === 0) return;
    held.hold(cart.snapshot());
    cart.clear();
    setCashGiven('');
  };

  const resume = (id: string) => {
    // Picking one up while another is half rung would lose it. Put the current
    // one aside first instead of asking.
    if (cart.lines.length > 0) held.hold(cart.snapshot());
    const saved = held.take(id);
    if (saved) cart.restore(saved);
    setSheet(null);
  };

  const panel = (
    <CartPanel
      cart={cart}
      busy={busy}
      cashGiven={cashGiven}
      onCash={setCashGiven}
      method={payMethod}
      onMethod={setPayMethod}
      onSell={takePayment}
      onHold={holdSale}
      onClear={() => {
        cart.clear();
        setCashGiven('');
      }}
      onScan={() => setScanning(true)}
    />
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={styles.gridSide}>
          <TillBar
            shiftState={shift.state}
            heldCount={held.held.length}
            wide={wide}
            onShift={() => setSheet('shift')}
            onCash={() => setSheet('cash')}
            onHeld={() => setSheet('held')}
            onRecent={() => setSheet('recent')}
            onReturn={() => setSheet('return')}
            onQuick={() => setSheet('quick')}
          />
          <ProductGrid
            onPick={pick}
            columns={columns}
            toolbar={
              wide ? (
                <Pressable style={styles.quickAdd} onPress={() => setSheet('quick')}>
                  <Text style={styles.quickAddPlus}>＋</Text>
                  <Text style={styles.quickAddText}>زیادکردنی خێرای بەرهەم</Text>
                </Pressable>
              ) : undefined
            }
          />
        </View>

        {/* On a desk the cart stands beside the grid, as it does in the panel.
            On a phone there is no room for both, so it is a sheet the cashier
            raises — with the total and the count always on the bar, so they
            never have to open it to know where the sale is. */}
        {wide ? <View style={styles.panelSide}>{panel}</View> : null}
      </View>

      {!wide && (
        <Pressable style={styles.bar} onPress={() => setCartOpen(true)}>
          <View style={styles.barLeft}>
            <Text style={styles.barTotal}>{formatIQD(cart.totals.total)}</Text>
            <Text style={styles.barHint}>کردنەوەی سەبەتە</Text>
          </View>

          <View style={styles.barCount}>
            <Text style={styles.barCountText}>
              {cart.lines.reduce((sum, line) => sum + line.quantity, 0)}
            </Text>
          </View>

          <Pressable
            style={styles.barScan}
            onPress={() => setScanning(true)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="سکێنکردنی بارکۆد"
          >
            <NavIcon name="labels" size={18} color="#fff" />
          </Pressable>
        </Pressable>
      )}

      {/* The cart, on a phone. */}
      <Modal visible={!wide && cartOpen} transparent animationType="slide">
        <View style={styles.sheetScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCartOpen(false)} />

          <View style={styles.sheet}>
            <Pressable style={styles.sheetGrab} onPress={() => setCartOpen(false)}>
              <View style={styles.grab} />
            </Pressable>

            {panel}
          </View>
        </View>
      </Modal>

      {/* The scanner, raised on demand rather than occupying the screen. */}
      <Modal visible={scanning} transparent animationType="fade">
        <View style={styles.scanScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setScanning(false)} />

          <View style={styles.scanCard}>
            <BarcodeScanner
              onScan={code => {
                handleScan(code);
              }}
              paused={busy || picking !== null}
            />

            <Pressable style={styles.scanClose} onPress={() => setScanning(false)}>
              <Text style={styles.scanCloseText}>داخستن</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {sheet === 'shift' && shift.state !== 'open' && (
        <OpenShiftSheet
          onClose={() => setSheet(null)}
          onOpened={() => {
            setSheet(null);
            shift.reload();
          }}
        />
      )}
      {sheet === 'shift' && shift.state === 'open' && (
        <CloseShiftSheet onClose={() => setSheet(null)} onClosed={shift.reload} />
      )}
      {sheet === 'cash' && <CashSheet onClose={() => setSheet(null)} onChanged={() => {}} />}
      {sheet === 'held' && (
        <HeldSheet held={held.held} onClose={() => setSheet(null)} onResume={resume} onDiscard={held.discard} />
      )}
      {sheet === 'recent' && <RecentSalesSheet onClose={() => setSheet(null)} />}
      {sheet === 'return' && (
        <ReturnSheet
          cartLines={cart.lines.map(line => ({ variationId: line.variation?.id ?? null, quantity: line.quantity }))}
          onClose={() => setSheet(null)}
          onExchanged={() => {
            cart.clear();
            setCashGiven('');
            syncNow({ pullCatalogue: true });
          }}
        />
      )}
      {sheet === 'quick' && (
        <QuickAddSheet onClose={() => setSheet(null)} onAdd={(name, price, quantity) => cart.addCustom(name, price, quantity)} />
      )}

      {/* Which colour and size. */}
      <Modal visible={picking !== null} transparent animationType="fade">
        <View style={styles.scanScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicking(null)} />

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
    </KeyboardAvoidingView>
  );
}

function CartPanel({
  cart,
  busy,
  cashGiven,
  onCash,
  method,
  onMethod,
  onSell,
  onHold,
  onClear,
  onScan,
}: {
  cart: ReturnType<typeof useCart>;
  busy: boolean;
  cashGiven: string;
  onCash: (next: string) => void;
  method: 'cash' | 'card';
  onMethod: (next: 'cash' | 'card') => void;
  onSell: (print: boolean) => void;
  onHold: () => void;
  onClear: () => void;
  onScan: () => void;
}) {
  const empty = cart.lines.length === 0;
  const received = Number(cashGiven || 0);
  const change = method === 'cash' ? Math.max(0, received - cart.totals.total) : 0;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Pressable style={styles.scanButton} onPress={onScan}>
          <NavIcon name="labels" size={15} color={colors.brand} />
          <Text style={styles.scanButtonText}>سکێن</Text>
        </Pressable>

        <Text style={styles.panelTitle}>سەبەتە · {cart.totals.itemCount}</Text>
      </View>

      {/* Who it is for: the panel's customer card, at the top of the basket. */}
      <View style={styles.customerCard}>
        <View style={styles.customerHead}>
          <Text style={styles.customerTitle}>زانیاری کڕیار</Text>
        </View>
        <CustomerBox customer={cart.customer} onChange={cart.setCustomer} />
      </View>

      {empty ? (
        <View style={styles.cartEmpty}>
          <NavIcon name="till" size={26} color={colors.textFaint} />
          <Text style={styles.cartEmptyTitle}>سەبەتە بەتاڵە</Text>
          <Text style={styles.cartEmptyBody}>بەرهەمێک هەڵبژێرە یان بارکۆدێک سکێن بکە.</Text>
        </View>
      ) : (
        <FlatList
          data={cart.lines}
          keyExtractor={line => line.key}
          contentContainerStyle={styles.lines}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          renderItem={({ item }) => <Line line={item} onChange={cart.setQuantity} onRemove={cart.remove} />}
        />
      )}

      <View style={styles.totals}>
        {/* Discount, and how it is paid: a card or cash. */}
        <View style={styles.modeRow}>
          <View style={styles.methodToggle}>
            {(['cash', 'card'] as const).map(option => (
              <Pressable
                key={option}
                style={[styles.methodBtn, method === option && styles.methodOn]}
                onPress={() => onMethod(option)}
              >
                <Text style={[styles.methodText, method === option && styles.methodTextOn]}>
                  {option === 'cash' ? 'نەقد' : 'کارت'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <DiscountBox discount={cart.discount} onChange={cart.setDiscount} />
          </View>
        </View>

        {method === 'cash' && (
          <TextInput
            style={styles.cashInput}
            value={cashGiven}
            onChangeText={onCash}
            keyboardType="number-pad"
            placeholder="پارەی وەرگیراو"
            placeholderTextColor={colors.textFaint}
          />
        )}

        {/* The figures, on the dark card the panel uses. */}
        <View style={styles.sumCard}>
          <View style={styles.sumLine}>
            <Text style={styles.sumLabel}>کۆی لاوەکی:</Text>
            <Text style={styles.sumValue}>{formatIQD(cart.totals.subtotal)}</Text>
          </View>
          {cart.totals.discount > 0 && (
            <View style={styles.sumLine}>
              <Text style={styles.sumLabel}>داشکاندن:</Text>
              <Text style={styles.sumValue}>{formatIQD(-cart.totals.discount)}</Text>
            </View>
          )}
          {change > 0 && (
            <View style={styles.sumLine}>
              <Text style={styles.sumLabel}>ماوە بۆ کڕیار:</Text>
              <Text style={[styles.sumValue, { color: '#6ee7b7' }]}>{formatIQD(change)}</Text>
            </View>
          )}
          <View style={styles.sumDivider} />
          <View style={styles.sumLine}>
            <Text style={styles.sumGrandLabel}>کۆی گشتی بۆ پارەدان:</Text>
            <Text style={styles.sumGrand}>{formatIQD(cart.totals.total)}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.clearBtn, empty && styles.payDisabled]} disabled={empty} onPress={onClear} accessibilityLabel="پاککردنەوەی سەبەتە">
            <Text style={styles.clearText}>✕</Text>
          </Pressable>

          <Pressable style={[styles.holdBtn, empty && styles.payDisabled]} disabled={empty || busy} onPress={onHold}>
            <Text style={styles.holdText}>هەڵپەسێردن</Text>
          </Pressable>

          <Pressable
            style={[styles.sellBtn, (empty || busy) && styles.payDisabled]}
            disabled={empty || busy}
            onPress={() => onSell(true)}
          >
            <Text style={styles.sellText}>{busy ? 'چاوەڕێ بکە…' : 'فرۆشتن و چاپکردن'}</Text>
          </Pressable>
        </View>

        <Pressable disabled={empty || busy} onPress={() => onSell(false)} style={styles.noPrint}>
          <Text style={[styles.noPrintText, (empty || busy) && { opacity: 0.4 }]}>فرۆشتن بێ چاپکردن</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Line({
  line,
  onChange,
  onRemove,
}: {
  line: CartLine;
  onChange: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
}) {
  const label = [line.variation?.color, line.variation?.size].filter(Boolean).join(' · ');

  return (
    <View style={styles.line}>
      {line.product.image_url ? (
        <Image source={{ uri: line.product.image_url }} style={styles.lineThumb} contentFit="cover" />
      ) : (
        <View style={[styles.lineThumb, styles.lineThumbEmpty]} />
      )}

      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={1}>
          {line.product.name_ku || line.product.name}
        </Text>

        <View style={styles.lineMeta}>
          {label !== '' && (
            <View style={styles.lineChip}>
              <Text style={styles.lineChipText}>{label}</Text>
            </View>
          )}
          <Text style={styles.lineUnit}>{formatIQD(line.unitPrice)}</Text>
        </View>
      </View>

      <View style={styles.stepper}>
        <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity - 1)}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.quantity}>{line.quantity}</Text>
        <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity + 1)}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.lineTotal}>{formatIQD(line.unitPrice * line.quantity)}</Text>

      <Pressable onPress={() => onRemove(line.key)} hitSlop={8} style={styles.remove}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

export function VariationPicker({
  product,
  options,
  onPick,
  onCancel,
}: {
  product: LocalProduct;
  options: LocalVariation[];
  onPick: (option: LocalVariation) => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.pickerCard}>
      <Text style={styles.pickerTitle}>{product.name_ku || product.name}</Text>
      <Text style={styles.pickerBody}>کام ڕەنگ و قەبارە؟</Text>

      <View style={styles.pickerOptions}>
        {options.map(option => {
          const out = option.stock_quantity <= 0;

          return (
            <Pressable
              key={option.id}
              style={[styles.pickerOption, out && styles.pickerOptionOut]}
              disabled={out}
              onPress={() => onPick(option)}
            >
              <Text style={[styles.pickerOptionText, out && styles.pickerOptionTextOut]}>
                {[option.color, option.size].filter(Boolean).join(' · ') || 'ئاسایی'}
              </Text>
              <Text style={styles.pickerStock}>{option.stock_quantity}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.pickerCancel} onPress={onCancel}>
        <Text style={styles.pickerCancelText}>پاشگەزبوونەوە</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  quickAdd: {
    height: 46,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
  },
  quickAddPlus: { color: '#a5b4fc', fontSize: 15 },
  quickAddText: { color: '#fff', ...typography.small },

  customerCard: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(248,250,252,0.9)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  customerHead: { flexDirection: 'row-reverse' },
  customerTitle: { ...typography.tiny, color: colors.text },

  modeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  methodToggle: {
    flexDirection: 'row-reverse',
    padding: 3,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(241,245,249,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodBtn: { paddingHorizontal: spacing.md, height: 34, justifyContent: 'center', borderRadius: radius.md },
  methodOn: { backgroundColor: colors.ink },
  methodText: { ...typography.tiny, color: colors.textMuted },
  methodTextOn: { color: '#fff' },

  sumCard: { gap: 4, padding: spacing.md, borderRadius: radius.lg, backgroundColor: '#0f172a' },
  sumLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { ...typography.tiny, color: '#94a3b8' },
  sumValue: { ...typography.small, color: '#fff' },
  sumDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 2 },
  sumGrandLabel: { ...typography.small, color: '#fff' },
  sumGrand: { fontSize: 22, fontFamily: fonts.bold, lineHeight: 32, color: '#34d399' },

  actionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  sellBtn: { flex: 2, minHeight: 48, borderRadius: radius.lg, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  sellText: { color: '#fff', ...typography.heading },
  holdBtn: { flex: 1.3, minHeight: 48, borderRadius: radius.lg, backgroundColor: '#fbbf24', alignItems: 'center', justifyContent: 'center' },
  holdText: { color: '#fff', ...typography.heading },
  clearBtn: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center' },
  clearText: { color: '#fff', fontSize: 16 },
  noPrint: { alignItems: 'center', paddingVertical: 2 },
  noPrintText: { ...typography.tiny, color: colors.textMuted },

  screen: { flex: 1 },
  body: { flex: 1, padding: spacing.md, gap: spacing.md },
  bodyWide: { flexDirection: 'row-reverse' },
  gridSide: { flex: 1, minWidth: 0 },
  panelSide: { width: 400 },

  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  panelHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: { ...typography.heading, color: colors.text },
  scanButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  scanButtonText: { ...typography.tiny, color: colors.brand },

  cartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  cartEmptyTitle: { ...typography.heading, color: colors.textMuted },
  cartEmptyBody: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },

  lines: { gap: spacing.xs, paddingBottom: spacing.sm },
  line: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  lineThumb: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.border },
  lineThumbEmpty: { backgroundColor: colors.border },
  lineInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  lineName: { ...typography.small, color: colors.text, textAlign: 'right' },
  lineMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs },
  lineChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  lineChipText: { fontSize: 9, fontFamily: fonts.semibold, color: colors.textMuted, lineHeight: 14 },
  lineUnit: { fontSize: 10, fontFamily: fonts.semibold, color: colors.textMuted, lineHeight: 15 },

  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    padding: 2,
  },
  step: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, lineHeight: 18 },
  quantity: { minWidth: 20, textAlign: 'center', ...typography.small, color: colors.text },
  lineTotal: { ...typography.small, color: colors.text, minWidth: 62, textAlign: 'left' },
  remove: { padding: 2 },
  removeText: { ...typography.tiny, color: colors.textFaint },

  totals: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { ...typography.heading, color: colors.textMuted },
  totalValue: { fontSize: 24, fontFamily: fonts.bold, color: colors.text, lineHeight: 34 },
  subLabel: { ...typography.small, color: colors.textMuted },
  subValue: { ...typography.small, color: colors.success },

  cashInput: {
    minHeight: TOUCH_TARGET - 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  changeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  changeLabel: { ...typography.small, color: colors.textMuted },
  changeValue: { ...typography.heading, color: colors.success },

  payRow: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.xs },
  pay: {
    flex: 1,
    minHeight: TOUCH_TARGET + 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payCash: { backgroundColor: colors.success },
  payCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  payDisabled: { opacity: 0.4 },
  payCashText: { color: '#fff', ...typography.title },
  payCardText: { color: colors.text, ...typography.title },

  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink,
  },
  barLeft: { flex: 1, alignItems: 'flex-end' },
  barTotal: { color: '#fff', ...typography.title },
  barHint: { color: 'rgba(255,255,255,0.6)', ...typography.tiny },
  barCount: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barCountText: { color: '#fff', ...typography.small },
  barScan: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheetScrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    height: '82%',
    backgroundColor: colors.background,
    borderTopStartRadius: radius.xl,
    borderTopEndRadius: radius.xl,
    padding: spacing.md,
    paddingTop: 0,
  },
  sheetGrab: { alignItems: 'center', paddingVertical: spacing.md },
  grab: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border },

  scanScrim: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scanCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  scanClose: { alignItems: 'center', paddingVertical: spacing.md },
  scanCloseText: { ...typography.small, color: colors.textMuted },

  pickerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.raised,
  },
  pickerTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  pickerBody: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  pickerOptions: { gap: spacing.xs, marginTop: spacing.xs },
  pickerOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionOut: { opacity: 0.45 },
  pickerOptionText: { ...typography.body, color: colors.text },
  pickerOptionTextOut: { textDecorationLine: 'line-through' },
  pickerStock: { ...typography.tiny, color: colors.textMuted },
  pickerCancel: { alignItems: 'center', paddingVertical: spacing.md },
  pickerCancelText: { ...typography.small, color: colors.textMuted },
});
