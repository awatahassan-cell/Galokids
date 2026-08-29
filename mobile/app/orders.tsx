import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../src/theme';
import { useLanguage } from '../src/i18n/LanguageProvider';
import { useAuth } from '../src/store/AuthProvider';
import { fetchMyOrders } from '../src/api/endpoints';
import type { Order } from '../src/api/types';
import { formatPrice } from '../src/utils/money';
import { OrderStatusPill } from '../src/components/OrderStatusPill';
import { Button, Card, EmptyState, Loading, Row, T } from '../src/components/ui';

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, isRTL } = useLanguage();
  const { isSignedIn, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const result = await fetchMyOrders(nextPage);
      setOrders(prev => (replace ? result.data : [...prev, ...result.data]));
      setPage(result.currentPage);
      setLastPage(result.lastPage);
    } catch {
      if (replace) setOrders([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    load(1, true);
  }, [authLoading, isSignedIn, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  }, [load]);

  if (authLoading || loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Loading label={t('loading')} />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <EmptyState
          emoji="🔐"
          title={t('signInToContinue')}
          action={
            <Button title={t('signIn')} onPress={() => router.push('/auth/sign-in?next=/orders' as never)} />
          }
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <Row style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }} gap={spacing.md}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <T size="lg" weight="black" color={colors.slate[700]}>
            {isRTL ? '→' : '←'}
          </T>
        </Pressable>
        <T size="xl" weight="black">
          {t('myOrders')}
        </T>
      </Row>

      {orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title={t('noOrders')}
          action={<Button title={t('startShopping')} onPress={() => router.push('/shop' as never)} />}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={order => order.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.candy[500]} />
          }
          onEndReached={() => {
            if (!loadingMore && page < lastPage) load(page + 1, false);
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: spacing.xl }}>
                <ActivityIndicator color={colors.candy[500]} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/order/${item.id}` as never)}>
              <Card style={{ padding: spacing.lg, gap: spacing.md }}>
                <Row justify="space-between">
                  <T size="sm" weight="black">
                    #{item.invoiceNo || item.id}
                  </T>
                  <OrderStatusPill status={item.status} />
                </Row>

                <Row justify="space-between">
                  <T size="xs" weight="bold" color={colors.slate[500]}>
                    {new Date(item.date).toLocaleDateString(
                      language === 'en' ? 'en-GB' : 'ar-IQ'
                    )}
                  </T>
                  <T size="sm" weight="black" color={colors.candy[700]}>
                    {formatPrice(item.totalAmount, language)}
                  </T>
                </Row>

                {item.returnedQuantity && item.returnedQuantity > 0 ? (
                  <View
                    style={{
                      backgroundColor: colors.rose[50],
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 4,
                      alignSelf: isRTL ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <T size="xs" weight="black" color={colors.rose[700]}>
                      {item.fullyReturned
                        ? t('statusReturned')
                        : `${t('statusReturned')} ${item.returnedQuantity}/${item.totalQuantity}`}
                    </T>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
