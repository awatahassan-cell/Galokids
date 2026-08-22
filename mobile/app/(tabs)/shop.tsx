import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useShop } from '../../src/store/ShopProvider';
import { fetchProducts, type ProductQuery } from '../../src/api/endpoints';
import type { Product } from '../../src/api/types';
import { ProductCard } from '../../src/components/ProductCard';
import { EmptyState, Loading, Row, T } from '../../src/components/ui';

const { width: SCREEN } = Dimensions.get('window');
const GAP = spacing.md;
const CARD = (SCREEN - spacing.lg * 2 - GAP) / 2;

type Sort = NonNullable<ProductQuery['sort']>;

/**
 * The catalogue.
 *
 * Paged rather than loaded whole: the endpoint will hand back everything if
 * asked, and a shop with a few hundred products is a slow request and a lot
 * of memory on a phone. `FlashList` recycles rows, so scrolling stays smooth
 * however long the list gets.
 *
 * Search is debounced and each request supersedes the last — typing six
 * letters should cost one round trip, not six, and an answer to "sho" must
 * never overwrite the answer to "shoes".
 */
export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { t, pick, isRTL } = useLanguage();
  const { categories } = useShop();
  const params = useLocalSearchParams<{ category?: string; search?: string; sale?: string; focus?: string; gender?: string }>();

  const [search, setSearch] = useState(params.search ?? '');
  const [debounced, setDebounced] = useState(params.search ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(params.category);
  const [sort, setSort] = useState<Sort>('newest');
  const [onlySale, setOnlySale] = useState(params.sale === '1');

  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const requestId = useRef(0);

  // A link may arrive while the screen is already mounted.
  useEffect(() => {
    if (params.category !== undefined) setCategoryId(params.category || undefined);
    if (params.sale !== undefined) setOnlySale(params.sale === '1');
    if (params.search !== undefined) {
      setSearch(params.search);
      setDebounced(params.search);
    }
  }, [params.category, params.sale, params.search]);

  useEffect(() => {
    if (params.focus === '1') {
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [params.focus]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++requestId.current;
      if (replace) setLoading(true);
      else setLoadingMore(true);

      try {
        const result = await fetchProducts({
          page: nextPage,
          limit: 20,
          search: debounced || undefined,
          categoryId,
          sort,
        });

        // A slower earlier request must not overwrite a newer answer.
        if (id !== requestId.current) return;

        // "On sale" is not a filter the endpoint offers, so it is applied to
        // what came back rather than faked as a server-side one.
        const rows = onlySale
          ? result.data.filter(product => (product.discountPrice ?? 0) > 0)
          : result.data;

        setItems(prev => (replace ? rows : [...prev, ...rows]));
        setPage(result.currentPage);
        setLastPage(result.lastPage);
      } catch {
        if (id === requestId.current && replace) setItems([]);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debounced, categoryId, sort, onlySale]
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= lastPage) return;
    load(page + 1, false);
  }, [loading, loadingMore, page, lastPage, load]);

  const chips = useMemo(
    () => [{ id: undefined as string | undefined, label: t('allCategories') }, ...categories.map(category => ({
      id: category.id,
      label: pick(category.nameKu, category.nameAr, category.name) || category.name,
    }))],
    [categories, pick, t]
  );

  const sorts: { key: Sort; label: string }[] = [
    { key: 'newest', label: t('newest') },
    { key: 'price_asc', label: t('priceLowHigh') },
    { key: 'price_desc', label: t('priceHighLow') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View
          style={{
            height: 48,
            borderRadius: radius.pill,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.xl,
            justifyContent: 'center',
          }}
        >
          <Row gap={spacing.md}>
            <T size="base" color={colors.slate[400]}>🔍</T>
            <TextInput
              ref={inputRef}
              value={search}
              onChangeText={setSearch}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={colors.slate[400]}
              returnKeyType="search"
              autoCorrect={false}
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: '700',
                color: colors.slate[800],
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                // Android adds its own vertical padding that misaligns the
                // text inside a fixed-height pill.
                paddingVertical: 0,
              }}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={10}>
                <T size="sm" color={colors.slate[400]}>✕</T>
              </Pressable>
            ) : null}
          </Row>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginTop: spacing.md }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}
      >
        {chips.map(chip => {
          const active = categoryId === chip.id;
          return (
            <Pressable
              key={chip.id ?? 'all'}
              onPress={() => setCategoryId(chip.id)}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.candy[500] : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.candy[500] : colors.border,
              }}
            >
              <T size="xs" weight="black" color={active ? colors.white : colors.slate[600]}>
                {chip.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      <Row
        justify="space-between"
        style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, flexDirection: isRTL ? 'row-reverse' : 'row' }}
        >
          {sorts.map(option => (
            <Pressable key={option.key} onPress={() => setSort(option.key)} hitSlop={6}>
              <T
                size="xs"
                weight="black"
                color={sort === option.key ? colors.candy[700] : colors.slate[400]}
              >
                {option.label}
              </T>
            </Pressable>
          ))}
          <Pressable onPress={() => setOnlySale(value => !value)} hitSlop={6}>
            <T size="xs" weight="black" color={onlySale ? colors.candy[700] : colors.slate[400]}>
              % {t('discount')}
            </T>
          </Pressable>
        </ScrollView>
      </Row>

      {loading ? (
        <Loading label={t('loading')} />
      ) : items.length === 0 ? (
        <EmptyState emoji="🔍" title={t('noResults')} hint={t('noResultsHint')} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={product => product.id}
          numColumns={2}
          estimatedItemSize={280}
          contentContainerStyle={{ padding: spacing.lg }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: CARD,
                marginBottom: GAP,
                // The gap between the two columns, put on the inner edge of
                // whichever column is second in the reading direction.
                [isRTL ? 'marginLeft' : 'marginRight']: index % 2 === 0 ? GAP : 0,
              }}
            >
              <ProductCard product={item} />
            </View>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: spacing.xl }}>
                <ActivityIndicator color={colors.candy[500]} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
