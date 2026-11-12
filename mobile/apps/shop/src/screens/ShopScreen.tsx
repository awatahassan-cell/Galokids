import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { catalogue, type Category, type Product } from '@galokids/core';
import { ProductCard } from '@/components/ProductCard';
import { Empty, Loading, PageWash, Problem, TabBar } from '@/components/ui';
import { useWishlist } from '@/state/useWishlist';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * What the shop is selling.
 *
 * Pages as the shopper scrolls rather than fetching the lot: a catalogue of a
 * few thousand garments over mobile data is a long wait before anything
 * appears, and most shoppers never reach the second screen.
 */
export default function ShopScreen() {
  const router = useRouter();
  const wishlist = useWishlist();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      try {
        setError(null);

        const response = await catalogue.products({
          page: nextPage,
          limit: 20,
          search: search.trim() || undefined,
          categoryId: category ?? undefined,
        });

        setProducts(previous => (replace ? response.data : [...previous, ...response.data]));
        setPage(response.current_page);
        setLastPage(response.last_page);
      } catch (caught) {
        setError(caught);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, search]
  );

  useEffect(() => {
    catalogue.categories().then(setCategories).catch(() => {});
  }, []);

  // Wait for a pause in typing. Firing on every keystroke would send a request
  // per letter and the answers would arrive out of order.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => load(1, true), 350);

    return () => clearTimeout(timer);
  }, [load]);

  const chips = [{ id: 0, name: 'هەموو' } as Category, ...categories];

  return (
    <View style={styles.screen}>
      <PageWash />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Pressable
            style={styles.saved}
            onPress={() => router.replace('/wishlist')}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="دڵخوازەکان"
          >
            <Text style={styles.savedMark}>♥</Text>
            {wishlist.count > 0 && (
              <View style={styles.savedCount}>
                <Text style={styles.savedCountText}>{wishlist.count}</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.brandText}>
            <Text style={styles.brandName}>گەلۆ کیدز</Text>
            <Text style={styles.brandLine}>جلوبەرگی منداڵان</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchMark}>⌕</Text>
          <TextInput
            style={styles.search}
            placeholder="گەڕان بۆ بەرهەم…"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            returnKeyType="search"
          />
        </View>
      </View>

      {categories.length > 0 && (
        <FlatList
          horizontal
          inverted
          data={chips}
          keyExtractor={item => String(item.id)}
          showsHorizontalScrollIndicator={false}
          style={styles.chipStrip}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const active = item.id === 0 ? category === null : category === item.id;

            return (
              <Pressable
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(item.id === 0 ? null : item.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name_ku || item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {loading && products.length === 0 ? (
        <Loading />
      ) : error && products.length === 0 ? (
        <Problem error={error} onRetry={() => load(1, true)} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(1, true);
              }}
              tintColor={colors.brandDeep}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading && page < lastPage) load(page + 1, false);
          }}
          ListEmptyComponent={
            <Empty
              mark="🔍"
              title="هیچ بەرهەمێک نەدۆزرایەوە"
              body="ناوێکی تر تاقی بکەرەوە، یان بەشێکی تر هەڵبژێرە."
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
          )}
        />
      )}

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  brandRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  brandText: { flex: 1, alignItems: 'flex-end' },
  brandName: { ...typography.display, color: colors.text, textAlign: 'right' },
  brandLine: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },

  saved: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  savedMark: { fontSize: 17, color: colors.brandDeep, lineHeight: 22 },
  savedCount: {
    position: 'absolute',
    top: -5,
    insetInlineStart: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandDeep,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCountText: { color: '#fff', fontSize: 9, fontFamily: fonts.bold, lineHeight: 13 },

  searchWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  searchMark: { fontSize: 18, color: colors.textFaint },
  search: { flex: 1, ...typography.body, color: colors.text },

  // An explicit height. A horizontal list inside a flex column takes its
  // height from the content, which here resolved to about half a chip — the
  // strip was sliced through the middle of the words.
  chipStrip: { flexGrow: 0, height: 60, marginTop: spacing.md },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...typography.small, color: colors.textMuted },
  chipTextActive: { color: '#fff', fontFamily: fonts.bold },

  grid: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  column: { gap: spacing.md },
});
