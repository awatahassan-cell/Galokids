import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { effectivePrice, formatIQD, type Product } from '@galokids/core';
import { MediaWash } from '@/components/ui';
import { useWishlist } from '@/state/useWishlist';
import { colors, fonts, mediaWash, radius, shadow, spacing, typography } from '@/theme';

/**
 * One product in the grid.
 *
 * The website's card, as closely as React Native allows: a white tile with
 * generously rounded corners and a hairline, the photo on a pastel wash chosen
 * from the product's own id so a grid reads as a set, a discount badge at the
 * start corner and the wishlist heart at the end corner.
 *
 * `image_url` arrives from the API as a whole URL — it is made absolute there
 * precisely so a phone, which has no page to resolve a path against, can load
 * it. A product with no picture gets the wash and a placeholder rather than a
 * broken frame.
 */
export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);

  const price = effectivePrice(product);
  const discounted = product.discount_price != null && product.discount_price > 0;
  const off = discounted ? Math.round((1 - Number(product.discount_price) / Number(product.price)) * 100) : 0;

  const variations = product.variations ?? [];
  // No variations at all is a product sold as itself, not one that is sold
  // out: saying "تەواو بووە" over it would hide a perfectly sellable line.
  const inStock = variations.length === 0 || variations.some(v => v.stock_quantity > 0);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <MediaWash wash={mediaWash(product.id)} style={styles.media}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={160}
          />
        ) : (
          <Text style={styles.placeholderMark}>👕</Text>
        )}

        {!inStock ? (
          <View style={[styles.badge, styles.badgeOut]}>
            <Text style={styles.badgeOutText}>تەواو بووە</Text>
          </View>
        ) : discounted ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>داشکانی %{off}</Text>
          </View>
        ) : null}

        {/* Over the sold-out badge on purpose: saving something that is out of
            stock is exactly when a shopper wants to come back to it. */}
        <Pressable
          style={styles.heart}
          onPress={() => wishlist.toggle(product)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'لابردن لە دڵخوازەکان' : 'زیادکردن بۆ دڵخوازەکان'}
        >
          <Text style={[styles.heartMark, saved && styles.heartMarkOn]}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </MediaWash>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name_ku || product.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatIQD(price)}</Text>
          {discounted && <Text style={styles.wasPrice}>{formatIQD(product.price)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  media: {
    aspectRatio: 0.84,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  placeholderMark: { fontSize: 36 },

  badge: {
    position: 'absolute',
    top: spacing.sm,
    insetInlineStart: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold, lineHeight: 16 },
  badgeOut: { backgroundColor: colors.ink },
  badgeOutText: { color: '#fff', fontSize: 10, fontFamily: fonts.bold, lineHeight: 16 },

  heart: {
    position: 'absolute',
    top: spacing.sm,
    insetInlineEnd: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  heartMark: { fontSize: 17, color: colors.textMuted, lineHeight: 22 },
  heartMarkOn: { color: colors.brandDeep },

  info: { padding: spacing.md, gap: 2 },
  name: { ...typography.small, color: colors.text, textAlign: 'right', minHeight: 40 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: spacing.sm },
  price: { ...typography.price, color: colors.text },
  wasPrice: {
    ...typography.tiny,
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
});
