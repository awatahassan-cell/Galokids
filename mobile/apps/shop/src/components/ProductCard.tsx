import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { effectivePrice, formatIQD, type Product } from '@galokids/core';
import { useWishlist } from '@/state/useWishlist';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * One product in the grid.
 *
 * `image_url` arrives from the API as a whole URL — it is made absolute there
 * precisely so a phone, which has no page to resolve a path against, can load
 * it. A product with no picture gets a placeholder rather than a broken frame.
 */
export function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);

  const price = effectivePrice(product);
  const discounted = product.discount_price != null && product.discount_price > 0;

  const inStock = (product.variations ?? []).some(v => v.stock_quantity > 0);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={160}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderMark}>👕</Text>
          </View>
        )}

        {discounted && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>داشکاندن</Text>
          </View>
        )}

        {!inStock && (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>تەواو بووە</Text>
          </View>
        )}

        {/* Over the sold-out veil on purpose: saving something that is out of
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
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {product.name_ku || product.name}
      </Text>

      <View style={styles.priceRow}>
        {discounted && <Text style={styles.wasPrice}>{formatIQD(product.price)}</Text>}
        <Text style={styles.price}>{formatIQD(price)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: spacing.xs },
  pressed: { opacity: 0.75 },
  imageWrap: {
    aspectRatio: 0.82,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.brandSoft,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderMark: { fontSize: 34 },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    insetInlineEnd: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', ...typography.tiny },
  soldOut: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,20,32,0.45)',
  },
  soldOutText: { color: '#fff', ...typography.heading },
  heart: {
    position: 'absolute',
    top: spacing.xs,
    insetInlineStart: spacing.xs,
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartMark: { fontSize: 18, color: colors.textMuted, lineHeight: 22 },
  heartMarkOn: { color: colors.brand },
  name: { ...typography.small, color: colors.text, textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: spacing.sm },
  price: { ...typography.heading, color: colors.brand },
  wasPrice: { ...typography.tiny, color: colors.textFaint, textDecorationLine: 'line-through' },
});
