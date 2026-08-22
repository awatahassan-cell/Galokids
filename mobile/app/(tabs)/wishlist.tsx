import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useCart } from '../../src/store/CartProvider';
import { fetchProduct } from '../../src/api/endpoints';
import type { Product } from '../../src/api/types';
import { ProductCard } from '../../src/components/ProductCard';
import { Button, EmptyState, Loading, T } from '../../src/components/ui';

const { width: SCREEN } = Dimensions.get('window');
const GAP = spacing.md;
const CARD = (SCREEN - spacing.lg * 2 - GAP) / 2;

/**
 * The saved list.
 *
 * Only the product ids are kept on the phone, and the products themselves are
 * fetched fresh — a shirt saved a month ago may since have changed price or
 * been withdrawn, and a saved list that shows an old price is worse than one
 * that takes a moment to load. Anything that has gone is dropped quietly.
 */
export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const { wishlist, ready } = useCart();

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ids: string[], signal: AbortSignal) => {
    if (ids.length === 0) {
      setItems([]);
      return;
    }

    const found = await Promise.all(
      ids.map(id => fetchProduct(id, signal).catch(() => null))
    );

    setItems(found.filter((product): product is Product => product !== null));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    load(wishlist, controller.signal).finally(() => setLoading(false));
    return () => controller.abort();
  }, [wishlist, ready, load]);

  if (loading && items.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Loading label={t('loading')} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <EmptyState
          emoji="💝"
          title={t('wishlistEmpty')}
          hint={t('wishlistEmptyHint')}
          action={<Button title={t('startShopping')} onPress={() => router.push('/shop' as never)} />}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.md }}>
      <T size="xl" weight="black" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        {t('wishlist')}
      </T>

      <FlashList
        data={items}
        keyExtractor={product => product.id}
        numColumns={2}
        estimatedItemSize={280}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View
            style={{
              width: CARD,
              marginBottom: GAP,
              [isRTL ? 'marginLeft' : 'marginRight']: index % 2 === 0 ? GAP : 0,
            }}
          >
            <ProductCard product={item} />
          </View>
        )}
      />
    </View>
  );
}
