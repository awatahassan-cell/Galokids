import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  displayPhone,
  formatDateTime,
  formatIQD,
  orders,
  type Order,
} from '@galokids/core';
import { Eyebrow, Loading, OrderProgress, Page, Problem, StatusPill } from '@/components/ui';
import { colors, radius, shadow, spacing, typography } from '@/theme';

/**
 * One order, and where it has got to.
 *
 * For a signed-in customer, so it reads the full order rather than the public
 * tracking endpoint — the server already limits a customer to their own orders
 * and this way the screen can show the delivery fee and the discount, which
 * the tracking endpoint deliberately withholds from anyone with an order
 * number.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    const orderId = Number(id);

    if (!Number.isFinite(orderId)) {
      setError(new Error('ژمارەی داواکاری دروست نییە.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setOrder(await orders.get(orderId));
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Page title="داواکاری" scroll={false}>
        <Loading />
      </Page>
    );
  }

  if (error || !order) {
    return (
      <Page title="داواکاری" scroll={false}>
        <Problem error={error} onRetry={load} />
      </Page>
    );
  }

  const itemsTotal = (order.items ?? []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <Page title={`#${order.invoice_no ?? order.id}`} subtitle={formatDateTime(order.created_at)}>
      <View style={styles.statusCard}>
        <View style={styles.statusTop}>
          <Text style={styles.statusHeading}>دۆخی داواکاری</Text>
          <StatusPill status={order.status} />
        </View>

        <OrderProgress status={order.status} />
      </View>

      <Section title="بەرهەمەکان">
        {(order.items ?? []).map(item => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product_name ?? 'بەرهەم'}
              </Text>
              {item.variation_label && (
                <Text style={styles.itemVariant}>{item.variation_label}</Text>
              )}
              <Text style={styles.itemUnit}>
                {item.quantity} × {formatIQD(item.price)}
              </Text>
            </View>

            <Text style={styles.itemTotal}>{formatIQD(item.price * item.quantity)}</Text>
          </View>
        ))}
      </Section>

      <Section title="کۆی پارە">
        <Line label="بەرهەمەکان" value={formatIQD(order.subtotal || itemsTotal)} />
        {order.discount_amount > 0 && (
          <Line label="داشکاندن" value={`− ${formatIQD(order.discount_amount)}`} />
        )}
        <Line label="کرێی گەیاندن" value={formatIQD(order.shipping_fee)} />
        <Line label="کۆی گشتی" value={formatIQD(order.total_amount)} strong />
      </Section>

      {(order.shipping_address || order.governorate || order.customer_phone) && (
        <Section title="گەیاندن">
          {order.customer_name && <Line label="ناو" value={order.customer_name} />}
          {order.customer_phone && (
            <Line label="مۆبایل" value={displayPhone(order.customer_phone)} />
          )}
          {order.governorate && <Line label="پارێزگا" value={order.governorate} />}
          {order.shipping_address && (
            <Line label="ناونیشان" value={order.shipping_address} />
          )}
        </Section>
      )}

      <Pressable style={styles.again} onPress={() => router.replace('/')}>
        <Text style={styles.againText}>بەردەوامبوون بە خۆپیشاندان</Text>
      </Pressable>
    </Page>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow>{title}</Eyebrow>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrongLabel]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrongValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
    ...shadow.card,
  },
  statusTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusHeading: { ...typography.heading, color: colors.text },

  section: { gap: spacing.sm, alignItems: 'flex-end' },
  sectionBody: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },

  item: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  itemName: { ...typography.body, color: colors.text, textAlign: 'right' },
  itemVariant: { ...typography.tiny, color: colors.textMuted },
  itemUnit: { ...typography.tiny, color: colors.textFaint },
  itemTotal: { ...typography.price, color: colors.text },

  line: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lineLabel: { ...typography.small, color: colors.textMuted },
  lineValue: { ...typography.small, color: colors.text, flexShrink: 1, textAlign: 'left' },
  lineStrongLabel: { ...typography.heading, color: colors.text },
  lineStrongValue: { ...typography.title, color: colors.brandText },

  again: { alignItems: 'center', paddingVertical: spacing.md },
  againText: { ...typography.small, color: colors.brandText },
});
