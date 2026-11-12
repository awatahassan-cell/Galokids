import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError, catalogue, type Category, type Product } from '@galokids/core';
import { ProductCard } from '@/components/ProductCard';
import { useBasket } from '@/state/useBasket';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * What the shop is selling.
 *
 * Pages as the shopper scrolls rather than fetching the lot: a catalogue of a
 * few thousand garments over mobile data is a long wait before anything
 * appears, and most shoppers never reach the second screen.
 */
export default function ShopScreen() {
  const router = useRouter();
  const basket = useBasket();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      try {
        setProblem(null);

        const response = await catalogue.products({
          page: nextPage,
          limit: 20,
          search: search.trim() || undefined,
          categoryId: category ?? undefined,
        });

        setProducts(previous => (replace ? response.data : [...previous, ...response.data]));
        setPage(response.current_page);
        setLastPage(response.last_page);
      } catch (error) {
        // Say which of the two it is. "Try again" is useless advice when the
        // problem is that the phone has no signal.
        setProblem(
          error instanceof ApiError && error.isOffline
            ? 'هیچ پەیوەندییەک نییە. ئینتەرنێتەکەت بپشکنە.'
            : (error as Error).message
        );
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.basketButton} onPress={() => router.push('/basket')}>
          <Text style={styles.basketIcon}>🧺</Text>
          {basket.itemCount > 0 && (
            <View style={styles.basketCount}>
              <Text style={styles.basketCountText}>{basket.itemCount}</Text>
            </View>
          )}
        </Pressable>

        <TextInput
          style={styles.search}
          placeholder="گەڕان بۆ بەرهەم…"
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      {categories.length > 0 && (
        <FlatList
          horizontal
          inverted
          data={[{ id: 0, name: 'هەموو' } as Category, ...categories]}
          keyExtractor={item => String(item.id)}
          showsHorizontalScrollIndicator={false}
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
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : problem && products.length === 0 ? (
        <View style={styles.centre}>
          <Text style={styles.problemText}>{problem}</Text>
          <Pressable style={styles.retry} onPress={() => load(1, true)}>
            <Text style={styles.retryText}>هەوڵدانەوە</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(1, true);
              }}
              tintColor={colors.brand}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading && page < lastPage) load(page + 1, false);
          }}
          ListEmptyComponent={
            <View style={styles.centre}>
              <Text style={styles.problemText}>هیچ بەرهەمێک نەدۆزرایەوە.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  search: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.text,
  },
  basketButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketIcon: { fontSize: 20 },
  basketCount: {
    position: 'absolute',
    top: 2,
    insetInlineEnd: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketCountText: { color: '#fff', ...typography.tiny },

  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.small, color: colors.textMuted },
  chipTextActive: { color: '#fff' },

  grid: { padding: spacing.lg, gap: spacing.lg },
  column: { gap: spacing.lg },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  problemText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  retry: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  retryText: { color: '#fff', ...typography.heading },
});
