import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { catalogue, shop, type Category, type Product } from '@galokids/core';
import { CategoryStrip } from '@/components/CategoryStrip';
import { Drawer, Header } from '@/components/Header';
import { Hero, type HeroSlide } from '@/components/Hero';
import { ProductCard } from '@/components/ProductCard';
import { Loading, PageWash, PrimaryButton, Problem, TabBar } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing, typography } from '@/theme';

/**
 * The front of the shop.
 *
 * The website's phone home page: search, the banner the shop set in its own
 * back office, departments as a strip of circles, today's deals in one
 * swipeable row, then the popular grid. Browsing the whole catalogue lives on
 * its own screen, because a shopper who knows what they want and one who is
 * only looking need different pages.
 */
export default function HomeScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);

      const [list, cats] = await Promise.all([
        catalogue.products({ page: 1, limit: 20 }),
        catalogue.categories().catch(() => [] as Category[]),
      ]);

      setProducts(list.data);
      setCategories(cats);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The banner separately, and never fatally: a shop with no slides set, or a
  // settings call that fails, should still get a shop — not an error page in
  // place of the catalogue.
  useEffect(() => {
    shop
      .settings()
      .then(settings => setSlides(parseSlides(settings.hero_slides)))
      .catch(() => {});
  }, []);

  // Anything with a real discount is a deal; failing that the newest, so the
  // row is never empty on a shop that has set no discounts yet.
  const discounted = products.filter(
    product =>
      product.discount_price != null &&
      Number(product.discount_price) > 0 &&
      Number(product.discount_price) < Number(product.price)
  );

  const deals = (discounted.length > 0 ? discounted : products).slice(0, 10);
  const popular = [...products].reverse().slice(0, 8);

  return (
    <View style={styles.screen}>
      <PageWash />

      <Header onMenu={() => setMenuOpen(true)} onSearch={() => router.replace('/products')} />

      {loading ? (
        <Loading />
      ) : error && products.length === 0 ? (
        <Problem error={error} onRetry={load} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.brandDeep}
            />
          }
        >
          <Pressable style={styles.search} onPress={() => router.replace('/products')}>
            <Text style={styles.searchMark}>⌕</Text>
            <Text style={styles.searchText}>گەڕان بۆ پۆشاک، جانتا…</Text>
          </Pressable>

          <Hero slides={slides} />

          <CategoryStrip categories={categories} />

          {deals.length > 0 && (
            <View style={styles.section}>
              <SectionHead title="کڕینی ئەمڕۆ" onAll={() => router.replace('/products')} />

              {/* A FlatList so `inverted` is available: a reversed ScrollView
                  opens scrolled to the wrong end, which on a right-to-left
                  page means the row starts at its last card. */}
              <FlatList
                horizontal
                inverted
                data={deals}
                keyExtractor={product => String(product.id)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
                renderItem={({ item }) => (
                  <View style={styles.rowCard}>
                    <ProductCard
                      product={item}
                      onPress={() => router.push(`/product/${item.id}`)}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {popular.length > 0 && (
            <View style={styles.section}>
              <SectionHead title="بەناوبانگترینەکان" onAll={() => router.replace('/products')} />

              <View style={styles.grid}>
                {popular.map(product => (
                  <View key={product.id} style={styles.gridCell}>
                    <ProductCard
                      product={product}
                      onPress={() => router.push(`/product/${product.id}`)}
                    />
                  </View>
                ))}
              </View>

              <View style={styles.all}>
                <PrimaryButton
                  label="بینینی سەرجەم بەرهەمەکان"
                  onPress={() => router.replace('/products')}
                />
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <TabBar />

      {/* After the tab bar, so the scrim covers it: a drawer that leaves the
          tabs live lets a shopper navigate from behind its own dimming. */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} categories={categories} />
    </View>
  );
}

function SectionHead({ title, onAll }: { title: string; onAll: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Pressable onPress={onAll} hitSlop={8}>
        <Text style={styles.all_}>هەمووی ←</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * The shop's banner slides, out of the settings map.
 *
 * Stored as JSON in a text column, so it arrives either already parsed or as a
 * string depending on how it was written. Anything unreadable means no banner,
 * which is the right outcome: the catalogue is the point of the screen.
 */
function parseSlides(raw: unknown): HeroSlide[] {
  if (!raw) return [];

  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? (value as HeroSlide[]) : [];
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingBottom: spacing.xxl },

  search: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  searchMark: { fontSize: 18, color: colors.textFaint },
  searchText: { flex: 1, ...typography.body, color: colors.textFaint, textAlign: 'right' },

  section: { marginTop: spacing.xl },
  sectionHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, lineHeight: 26 },
  all_: { ...typography.tiny, color: colors.brandText },

  row: { paddingHorizontal: spacing.md, gap: spacing.md },
  rowCard: { width: 168 },

  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  // Two up, with the gap taken out of each cell so the row does not overflow.
  gridCell: { width: '48%' },

  all: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
});
