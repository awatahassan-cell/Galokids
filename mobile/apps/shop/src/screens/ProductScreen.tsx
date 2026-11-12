import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ApiError,
  catalogue,
  effectivePrice,
  formatIQD,
  type Product,
  type ProductVariation,
} from '@galokids/core';
import { useBasket } from '@/state/useBasket';
import { useWishlist } from '@/state/useWishlist';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

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
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const productId = Number(id);
    if (!Number.isFinite(productId)) {
      setProblem('ئەم بەرهەمە نەدۆزرایەوە.');
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
      .catch(error => {
        setProblem(
          error instanceof ApiError && error.isOffline
            ? 'هیچ پەیوەندییەک نییە. ئینتەرنێتەکەت بپشکنە.'
            : (error as Error).message
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (problem || !product) {
    return (
      <View style={styles.centre}>
        <Text style={styles.problem}>{problem ?? 'ئەم بەرهەمە نەدۆزرایەوە.'}</Text>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>گەڕانەوە</Text>
        </Pressable>
      </View>
    );
  }

  const options = product.variations ?? [];
  const price = effectivePrice(product, chosen);
  const discounted = product.discount_price != null && product.discount_price > 0;
  const needsChoice = options.length > 1 && !chosen;
  const soldOut = chosen ? chosen.stock_quantity <= 0 : options.every(v => v.stock_quantity <= 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderMark}>👕</Text>
            </View>
          )}

          <Pressable
            style={styles.heart}
            onPress={() => wishlist.toggle(product)}
            accessibilityRole="button"
            accessibilityLabel={
              wishlist.has(product.id) ? 'لابردن لە دڵخوازەکان' : 'زیادکردن بۆ دڵخوازەکان'
            }
          >
            <Text style={[styles.heartMark, wishlist.has(product.id) && styles.heartMarkOn]}>
              {wishlist.has(product.id) ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.name}>{product.name_ku || product.name}</Text>

        <View style={styles.priceRow}>
          {discounted && <Text style={styles.wasPrice}>{formatIQD(product.price)}</Text>}
          <Text style={styles.price}>{formatIQD(price)}</Text>
        </View>

        {product.description_ku || product.description ? (
          <Text style={styles.description}>{product.description_ku || product.description}</Text>
        ) : null}

        {options.length > 1 && (
          <View style={styles.optionsBlock}>
            <Text style={styles.optionsTitle}>ڕەنگ و قەبارە</Text>

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
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.add, (needsChoice || soldOut) && styles.addDisabled]}
          disabled={needsChoice || soldOut}
          onPress={() => {
            basket.add(product, chosen);
            router.push('/basket');
          }}
        >
          <Text style={styles.addText}>
            {soldOut ? 'تەواو بووە' : needsChoice ? 'ڕەنگ و قەبارە هەڵبژێرە' : 'زیادکردن بۆ سەبەتە'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },

  imageWrap: { aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.brandSoft },
  image: { width: '100%', height: '100%' },
  heart: {
    position: 'absolute',
    top: spacing.md,
    insetInlineStart: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartMark: { fontSize: 24, color: colors.textMuted, lineHeight: 28 },
  heartMarkOn: { color: colors.brand },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderMark: { fontSize: 56 },

  name: { ...typography.display, color: colors.text, textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: spacing.md },
  price: { ...typography.title, color: colors.brand },
  wasPrice: { ...typography.small, color: colors.textFaint, textDecorationLine: 'line-through' },
  description: { ...typography.body, color: colors.textMuted, textAlign: 'right', lineHeight: 24 },

  optionsBlock: { gap: spacing.sm, marginTop: spacing.sm },
  optionsTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  options: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  optionOut: { opacity: 0.4 },
  optionText: { ...typography.small, color: colors.text },
  optionTextActive: { color: '#fff' },
  optionOutText: { ...typography.tiny, color: colors.textFaint },

  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  add: {
    minHeight: TOUCH_TARGET + 6,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: { opacity: 0.4 },
  addText: { color: '#fff', ...typography.title },

  problem: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  back: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  backText: { ...typography.heading, color: colors.brand },
});
