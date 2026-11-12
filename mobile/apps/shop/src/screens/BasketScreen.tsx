import { useState } from 'react';
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
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ApiError, formatIQD, isValidPhone, normalizePhone, orders } from '@galokids/core';
import { useAccount } from '@/state/useAccount';
import { useBasket, type BasketLine } from '@/state/useBasket';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The basket, and ordering from it.
 *
 * Checkout needs a signed-in customer, because the order has to belong to
 * somebody for them to be able to track it. The app asks here rather than at
 * the door: a shopper who was only looking should never have met a sign-up
 * wall.
 *
 * Totals shown are the app's arithmetic. The server prices every line from the
 * catalogue and works out delivery from the governorate itself, so what the
 * customer is charged is the server's figure — this one is to set expectations,
 * and the confirmation shows what was actually recorded.
 */
export default function BasketScreen() {
  const router = useRouter();
  const basket = useBasket();
  const { user } = useAccount();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);

  const placeOrder = async () => {
    if (basket.lines.length === 0 || placing) return;

    if (!isValidPhone(phone)) {
      Alert.alert('ژمارەی مۆبایل', 'تکایە ژمارەیەکی دروست بنووسە.');
      return;
    }

    if (!address.trim() || !governorate.trim()) {
      Alert.alert('ناونیشان', 'تکایە پارێزگا و ناونیشان بنووسە بۆ گەیاندن.');
      return;
    }

    setPlacing(true);

    try {
      const order = await orders.create({
        items: basket.lines.map(line => ({
          product_id: line.productId,
          product_variation_id: line.variationId,
          quantity: line.quantity,
        })),
        channel: 'online',
        customer_name: name.trim() || user?.name,
        customer_phone: normalizePhone(phone) ?? undefined,
        governorate: governorate.trim(),
        shipping_address: address.trim(),
      });

      basket.clear();

      Alert.alert(
        'داواکارییەکەت تۆمارکرا',
        `ژمارەی داواکاری: ${order.invoice_no ?? order.id}\nکۆی گشتی: ${formatIQD(order.total_amount)}`,
        [{ text: 'باشە', onPress: () => router.replace('/') }]
      );
    } catch (error) {
      // No idempotency key here on purpose: a shopper's order is placed by a
      // person who sees the result and can decide for themselves whether to
      // try again. The key exists for the till, which retries unattended.
      Alert.alert(
        'نەتوانرا تۆمار بکرێت',
        error instanceof ApiError && error.isOffline
          ? 'هیچ پەیوەندییەک نییە. تکایە دوای چەند چرکەیەک هەوڵ بدەرەوە.'
          : (error as Error).message
      );
    } finally {
      setPlacing(false);
    }
  };

  if (basket.lines.length === 0) {
    return (
      <View style={styles.centre}>
        <Text style={styles.emptyMark}>🧺</Text>
        <Text style={styles.emptyTitle}>سەبەتەکەت بەتاڵە</Text>
        <Pressable style={styles.browse} onPress={() => router.replace('/')}>
          <Text style={styles.browseText}>بڕۆ بۆ فرۆشگا</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={basket.lines}
        keyExtractor={line => line.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Line line={item} onChange={basket.setQuantity} onRemove={basket.remove} />
        )}
        ListFooterComponent={
          <View style={styles.form}>
            <Text style={styles.formTitle}>زانیاری گەیاندن</Text>

            <TextInput style={styles.input} placeholder="ناوی تەواو" placeholderTextColor={colors.textFaint}
              value={name} onChangeText={setName} textAlign="right" />
            <TextInput style={styles.input} placeholder="ژمارەی مۆبایل" placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad" value={phone} onChangeText={setPhone} textAlign="right" />
            <TextInput style={styles.input} placeholder="پارێزگا" placeholderTextColor={colors.textFaint}
              value={governorate} onChangeText={setGovernorate} textAlign="right" />
            <TextInput style={[styles.input, styles.address]} placeholder="ناونیشانی ورد"
              placeholderTextColor={colors.textFaint} multiline value={address}
              onChangeText={setAddress} textAlign="right" />
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>کۆی بەرهەمەکان</Text>
          <Text style={styles.totalValue}>{formatIQD(basket.subtotal)}</Text>
        </View>

        <Text style={styles.note}>کرێی گەیاندن لەسەر پارێزگاکە دیاری دەکرێت.</Text>

        <Pressable style={[styles.place, placing && styles.placeDisabled]} onPress={placeOrder} disabled={placing}>
          <Text style={styles.placeText}>{placing ? 'دەنێردرێت…' : 'جێبەجێکردنی داواکاری'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Line({
  line,
  onChange,
  onRemove,
}: {
  line: BasketLine;
  onChange: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <View style={styles.line}>
      {line.imageUrl ? (
        <Image source={{ uri: line.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}

      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={2}>{line.name}</Text>
        {line.variationLabel && <Text style={styles.lineVariation}>{line.variationLabel}</Text>}
        <Text style={styles.linePrice}>{formatIQD(line.unitPrice * line.quantity)}</Text>

        <View style={styles.stepper}>
          <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity - 1)}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.quantity}>{line.quantity}</Text>
          <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity + 1)}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>

          <Pressable style={styles.remove} onPress={() => onRemove(line.key)} hitSlop={8}>
            <Text style={styles.removeText}>سڕینەوە</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  emptyMark: { fontSize: 48 },
  emptyTitle: { ...typography.title, color: colors.text },
  browse: {
    minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: spacing.xl,
    borderRadius: radius.pill, backgroundColor: colors.brand,
  },
  browseText: { color: '#fff', ...typography.heading },

  line: {
    flexDirection: 'row-reverse', gap: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  thumb: { width: 72, height: 88, borderRadius: radius.sm, backgroundColor: colors.brandSoft },
  thumbPlaceholder: { backgroundColor: colors.brandSoft },
  lineInfo: { flex: 1, alignItems: 'flex-end', gap: spacing.xs },
  lineName: { ...typography.body, color: colors.text, textAlign: 'right' },
  lineVariation: { ...typography.tiny, color: colors.textMuted },
  linePrice: { ...typography.heading, color: colors.brand },

  stepper: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  step: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepText: { ...typography.title, color: colors.brand },
  quantity: { minWidth: 24, textAlign: 'center', ...typography.heading, color: colors.text },
  remove: { paddingHorizontal: spacing.sm },
  removeText: { ...typography.tiny, color: colors.danger },

  form: { gap: spacing.sm, marginTop: spacing.lg },
  formTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md, ...typography.body, color: colors.text,
  },
  address: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },

  footer: {
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface, gap: spacing.sm,
  },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { ...typography.heading, color: colors.textMuted },
  totalValue: { ...typography.display, color: colors.text },
  note: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  place: {
    minHeight: TOUCH_TARGET + 6, borderRadius: radius.md, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  placeDisabled: { opacity: 0.5 },
  placeText: { color: '#fff', ...typography.title },
});
