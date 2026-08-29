import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { fetchOrder } from '../../src/api/endpoints';
import type { Order } from '../../src/api/types';
import { formatPrice } from '../../src/utils/money';
import { OrderStatusPill } from '../../src/components/OrderStatusPill';
import { Button, Card, Divider, EmptyState, Loading, Row, T } from '../../src/components/ui';

/**
 * One order, and — when it has just been placed — the confirmation.
 *
 * The `placed` flag is what checkout redirects with, so the success message
 * and the receipt are the same screen. Backing out of it goes to the order
 * list rather than back into a checkout for a basket that no longer exists.
 */
export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const justPlaced = placed === '1';

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    fetchOrder(id, controller.signal)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  if (loading) return <Loading label={t('loading')} />;

  if (!order) {
    return (
      <EmptyState
        emoji="📦"
        title={t('notFound')}
        action={<Button title={t('back')} variant="secondary" onPress={() => router.replace('/orders' as never)} />}
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing['3xl'], gap: spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <Row gap={spacing.md}>
        <Pressable
          onPress={() => (justPlaced ? router.replace('/orders' as never) : router.back())}
          hitSlop={10}
        >
          <T size="lg" weight="black" color={colors.slate[700]}>
            {isRTL ? '→' : '←'}
          </T>
        </Pressable>
        <T size="xl" weight="black">
          {justPlaced ? t('orderPlaced') : t('orderDetails')}
        </T>
      </Row>

      {justPlaced ? (
        <Card
          style={{
            padding: spacing.xl,
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.mint[50],
            borderColor: colors.mint[100],
          }}
        >
          <T size="3xl">🎉</T>
          <T size="base" weight="black" center color={colors.mint[700]}>
            {t('orderPlaced')}
          </T>
          <T size="sm" weight="bold" center color={colors.slate[600]}>
            {t('orderPlacedHint')}
          </T>
        </Card>
      ) : null}

      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <Row justify="space-between">
          <View>
            <T size="xs" weight="bold" color={colors.slate[500]}>
              {t('orderNumber')}
            </T>
            <T size="base" weight="black">
              #{order.invoiceNo || order.id}
            </T>
          </View>
          <OrderStatusPill status={order.status} />
        </Row>

        <T size="xs" weight="bold" color={colors.slate[500]}>
          {new Date(order.date).toLocaleString(language === 'en' ? 'en-GB' : 'ar-IQ')}
        </T>
      </Card>

      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <T size="sm" weight="black">
          {t('orderDetails')}
        </T>

        {order.items.map(item => (
          <View key={item.id}>
            <Row justify="space-between" align="flex-start" gap={spacing.md}>
              <View style={{ flex: 1 }}>
                <T size="sm" weight="bold" numberOfLines={2}>
                  {item.name}
                </T>
                <Row gap={spacing.sm}>
                  <T size="xs" weight="bold" color={colors.slate[500]}>
                    {item.quantity} × {formatPrice(item.unitPrice, language)}
                  </T>
                  {item.returnedQuantity && item.returnedQuantity > 0 ? (
                    <T size="xs" weight="black" color={colors.rose[600]}>
                      ({t('statusReturned')} {item.returnedQuantity})
                    </T>
                  ) : null}
                </Row>
              </View>

              <T size="sm" weight="black">
                {formatPrice(item.unitPrice * item.quantity, language)}
              </T>
            </Row>
            <Divider spacingY={spacing.sm} />
          </View>
        ))}

        <Row justify="space-between">
          <T size="sm" weight="bold" color={colors.slate[600]}>
            {t('subtotal')}
          </T>
          <T size="sm" weight="black">
            {formatPrice(order.subtotal, language)}
          </T>
        </Row>

        {order.discountAmount > 0 ? (
          <Row justify="space-between">
            <T size="sm" weight="bold" color={colors.slate[600]}>
              {t('discount')}
            </T>
            <T size="sm" weight="black" color={colors.mint[700]}>
              − {formatPrice(order.discountAmount, language)}
            </T>
          </Row>
        ) : null}

        <Row justify="space-between">
          <T size="sm" weight="bold" color={colors.slate[600]}>
            {t('delivery')}
          </T>
          <T size="sm" weight="black">
            {order.deliveryFee > 0 ? formatPrice(order.deliveryFee, language) : t('freeDelivery')}
          </T>
        </Row>

        <Divider spacingY={spacing.xs} />

        <Row justify="space-between">
          <T size="base" weight="black">
            {t('total')}
          </T>
          <T size="lg" weight="black" color={colors.candy[700]}>
            {formatPrice(order.totalAmount, language)}
          </T>
        </Row>
      </Card>

      {order.shippingAddress ? (
        <Card style={{ padding: spacing.lg, gap: 6 }}>
          <T size="xs" weight="black" color={colors.slate[500]}>
            {t('addressDetail')}
          </T>
          <T size="sm" weight="bold" color={colors.slate[700]}>
            {order.shippingAddress}
          </T>
        </Card>
      ) : null}

      <View
        style={{
          backgroundColor: colors.bubble[50],
          borderColor: colors.bubble[200],
          borderWidth: 1,
          borderRadius: radius.xl,
          padding: spacing.lg,
        }}
      >
        <Row gap={spacing.md}>
          <T size="base">💵</T>
          <T size="sm" weight="black" color={colors.slate[700]}>
            {t('cashOnDelivery')}
          </T>
        </Row>
      </View>

      {justPlaced ? (
        <Button full title={t('continueShopping')} onPress={() => router.replace('/' as never)} />
      ) : null}
    </ScrollView>
  );
}
