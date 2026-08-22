import React, { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useCart } from '../../src/store/CartProvider';
import { useShop } from '../../src/store/ShopProvider';
import { formatPrice, lineTotal } from '../../src/utils/money';
import { variationLabel } from '../../src/utils/variations';
import { Button, EmptyState, Row, T } from '../../src/components/ui';

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { lines, subtotal, setQuantity, remove } = useCart();
  const { settings } = useShop();

  const freeOver = Number(settings.shippingFreeOver ?? 0);

  const goCheckout = useCallback(() => router.push('/checkout' as never), [router]);

  if (lines.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <EmptyState
          emoji="🛒"
          title={t('cartEmpty')}
          hint={t('cartEmptyHint')}
          action={<Button title={t('startShopping')} onPress={() => router.push('/shop' as never)} />}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.md }}>
      <T size="xl" weight="black" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        {t('cart')}
      </T>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 200, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {lines.map(line => {
          const name =
            (language === 'ku' && line.product.nameKu) ||
            (language === 'ar' && line.product.nameAr) ||
            line.product.name;
          const detail = variationLabel(line.variation?.color, line.variation?.size, language);

          return (
            <View
              key={line.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius['2xl'],
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                ...shadow.sm,
              }}
            >
              <Row gap={spacing.md} align="flex-start">
                <Pressable onPress={() => router.push(`/product/${line.product.id}` as never)}>
                  <Image
                    source={line.product.imageUrl || undefined}
                    style={{ width: 76, height: 76, borderRadius: radius.lg, backgroundColor: colors.candy[50] }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </Pressable>

                <View style={{ flex: 1, gap: 4 }}>
                  <T size="sm" weight="black" numberOfLines={2}>
                    {name}
                  </T>
                  {detail ? (
                    <T size="xs" weight="bold" color={colors.slate[500]}>
                      {detail}
                    </T>
                  ) : null}

                  <Row justify="space-between" style={{ marginTop: spacing.sm }}>
                    <Row gap={spacing.md}>
                      <Step label="−" onPress={() => setQuantity(line.id, line.quantity - 1)} />
                      <T size="sm" weight="black" style={{ minWidth: 20, textAlign: 'center' }}>
                        {line.quantity}
                      </T>
                      <Step label="+" onPress={() => setQuantity(line.id, line.quantity + 1)} />
                    </Row>

                    <T size="sm" weight="black" color={colors.candy[700]}>
                      {formatPrice(lineTotal(line.product, line.variation, line.quantity), language)}
                    </T>
                  </Row>
                </View>

                <Pressable onPress={() => remove(line.id)} hitSlop={10}>
                  <T size="sm" color={colors.rose[600]}>
                    🗑
                  </T>
                </Pressable>
              </Row>
            </View>
          );
        })}

        {freeOver > 0 && subtotal < freeOver ? (
          <View
            style={{
              backgroundColor: colors.sunny[50],
              borderColor: colors.sunny[200],
              borderWidth: 1,
              borderRadius: radius.xl,
              padding: spacing.lg,
            }}
          >
            <T size="xs" weight="black" color={colors.sunny[700]}>
              {t('freeOver', { amount: formatPrice(freeOver, language) })}
            </T>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.slate[100],
          ...shadow.md,
        }}
      >
        <Row justify="space-between" style={{ marginBottom: spacing.md }}>
          <T size="sm" weight="bold" color={colors.slate[600]}>
            {t('subtotal')}
          </T>
          <T size="lg" weight="black" color={colors.candy[700]}>
            {formatPrice(subtotal, language)}
          </T>
        </Row>

        {/* Delivery is deliberately not guessed here. It depends on the
            governorate, which is asked for at checkout — quoting a total now
            and changing it a screen later is worse than not quoting one. */}
        <Button full size="lg" title={t('checkout')} onPress={goCheckout} />
      </View>
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 30,
        height: 30,
        borderRadius: radius.pill,
        backgroundColor: colors.slate[50],
        borderWidth: 1,
        borderColor: colors.slate[200],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T size="sm" weight="black" color={colors.slate[700]}>
        {label}
      </T>
    </Pressable>
  );
}
