import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  catalogue,
  effectivePrice,
  formatIQD,
  type Product,
  type ProductVariation,
} from '@galokids/core';
import { Eyebrow, Loading, MediaWash, PageWash, Problem } from '@/components/ui';
import { useBasket } from '@/state/useBasket';
import { useWishlist } from '@/state/useWishlist';
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
 * One garment.
 *
 * The colour and size have to be chosen before it can go in the basket. A
 * basket line without a variation cannot tell the shop which piece to pick,
 * and the order would arrive needing a phone call to resolve.
 */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const basket = useBasket();
  const wishlist = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [chosen, setChosen] = useState<ProductVariation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const productId = Number(id);

    if (!Number.isFinite(productId)) {
      setError(new Error('ئەم بەرهەمە نەدۆزرایەوە.'));
      setLoading(false);
      return;
    }

    catalogue
      .product(productId)
      .then(found => {
        setProduct(found);

        // One option and nothing to decide: choose it, so the customer is not
        // asked a question with a single answer.
        const options = found.variations ?? [];
        if (options.length === 1) setChosen(options[0]!);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <PageWash />
        <Loading />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.screen}>
        <PageWash />
        <Problem error={error} onRetry={() => router.back()} />
      </View>
    );
  }

  const options = product.variations ?? [];
  const price = effectivePrice(product, chosen);
  const discounted = product.discount_price != null && product.discount_price > 0;
  const off = discounted
    ? Math.round((1 - Number(product.discount_price) / Number(product.price)) * 100)
    : 0;

  const needsChoice = options.length > 1 && !chosen;
  const soldOut = chosen
    ? chosen.stock_quantity <= 0
    : options.length > 0 && options.every(v => v.stock_quantity <= 0);

  const saved = wishlist.has(product.id);

  return (
    <View style={styles.screen}>
      <PageWash />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MediaWash wash={mediaWash(product.id)} style={styles.media}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} contentFit="cover" />
          ) : (
            <Text style={styles.placeholderMark}>👕</Text>
          )}

          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backMark}>→</Text>
          </Pressable>

          <Pressable
            style={styles.heart}
            onPress={() => wishlist.toggle(product)}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'لابردن لە دڵخوازەکان' : 'زیادکردن بۆ دڵخوازەکان'}
          >
            <Text style={[styles.heartMark, saved && styles.heartMarkOn]}>{saved ? '♥' : '♡'}</Text>
          </Pressable>

          {discounted && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>داشکانی %{off}</Text>
            </View>
          )}
        </MediaWash>

        <View style={styles.sheet}>
          <Text style={styles.name}>{product.name_ku || product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatIQD(price)}</Text>
            {discounted && <Text style={styles.wasPrice}>{formatIQD(product.price)}</Text>}
          </View>

          {product.description_ku || product.description ? (
            <Text style={styles.description}>
              {product.description_ku || product.description}
            </Text>
          ) : null}

          {options.length > 1 && (
            <View style={styles.optionsBlock}>
              <Eyebrow>ڕەنگ و قەبارە</Eyebrow>

              <View style={styles.options}>
                {options.map(option => {
                  const active = chosen?.id === option.id;
                  const out = option.stock_quantity <= 0;

                  return (
                    <Pressable
                      key={option.id}
                      disabled={out}
                      style={[styles.option, active && styles.optionActive, out && styles.optionOut]}
                      onPress={() => setChosen(option)}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {[option.color, option.size].filter(Boolean).join(' · ') || 'ئاسایی'}
                      </Text>
                      {out && <Text style={styles.optionOutText}>تەواو</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerLabel}>نرخ</Text>
          <Text style={styles.footerValue}>{formatIQD(price)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.add,
            (needsChoice || soldOut) && styles.addOff,
            pressed && styles.addPressed,
          ]}
          disabled={needsChoice || soldOut}
          onPress={() => {
            basket.add(product, chosen);
            router.push('/basket');
          }}
        >
          <Text style={styles.addText}>
            {soldOut
              ? 'تەواو بووە'
              : needsChoice
                ? 'ڕەنگ و قەبارە هەڵبژێرە'
                : 'زیادکردن بۆ سەبەتە'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  // flexGrow so the white panel reaches the footer on a short product;
  // otherwise it stopped at its own height and the page showed beneath it.
  content: { flexGrow: 1 },

  media: { width: '100%', aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  placeholderMark: { fontSize: 56 },

  back: {
    position: 'absolute',
    top: spacing.xl + spacing.sm,
    insetInlineEnd: spacing.lg,
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  backMark: { fontSize: 18, color: colors.text },

  heart: {
    position: 'absolute',
    top: spacing.xl + spacing.sm,
    insetInlineStart: spacing.lg,
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  heartMark: { fontSize: 20, color: colors.textMuted, lineHeight: 26 },
  heartMarkOn: { color: colors.brandDeep },

  badge: {
    position: 'absolute',
    bottom: spacing.xl,
    insetInlineStart: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold, lineHeight: 17 },

  // Lifted over the photo, the way the website's product panel sits.
  sheet: {
    marginTop: -spacing.xl,
    backgroundColor: colors.surface,
    borderTopStartRadius: radius.xl,
    borderTopEndRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    flexGrow: 1,
  },
  name: { ...typography.display, color: colors.text, textAlign: 'right' },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  price: { fontSize: 24, fontFamily: fonts.bold, color: colors.brandText, lineHeight: 34 },
  wasPrice: {
    ...typography.small,
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.sm,
  },

  optionsBlock: { gap: spacing.md, marginTop: spacing.lg, alignItems: 'flex-end' },
  options: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  optionActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  optionOut: { opacity: 0.45 },
  optionText: { ...typography.small, color: colors.text },
  optionTextActive: { color: '#fff', fontFamily: fonts.bold },
  optionOutText: { ...typography.tiny, color: colors.danger },

  footer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  footerPrice: { alignItems: 'flex-end' },
  footerLabel: { ...typography.tiny, color: colors.textMuted },
  footerValue: { ...typography.title, color: colors.text },
  add: {
    flex: 1,
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  addOff: { backgroundColor: colors.borderStrong },
  addPressed: { transform: [{ scale: 0.98 }] },
  addText: { color: '#fff', ...typography.heading },
});
