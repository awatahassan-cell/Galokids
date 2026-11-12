import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { catalogue, effectivePrice, formatIQD, type Product } from '@galokids/core';
import { Empty, TabBar } from '@/components/ui';
import { useBasket } from '@/state/useBasket';
import { useWishlist, type WishlistEntry } from '@/state/useWishlist';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The things a shopper saved.
 *
 * Draws from the saved snapshot first so the list is there the instant the tab
 * is tapped and is there with no signal, then refreshes each one from the
 * catalogue. The refresh matters: a price or a size that sold out since it was
 * saved is exactly what a shopper is coming back to check, and showing them a
 * months-old price is how an argument starts at the counter.
 */
export default function WishlistScreen() {
  const router = useRouter();
  const wishlist = useWishlist();
  const basket = useBasket();

  const [fresh, setFresh] = useState<Record<number, Product>>({});
  const [gone, setGone] = useState<number[]>([]);

  const refresh = useCallback(async (entries: WishlistEntry[]) => {
    if (entries.length === 0) return;

    // One request each, because the catalogue has no "these ids" endpoint. A
    // wishlist is a handful of things, so this is a handful of requests — and
    // every one that fails simply leaves the saved snapshot on screen.
    const results = await Promise.allSettled(
      entries.map(entry => catalogue.product(entry.productId))
    );

    const loaded: Record<number, Product> = {};
    const missing: number[] = [];

    results.forEach((result, index) => {
      const id = entries[index]!.productId;

      if (result.status === 'fulfilled') loaded[id] = result.value;
      // A 404 means the shop took it down. Say so rather than letting a
      // shopper tap through to an error.
      else if ((result.reason as { status?: number })?.status === 404) missing.push(id);
    });

    setFresh(previous => ({ ...previous, ...loaded }));
    setGone(previous => [...new Set([...previous, ...missing])]);
  }, []);

  useEffect(() => {
    if (wishlist.ready) refresh(wishlist.entries);
    // Only on opening the screen, and when the saved list changes length —
    // refetching on every render would hammer the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist.ready, wishlist.entries.length]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {wishlist.count > 0 && (
          <Pressable onPress={wishlist.clear} hitSlop={8} style={styles.clear}>
            <Text style={styles.clearText}>سڕینەوەی هەمووی</Text>
          </Pressable>
        )}

        <View style={styles.headerText}>
          <Text style={styles.title}>دڵخوازەکان</Text>
          <Text style={styles.subtitle}>
            {wishlist.count > 0
              ? `${wishlist.count} بەرهەم · لەسەر ئەم مۆبایلە پارێزراوە`
              : 'لەسەر ئەم مۆبایلە پارێزراوە'}
          </Text>
        </View>
      </View>

      {wishlist.count === 0 ? (
        <Empty
          mark="♡"
          title="هێشتا هیچ دڵخوازێک نییە"
          body="لەسەر هەر بەرهەمێک دڵەکە دابگرە بۆ ئەوەی لێرە پاشەکەوت بکرێت."
          action={{ label: 'بڕۆ بۆ فرۆشگا', onPress: () => router.replace('/') }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {wishlist.entries.map(entry => {
            const product = fresh[entry.productId];
            const removed = gone.includes(entry.productId);

            const price = product ? effectivePrice(product) : entry.price;
            const changed = product != null && Math.round(price) !== Math.round(entry.price);
            const inStock = product
              ? (product.variations ?? []).some(variation => variation.stock_quantity > 0)
              : true;

            return (
              <View key={entry.productId} style={styles.row}>
                <Pressable
                  style={styles.rowMain}
                  onPress={() => router.push(`/product/${entry.productId}`)}
                  disabled={removed}
                >
                  {entry.imageUrl || product?.image_url ? (
                    <Image
                      source={{ uri: product?.image_url ?? entry.imageUrl ?? undefined }}
                      style={styles.thumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Text style={styles.thumbMark}>👕</Text>
                    </View>
                  )}

                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>
                      {product ? product.name_ku || product.name : entry.name}
                    </Text>

                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{formatIQD(price)}</Text>
                      {changed && (
                        <Text style={styles.wasPrice}>{formatIQD(entry.price)}</Text>
                      )}
                    </View>

                    {removed ? (
                      <Text style={styles.bad}>ئەم بەرهەمە لە فرۆشگا نەماوە</Text>
                    ) : !inStock ? (
                      <Text style={styles.bad}>ئێستا تەواو بووە</Text>
                    ) : changed ? (
                      <Text style={styles.changed}>نرخەکە گۆڕاوە</Text>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.add, (!inStock || removed) && styles.addOff]}
                    disabled={!product || !inStock || removed}
                    onPress={() => {
                      if (!product) return;

                      // Straight to the basket only when there is nothing to
                      // choose. With colours and sizes the product page has to
                      // ask, and guessing a size for somebody is a return.
                      const variations = product.variations ?? [];
                      const sellable = variations.filter(v => v.stock_quantity > 0);

                      if (variations.length === 0) basket.add(product, null);
                      else if (sellable.length === 1) basket.add(product, sellable[0]!);
                      else {
                        router.push(`/product/${product.id}`);
                        return;
                      }
                    }}
                  >
                    <Text style={styles.addText}>بۆ سەبەتە</Text>
                  </Pressable>

                  <Pressable
                    style={styles.drop}
                    onPress={() => wishlist.remove(entry.productId)}
                    hitSlop={6}
                  >
                    <Text style={styles.dropText}>سڕینەوە</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: { ...typography.title, color: colors.text, textAlign: 'right' },
  subtitle: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  clear: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  clearText: { ...typography.tiny, color: colors.danger },

  list: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { flex: 1, flexDirection: 'row-reverse', gap: spacing.md },
  thumb: { width: 72, height: 88, borderRadius: radius.sm, backgroundColor: colors.brandSoft },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbMark: { fontSize: 26 },
  info: { flex: 1, alignItems: 'flex-end', gap: spacing.xs },
  name: { ...typography.body, color: colors.text, textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: spacing.sm },
  price: { ...typography.heading, color: colors.brand },
  wasPrice: { ...typography.tiny, color: colors.textFaint, textDecorationLine: 'line-through' },
  bad: { ...typography.tiny, color: colors.danger },
  changed: { ...typography.tiny, color: colors.accent },

  actions: { justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  add: {
    minHeight: TOUCH_TARGET - 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOff: { opacity: 0.35 },
  addText: { color: '#fff', ...typography.tiny },
  drop: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  dropText: { ...typography.tiny, color: colors.textFaint },
});
