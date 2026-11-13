import { useEffect, useState } from 'react';
import {
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
import { Alert, ApiError, formatIQD, isValidPhone, normalizePhone, orders } from '@galokids/core';
import { Empty, Eyebrow, MediaWash, PageWash, PrimaryButton, TabBar } from '@/components/ui';
import { useAccount } from '@/state/useAccount';
import { useBasket, type BasketLine } from '@/state/useBasket';
import {
  colors,
  fonts,
  mediaWash,
  radius,
  shadow,
  spacing,
  TOUCH_TARGET,
  typography,
} from '@/theme';

/**
 * The basket, and ordering from it.
 *
 * Checkout needs a signed-in customer, because the orders endpoint is behind
 * authentication and because the order has to belong to somebody for them to
 * be able to track it. The app asks here rather than at the door: a shopper
 * who was only looking should never have met a sign-up wall.
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

  // Fill in what the account already knows, so a returning shopper types an
  // address and nothing else.
  useEffect(() => {
    if (!user) return;

    setName(previous => previous || user.name || '');
    setPhone(previous => previous || (user.phone ?? ''));
  }, [user]);

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

      // Straight to the order rather than back to the shop: the first thing
      // anybody wants after ordering is to see that it exists, and this is
      // also the screen they will come back to for its status.
      router.replace(`/orders/${order.id}`);

      Alert.alert(
        'داواکارییەکەت تۆمارکرا',
        `ژمارەی داواکاری: ${order.invoice_no ?? order.id}\nکۆی گشتی: ${formatIQD(order.total_amount)}`
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
      <View style={styles.screen}>
        <PageWash />
        <Empty
          mark="🧺"
          title="سەبەتەکەت بەتاڵە"
          body="بەرهەمێک هەڵبژێرە بۆ ئەوەی لێرە دەربکەوێت."
          action={{ label: 'بڕۆ بۆ فرۆشگا', onPress: () => router.replace('/') }}
        />
        <TabBar />
      </View>
    );
  }

  // Ordering needs a session: the orders endpoint is behind authentication, so
  // without one the server would answer 401 and the shopper would see a
  // meaningless failure after filling in their whole address.
  if (!user) {
    return (
      <View style={styles.screen}>
        <PageWash />

        <View style={styles.gate}>
          <View style={styles.gateMarkRing}>
            <Text style={styles.gateMark}>🔑</Text>
          </View>

          <Text style={styles.gateTitle}>بۆ تەواوکردنی داواکاری بچۆ ژوورەوە</Text>
          <Text style={styles.gateBody}>
            کۆدێک بۆ ژمارەی مۆبایلەکەت دەنێرین. سەبەتەکەت وەک خۆی دەمێنێتەوە.
          </Text>

          <View style={styles.gateSummary}>
            <Text style={styles.gateSummaryLabel}>{basket.itemCount} بەرهەم لە سەبەتەدا</Text>
            <Text style={styles.gateSummaryValue}>{formatIQD(basket.subtotal)}</Text>
          </View>

          <View style={styles.gateAction}>
            <PrimaryButton
              label="چوونەژوورەوە بە کۆد"
              // The object form, not '/sign-in?next=/basket': a query string in
              // a pushed path does not reliably reach `useLocalSearchParams`,
              // and when it goes missing the shopper is dropped on their
              // account page instead of back at the checkout.
              onPress={() => router.push({ pathname: '/sign-in', params: { next: '/basket' } })}
            />
          </View>

          <Pressable style={styles.keepLooking} onPress={() => router.replace('/')}>
            <Text style={styles.keepLookingText}>بەردەوامبوون بە گەڕان</Text>
          </Pressable>
        </View>

        <TabBar />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PageWash />

      <View style={styles.head}>
        <Text style={styles.headTitle}>سەبەتەکەم</Text>
        <Text style={styles.headLine}>{basket.itemCount} بەرهەم</Text>
      </View>

      <FlatList
        data={basket.lines}
        keyExtractor={line => line.key}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Line line={item} onChange={basket.setQuantity} onRemove={basket.remove} />
        )}
        ListFooterComponent={
          <View style={styles.form}>
            <Eyebrow>زانیاری گەیاندن</Eyebrow>

            <Field placeholder="ناوی تەواو" value={name} onChange={setName} />
            <Field
              placeholder="ژمارەی مۆبایل"
              value={phone}
              onChange={setPhone}
              keyboard="phone-pad"
            />
            <Field placeholder="پارێزگا" value={governorate} onChange={setGovernorate} />
            <Field
              placeholder="ناونیشانی ورد"
              value={address}
              onChange={setAddress}
              multiline
            />
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>کۆی بەرهەمەکان</Text>
          <Text style={styles.totalValue}>{formatIQD(basket.subtotal)}</Text>
        </View>

        <Text style={styles.note}>کرێی گەیاندن لەسەر پارێزگاکە دیاری دەکرێت.</Text>

        <PrimaryButton
          label={placing ? 'دەنێردرێت…' : 'جێبەجێکردنی داواکاری'}
          onPress={placeOrder}
          busy={placing}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  placeholder,
  value,
  onChange,
  keyboard,
  multiline,
}: {
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  keyboard?: 'phone-pad';
  multiline?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputTall]}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboard}
      multiline={multiline}
      textAlign="right"
    />
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
      <MediaWash wash={mediaWash(line.productId)} style={styles.thumb}>
        {line.imageUrl ? (
          <Image source={{ uri: line.imageUrl }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <Text style={styles.thumbMark}>👕</Text>
        )}
      </MediaWash>

      <View style={styles.lineInfo}>
        <Text style={styles.lineName} numberOfLines={2}>
          {line.name}
        </Text>
        {line.variationLabel ? (
          <Text style={styles.lineVariation}>{line.variationLabel}</Text>
        ) : null}
        <Text style={styles.linePrice}>{formatIQD(line.unitPrice * line.quantity)}</Text>

        <View style={styles.stepperRow}>
          <View style={styles.stepper}>
            <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity - 1)}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.quantity}>{line.quantity}</Text>
            <Pressable style={styles.step} onPress={() => onChange(line.key, line.quantity + 1)}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>

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

  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, alignItems: 'flex-end' },
  headTitle: { ...typography.display, color: colors.text },
  headLine: { ...typography.tiny, color: colors.textMuted },

  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  line: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  thumb: { width: 76, height: 92, borderRadius: radius.md },
  thumbImage: { width: '100%', height: '100%' },
  thumbMark: { fontSize: 26 },
  lineInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  lineName: { ...typography.body, color: colors.text, textAlign: 'right' },
  lineVariation: { ...typography.tiny, color: colors.textMuted },
  linePrice: { ...typography.price, color: colors.brandText, marginTop: 2 },

  stepperRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brandLine,
    padding: 2,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 17, fontFamily: fonts.bold, color: colors.brandText, lineHeight: 22 },
  quantity: { minWidth: 22, textAlign: 'center', ...typography.heading, color: colors.text },
  remove: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  removeText: { ...typography.tiny, color: colors.danger },

  form: { gap: spacing.sm, marginTop: spacing.lg, alignItems: 'flex-end' },
  input: {
    alignSelf: 'stretch',
    minHeight: TOUCH_TARGET + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.text,
  },
  inputTall: { minHeight: 92, paddingTop: spacing.md, textAlignVertical: 'top' },

  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { ...typography.heading, color: colors.textMuted },
  totalValue: { fontSize: 24, fontFamily: fonts.bold, color: colors.text, lineHeight: 34 },
  note: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },

  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  gateMarkRing: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  gateMark: { fontSize: 36, lineHeight: 44 },
  gateTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  gateBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.md,
  },
  gateSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  gateSummaryLabel: { ...typography.small, color: colors.textMuted },
  gateSummaryValue: { ...typography.price, color: colors.brandText },
  gateAction: { alignSelf: 'stretch', maxWidth: 300, marginTop: spacing.lg },
  keepLooking: { paddingVertical: spacing.md },
  keepLookingText: { ...typography.small, color: colors.textMuted },
});
