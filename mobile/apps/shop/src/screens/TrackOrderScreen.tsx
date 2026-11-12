import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  formatDateTime,
  formatIQD,
  isValidPhone,
  normalizePhone,
  orders,
  type TrackedOrder,
} from '@galokids/core';
import { OrderProgress, Page, StatusPill } from '@/components/ui';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Following an order without an account.
 *
 * This shop takes orders over Instagram and WhatsApp, typed into the till by
 * staff. Those customers never signed in, so "sign in to see your orders"
 * would shut out exactly the people most likely to be asking where their
 * parcel is.
 *
 * Both the order number and the phone number on it are required, and the
 * server checks the pair. It answers the same "no matching order" either way,
 * which is deliberate: told which half was wrong, somebody could walk the
 * order numbers and learn which ones exist.
 */
export default function TrackOrderScreen() {
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [found, setFound] = useState<TrackedOrder | null>(null);

  const look = async () => {
    if (busy) return;

    // The shop's own invoice numbers can carry a prefix, and a customer
    // reading one off a receipt types what they see.
    const id = number.replace(/\D/g, '');

    if (!id) {
      setProblem('ژمارەی داواکاری بنووسە.');
      return;
    }

    if (!isValidPhone(phone)) {
      setProblem('ژمارەی مۆبایلەکە دروست نییە.');
      return;
    }

    setBusy(true);
    setProblem(null);
    setFound(null);

    try {
      // Canonical form, because the server compares digits: a customer typing
      // 0750… would otherwise be told their own order does not exist.
      setFound(await orders.track(id, normalizePhone(phone)!));
    } catch (error) {
      setProblem(
        error instanceof ApiError && error.isOffline
          ? 'هیچ پەیوەندییەک نییە. ئینتەرنێتەکەت بپشکنە.'
          : error instanceof ApiError && error.status === 404
            ? 'هیچ داواکارییەک بەم ژمارە و مۆبایلەوە نەدۆزرایەوە.'
            : (error as Error).message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="شوێنکەوتنی داواکاری" subtitle="بەبێ چوونەژوورەوە">
      <View style={styles.form}>
        <Text style={styles.lead}>
          ژمارەی داواکاری و ئەو ژمارە مۆبایلەی لەگەڵ داواکارییەکەدا نووسراوە بنووسە.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="ژمارەی داواکاری"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          value={number}
          onChangeText={text => {
            setNumber(text);
            setProblem(null);
          }}
          textAlign="right"
        />

        <TextInput
          style={styles.input}
          placeholder="ژمارەی مۆبایل"
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={text => {
            setPhone(text);
            setProblem(null);
          }}
          onSubmitEditing={look}
          textAlign="right"
        />

        {problem && <Text style={styles.problem}>{problem}</Text>}

        <Pressable style={[styles.go, busy && styles.goBusy]} onPress={look} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.goText}>گەڕان</Text>}
        </Pressable>
      </View>

      {found && (
        <>
          <View style={styles.statusCard}>
            <View style={styles.statusTop}>
              <Text style={styles.statusHeading}>#{found.id}</Text>
              <StatusPill status={found.status} />
            </View>

            <Text style={styles.when}>{formatDateTime(found.created_at)}</Text>

            <OrderProgress status={found.status} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>بەرهەمەکان</Text>

            {found.items.map((item, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name ?? 'بەرهەم'}
                </Text>
                <Text style={styles.itemFigure}>
                  {item.quantity} × {formatIQD(item.price)}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>کۆی گشتی</Text>
              <Text style={styles.totalValue}>{formatIQD(found.total_amount)}</Text>
            </View>

            {found.shipping_address && (
              <Text style={styles.address}>{found.shipping_address}</Text>
            )}
          </View>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  lead: { ...typography.small, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
  input: {
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.text,
  },
  problem: { ...typography.small, color: colors.danger, textAlign: 'right' },
  go: {
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBusy: { opacity: 0.7 },
  goText: { color: '#fff', ...typography.title },

  statusCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  statusTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHeading: { ...typography.title, color: colors.text },
  when: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },

  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemName: { flex: 1, ...typography.small, color: colors.text, textAlign: 'right' },
  itemFigure: { ...typography.small, color: colors.textMuted },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: { ...typography.heading, color: colors.textMuted },
  totalValue: { ...typography.title, color: colors.brand },
  address: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
});
