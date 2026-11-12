import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatIQD } from '@galokids/core';
import { enqueueSale, variationsFor, type LocalProduct, type LocalVariation } from '@/offline';
import { useCart, type CartLine } from '@/state/useCart';
import { useSync } from '@/state/useSync';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The counter.
 *
 * Taking the money is the one thing that must never depend on the network. The
 * sale is written to the device, the receipt number comes from the device, and
 * the drawer opens — then, separately and later, the sale is sent. A cashier
 * should not be able to tell from this screen whether the shop has a
 * connection, except by reading the strip at the top because they chose to.
 */
export default function TillScreen() {
  const cart = useCart();
  const { syncNow } = useSync();

  const [busy, setBusy] = useState(false);
  const [cashGiven, setCashGiven] = useState('');
  const [picking, setPicking] = useState<{ product: LocalProduct; options: LocalVariation[] } | null>(null);

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

      // Several colours or sizes behind one code: the cashier says which,
      // because guessing puts the shop's stock wrong where nobody sees it.
      const options = await variationsFor(result.product!.id);
      setPicking({ product: result.product!, options });
    },
    [cart]
  );

  const takePayment = useCallback(
    async (method: 'cash' | 'card') => {
      if (cart.lines.length === 0 || busy) return;

      setBusy(true);

      try {
        const paid = method === 'cash' ? Number(cashGiven || cart.totals.total) : cart.totals.total;

        const row = await enqueueSale(
          {
            items: cart.lines.map(line => ({
              product_id: line.product.id,
              product_variation_id: line.variation?.id ?? null,
              quantity: line.quantity,
            })),
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

        cart.clear();
        setCashGiven('');

        // Sent in the background. The sale is already safe on the device, so
        // nothing here waits for it and nothing here fails if it cannot go.
        syncNow({ pullCatalogue: false });

        Alert.alert(
          'فرۆشتن تۆمارکرا',
          `پسووڵە ${row.invoice_no}\nکۆی گشتی ${formatIQD(cart.totals.total)}` +
            (change > 0 ? `\nگەڕاوە ${formatIQD(change)}` : '')
        );
      } catch (error) {
        Alert.alert('نەتوانرا تۆمار بکرێت', (error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [busy, cart, cashGiven, syncNow]
  );

  return (
    // The sync strip belongs to the shell, which draws it above every screen.
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.scannerWrap}>
        <BarcodeScanner onScan={handleScan} paused={busy || picking !== null} />
      </View>

      <FlatList
        data={cart.lines}
        keyExtractor={line => line.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>سەبەتە بەتاڵە</Text>
            <Text style={styles.emptyBody}>بارکۆدی بەرهەمێک سکێن بکە بۆ دەستپێکردن.</Text>
          </View>
        }
        renderItem={({ item }) => <Line line={item} onChange={cart.setQuantity} onRemove={cart.remove} />}
      />

      {picking && (
        <VariationPicker
          product={picking.product}
          options={picking.options}
          onPick={variation => {
            cart.add(picking.product, variation);
            setPicking(null);
          }}
          onCancel={() => setPicking(null)}
        />
      )}

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>کۆی گشتی</Text>
          <Text style={styles.totalValue}>{formatIQD(cart.totals.total)}</Text>
        </View>

        {cart.totals.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.subLabel}>داشکاندن</Text>
            <Text style={styles.subValue}>−{formatIQD(cart.totals.discount)}</Text>
          </View>
        )}

        <TextInput
          style={styles.cashInput}
          placeholder="پارەی وەرگیراو (نەقد)"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          value={cashGiven}
          onChangeText={setCashGiven}
          textAlign="right"
        />

        <View style={styles.payRow}>
          <Pressable
            style={[styles.pay, styles.payCard, cart.lines.length === 0 && styles.payDisabled]}
            disabled={cart.lines.length === 0 || busy}
            onPress={() => takePayment('card')}
          >
            <Text style={styles.payCardText}>کارت</Text>
          </Pressable>

          <Pressable
            style={[styles.pay, styles.payCash, cart.lines.length === 0 && styles.payDisabled]}
            disabled={cart.lines.length === 0 || busy}
            onPress={() => takePayment('cash')}
          >
            <Text style={styles.payCashText}>{busy ? 'چاوەڕێ بکە…' : 'نەقد'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Line({
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
      <Pressable onPress={() => onRemove(line.key)} hitSlop={8} style={styles.remove}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>

      <View style={styles.stepper}>
        <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity - 1)}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.quantity}>{line.quantity}</Text>
        <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity + 1)}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={1}>
          {line.product.name_ku || line.product.name}
        </Text>
        {label !== '' && <Text style={styles.lineVariation}>{label}</Text>}
        <Text style={styles.linePrice}>{formatIQD(line.unitPrice * line.quantity)}</Text>
      </View>
    </View>
  );
}

function VariationPicker({
  product,
  options,
  onPick,
  onCancel,
}: {
  product: LocalProduct;
  options: LocalVariation[];
  onPick: (variation: LocalVariation) => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.sheetTitle}>{product.name_ku || product.name}</Text>
      <Text style={styles.sheetBody}>کام ڕەنگ و قەبارە؟</Text>

      <View style={styles.sheetOptions}>
        {options.map(option => (
          <Pressable key={option.id} style={styles.option} onPress={() => onPick(option)}>
            <Text style={styles.optionText}>
              {[option.color, option.size].filter(Boolean).join(' · ') || 'ئاسایی'}
            </Text>
            <Text style={styles.optionStock}>{option.stock_quantity} دانە</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.sheetCancel} onPress={onCancel}>
        <Text style={styles.sheetCancelText}>پاشگەزبوونەوە</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scannerWrap: { padding: spacing.lg, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.xs },
  emptyTitle: { ...typography.heading, color: colors.text },
  emptyBody: { ...typography.small, color: colors.textMuted },

  line: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  lineInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  lineName: { ...typography.body, color: colors.text, textAlign: 'right' },
  lineVariation: { ...typography.tiny, color: colors.textMuted },
  linePrice: { ...typography.heading, color: colors.brand, ...typography.mono },

  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  step: {
    width: TOUCH_TARGET - 8,
    height: TOUCH_TARGET - 8,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { ...typography.title, color: colors.brand },
  quantity: { minWidth: 28, textAlign: 'center', ...typography.heading, color: colors.text },

  remove: { padding: spacing.xs },
  removeText: { ...typography.heading, color: colors.textFaint },

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { ...typography.heading, color: colors.textMuted },
  totalValue: { ...typography.display, color: colors.text, ...typography.mono },
  subLabel: { ...typography.small, color: colors.textMuted },
  subValue: { ...typography.small, color: colors.danger, ...typography.mono },

  cashInput: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },

  payRow: { flexDirection: 'row-reverse', gap: spacing.sm },
  pay: {
    flex: 1,
    minHeight: TOUCH_TARGET + 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payCash: { backgroundColor: colors.success },
  payCashText: { color: '#fff', ...typography.title },
  payCard: { backgroundColor: colors.brandSoft },
  payCardText: { color: colors.brand, ...typography.title },
  payDisabled: { opacity: 0.4 },

  sheet: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  sheetBody: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  sheetOptions: { gap: spacing.sm, marginTop: spacing.sm },
  option: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  optionText: { ...typography.heading, color: colors.brand },
  optionStock: { ...typography.small, color: colors.textMuted },
  sheetCancel: { minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  sheetCancelText: { ...typography.body, color: colors.textMuted },
});
