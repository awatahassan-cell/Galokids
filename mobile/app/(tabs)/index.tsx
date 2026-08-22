import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useShop } from '../../src/store/ShopProvider';
import { useDeepLinks } from '../../src/hooks/useDeepLinks';
import { fetchBestSellers, fetchProducts } from '../../src/api/endpoints';
import type { Category, Product } from '../../src/api/types';
import { HeroCarousel } from '../../src/components/HeroCarousel';
import { ProductCard } from '../../src/components/ProductCard';
import { CategoryBubble } from '../../src/components/CategoryBubble';
import { Row, T } from '../../src/components/ui';

const { width: SCREEN } = Dimensions.get('window');
const GRID_GAP = spacing.md;
const GRID_CARD = (SCREEN - spacing.lg * 2 - GRID_GAP) / 2;
const ROW_CARD = 158;

function SectionHeader({ title, onSeeAll, seeAllLabel }: { title: string; onSeeAll?: () => void; seeAllLabel: string }) {
  return (
    <Row justify="space-between" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
      <T size="lg" weight="black">
        {title}
      </T>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <T size="sm" weight="black" color={colors.candy[700]}>
            {seeAllLabel}
          </T>
        </Pressable>
      ) : null}
    </Row>
  );
}

/**
 * The home screen, laid out for a phone: search, the shop's banner, a row of
 * categories, then the products worth showing first.
 *
 * Everything above the product rows is driven by what the shop has configured
 * — its logo, its banners, its categories — so the app changes with the admin
 * panel rather than with an app release.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, pick, language, isRTL } = useLanguage();
  const { categories, settings, refresh } = useShop();

  useDeepLinks();

  const [deals, setDeals] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    // Three independent requests, run together rather than in sequence: on a
    // phone connection the difference between 1.2s and 3.6s is the difference
    // between a home screen and a loading screen.
    const [bestSellers, newest] = await Promise.all([
      fetchBestSellers(10, signal).catch(() => [] as Product[]),
      fetchProducts({ limit: 12, page: 1, signal }).then(r => r.data).catch(() => [] as Product[]),
    ]);

    setPopular(bestSellers);
    setLatest(newest);
    setDeals(newest.filter(p => p.discountPrice && p.discountPrice > 0).slice(0, 10));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).finally(() => setLoading(false));
    return () => controller.abort();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), load()]);
    setRefreshing(false);
  }, [refresh, load]);

  const storeName = settings.storeName || 'Galo Kids';

  const shownCategories = useMemo(
    () => categories.filter(category => category.name).slice(0, 10),
    [categories]
  );

  const openCategory = useCallback(
    (category: Category) => router.push(`/shop?category=${encodeURIComponent(category.id)}` as never),
    [router]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing['3xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.candy[500]} />
      }
    >
      {/* Brand row */}
      <Row justify="space-between" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <Row gap={spacing.sm}>
          {settings.storeLogo ? (
            <Image
              source={settings.storeLogo}
              style={{ width: 38, height: 38, borderRadius: radius.md }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
          <T size="lg" weight="black">
            {storeName}
          </T>
        </Row>
      </Row>

      {/* Search — a button, not a field: typing happens on the shop screen,
          where the results appear. A field here that navigates away on the
          first keystroke loses the keystroke. */}
      <Pressable
        onPress={() => router.push('/shop?focus=1' as never)}
        style={{
          marginHorizontal: spacing.lg,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        <Row gap={spacing.md}>
          <T size="base" color={colors.slate[400]}>
            🔍
          </T>
          <T size="sm" weight="bold" color={colors.slate[400]}>
            {t('searchPlaceholder')}
          </T>
        </Row>
      </Pressable>

      <HeroCarousel />

      {shownCategories.length > 0 ? (
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader
            title={t('categories')}
            seeAllLabel={t('seeAll')}
            onSeeAll={() => router.push('/shop' as never)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              gap: spacing.lg,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}
          >
            {shownCategories.map(category => (
              <CategoryBubble
                key={category.id}
                label={pick(category.nameKu, category.nameAr, category.name) || category.name}
                icon={category.icon}
                onPress={() => openCategory(category)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {deals.length > 0 ? (
        <View style={{ marginTop: spacing['2xl'] }}>
          <SectionHeader
            title={t('dealsToday')}
            seeAllLabel={t('seeAll')}
            onSeeAll={() => router.push('/shop?sale=1' as never)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              gap: GRID_GAP,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}
          >
            {deals.map(product => (
              <ProductCard key={product.id} product={product} width={ROW_CARD} compact />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {popular.length > 0 ? (
        <View style={{ marginTop: spacing['2xl'] }}>
          <SectionHeader
            title={t('popular')}
            seeAllLabel={t('seeAll')}
            onSeeAll={() => router.push('/shop' as never)}
          />
          <View
            style={{
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: GRID_GAP,
            }}
          >
            {popular.slice(0, 6).map(product => (
              <ProductCard key={product.id} product={product} width={GRID_CARD} />
            ))}
          </View>
        </View>
      ) : null}

      {latest.length > 0 ? (
        <View style={{ marginTop: spacing['2xl'] }}>
          <SectionHeader
            title={t('newArrivals')}
            seeAllLabel={t('seeAll')}
            onSeeAll={() => router.push('/shop' as never)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              gap: GRID_GAP,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}
          >
            {latest.map(product => (
              <ProductCard key={product.id} product={product} width={ROW_CARD} compact />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {!loading && popular.length === 0 && latest.length === 0 ? (
        <View style={{ padding: spacing['3xl'], alignItems: 'center' }}>
          <T size="base" weight="bold" color={colors.slate[400]} center>
            {t('somethingWrong')}
          </T>
        </View>
      ) : null}

      {/* The four promises, the same ones the website makes. */}
      <View
        style={{
          margin: spacing.lg,
          marginTop: spacing['2xl'],
          padding: spacing.xl,
          borderRadius: radius['2xl'],
          backgroundColor: colors.bubble[50],
          borderWidth: 1,
          borderColor: colors.bubble[200],
          gap: spacing.md,
        }}
      >
        {(
          [
            ['🚚', t('deliveryNationwide')],
            ['💵', t('cashOnDelivery')],
            ['↩️', t('returns14')],
            ['🧵', t('naturalFabric')],
          ] as const
        ).map(([emoji, label]) => (
          <Row key={label} gap={spacing.md}>
            <T size="base">{emoji}</T>
            <T size="sm" weight="bold" color={colors.slate[700]} style={{ flex: 1 }}>
              {label}
            </T>
          </Row>
        ))}
      </View>
    </ScrollView>
  );
}
