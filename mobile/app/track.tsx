import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../src/theme';
import { useLanguage } from '../src/i18n/LanguageProvider';
import { trackOrder } from '../src/api/endpoints';
import type { Order } from '../src/api/types';
import { formatPrice } from '../src/utils/money';
import { isValidPhone, normalizePhone } from '../src/utils/phone';
import { Field } from '../src/components/Field';
import { OrderStatusPill } from '../src/components/OrderStatusPill';
import { Button, Card, Divider, Row, T } from '../src/components/ui';

/**
 * Tracking an order without signing in.
 *
 * The order number alone is not enough — they are sequential, and anyone could
 * walk them. The server requires the phone number on the order to match, so
 * this screen asks for both.
 */
export default function TrackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();

  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onTrack = useCallback(async () => {
    setError(null);
    setOrder(null);

    if (!orderId.trim()) { setError(t('required')); return; }
    if (!isValidPhone(phone)) { setError(t('invalidPhone')); return; }

    setBusy(true);
    try {
      setOrder(await trackOrder(orderId.trim().replace(/^#/, ''), normalizePhone(phone) ?? phone));
    } catch {
      setError(t('notFound'));
    } finally {
      setBusy(false);
    }
  }, [orderId, phone, t]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Row gap={spacing.md}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <T size="lg" weight="black" color={colors.slate[700]}>{isRTL ? '→' : '←'}</T>
          </Pressable>
          <T size="xl" weight="black">{t('trackOrder')}</T>
        </Row>

        <T size="sm" weight="bold" color={colors.slate[500]}>{t('trackHint')}</T>

        <Field
          label={t('orderNumber')}
          value={orderId}
          onChangeText={setOrderId}
          keyboardType="number-pad"
          placeholder="1024"
        />
        <Field
          label={t('phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="0770 000 0000"
          error={error}
        />

        <Button full size="lg" title={t('trackOrder')} loading={busy} onPress={onTrack} />

        {order ? (
          <Card style={{ padding: spacing.lg, gap: spacing.md }}>
            <Row justify="space-between">
              <T size="base" weight="black">#{order.invoiceNo || order.id}</T>
              <OrderStatusPill status={order.status} />
            </Row>

            <T size="xs" weight="bold" color={colors.slate[500]}>
              {new Date(order.date).toLocaleDateString(language === 'en' ? 'en-GB' : 'ar-IQ')}
            </T>

            <Divider spacingY={spacing.xs} />

            {order.items.map(item => (
              <Row key={item.id} justify="space-between" gap={spacing.md}>
                <T size="sm" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                  {item.quantity} × {item.name}
                </T>
                <T size="sm" weight="black">
                  {formatPrice(item.unitPrice * item.quantity, language)}
                </T>
              </Row>
            ))}

            <Divider spacingY={spacing.xs} />

            <Row justify="space-between">
              <T size="base" weight="black">{t('total')}</T>
              <T size="lg" weight="black" color={colors.candy[700]}>
                {formatPrice(order.totalAmount, language)}
              </T>
            </Row>
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
