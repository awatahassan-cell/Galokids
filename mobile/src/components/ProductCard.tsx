import React, { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import { useCart } from '../store/CartProvider';
import { discountPercent, formatPrice, unitPrice, wasPrice } from '../utils/money';
import type { Product } from '../api/types';
import { Row, T } from './ui';

/**
 * A product, as it appears in every grid and row in the app.
 *
 * Memoised, and every callback stable, because these are rendered by the
 * hundred inside long lists: a card that re-renders whenever its parent does
 * is what makes a catalogue scroll badly on a mid-range phone.
 */
export const ProductCard = memo(function ProductCard({
  product,
  width,
  compact,
}: {
  product: Product;
  width?: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const { language, pick, t, isRTL } = useLanguage();
  const { toggleWishlist, isWishlisted } = useCart();

  const name = pick(product.nameKu, product.nameAr, product.name) || product.name;
  const price = unitPrice(product);
  const was = wasPrice(product);
  const off = discountPercent(product);
  const saved = isWishlisted(product.id);

  const inStock =
    product.variations.length === 0 ||
    product.variations.some(variation => variation.stockQuantity > 0);

  const open = useCallback(() => {
    router.push(`/product/${product.id}`);
  }, [router, product.id]);

  const onHeart = useCallback(() => toggleWishlist(product.id), [toggleWishlist, product.id]);

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [
        {
          width,
          backgroundColor: colors.surface,
          borderRadius: radius['2xl'],
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        shadow.sm,
      ]}
    >
      <View style={{ aspectRatio: 1, backgroundColor: colors.candy[50] }}>
        <Image
          source={product.imageUrl || undefined}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          // Disk caching matters more than anything else here: the same
          // pictures come back on every screen, and re-downloading them is
          // what makes a catalogue feel slow on a phone connection.
          cachePolicy="memory-disk"
          transition={180}
          placeholder={{ blurhash: 'L6PZfSjE.AyE_3t7t7R**0o#DgR4' }}
        />

        {off > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.md,
              // Anchored to the reading side, so the badge does not sit on top
              // of the heart in one language and beside it in another.
              [isRTL ? 'right' : 'left']: spacing.md,
              backgroundColor: colors.sunny[500],
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <T size="xs" weight="black" color={colors.sunny[700]}>
              {language === 'en' ? `${off}% OFF` : `%${off} داشکاندن`}
            </T>
          </View>
        ) : null}

        <Pressable
          onPress={onHeart}
          hitSlop={10}
          accessibilityLabel={t('wishlist')}
          style={{
            position: 'absolute',
            top: spacing.md,
            [isRTL ? 'left' : 'right']: spacing.md,
            width: 34,
            height: 34,
            borderRadius: radius.pill,
            backgroundColor: saved ? colors.candy[500] : 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T size="sm" color={saved ? colors.white : colors.candy[600]}>
            {saved ? '♥' : '♡'}
          </T>
        </Pressable>

        {!inStock ? (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.72)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <T size="sm" weight="black" color={colors.slate[600]}>
              {t('outOfStock')}
            </T>
          </View>
        ) : null}
      </View>

      <View style={{ padding: compact ? spacing.md : spacing.lg, gap: 4 }}>
        <T size="sm" weight="black" numberOfLines={2} style={{ minHeight: 42 }}>
          {name}
        </T>

        <Row gap={spacing.sm} align="baseline">
          <T size={compact ? 'sm' : 'base'} weight="black" color={colors.candy[700]}>
            {formatPrice(price, language)}
          </T>
          {was ? (
            <T
              size="xs"
              weight="bold"
              color={colors.slate[400]}
              style={{ textDecorationLine: 'line-through' }}
            >
              {formatPrice(was, language)}
            </T>
          ) : null}
        </Row>
      </View>
    </Pressable>
  );
});
