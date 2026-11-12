import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDateTime, formatIQD, orders, type Order } from '@galokids/core';
import { Empty, Loading, Problem, StatusPill, TabBar } from '@/components/ui';
import { useAccount } from '@/state/useAccount';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Everything this customer has ordered.
 *
 * `mine` is the whole point of the parameter: the orders endpoint serves the
 * back office too, and without it a customer's request would be answered with
 * whatever their role is allowed to see. The server decides what `mine` means
 * from the token, not from anything the app sends, so there is nothing here a
 * shopper could change to see somebody else's orders.
 */
export default function MyOrdersScreen() {
  const router = useRouter();
  const { user, loading: accountLoading } = useAccount();

  const [list, setList] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    try {
      setError(null);

      const response = await orders.list({ mine: true, page: nextPage, limit: 20 });

      setList(previous => (replace ? response.data : [...previous, ...response.data]));
      setPage(response.current_page);
      setLastPage(response.last_page);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) load(1, true);
    else if (!accountLoading) setLoading(false);
  }, [user, accountLoading, load]);

  // Not signed in: there is no list to show and no point pretending otherwise.
  if (!user && !accountLoading) {
    return (
      <View style={styles.screen}>
        <Header title="داواکارییەکانم" />
        <Empty
          mark="🔑"
          title="بۆ بینینی داواکارییەکانت بچۆ ژوورەوە"
          body="یان ئەگەر بەبێ هەژمار داوات کردووە، بە ژمارەی داواکاری شوێنی بکەوە."
          action={{ label: 'چوونەژوورەوە', onPress: () => router.push('/sign-in?next=/orders') }}
        />
        <Pressable style={styles.secondary} onPress={() => router.push('/track')}>
          <Text style={styles.secondaryText}>شوێنکەوتنی داواکاری بە ژمارە</Text>
        </Pressable>
        <TabBar />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title="داواکارییەکانم" subtitle={user?.name ?? undefined} />

      {loading || accountLoading ? (
        <Loading />
      ) : error && list.length === 0 ? (
        <Problem error={error} onRetry={() => load(1, true)} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={order => String(order.id)}
          contentContainerStyle={styles.list}
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
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && page < lastPage) load(page + 1, false);
          }}
          ListEmptyComponent={
            <Empty
              mark="🛍️"
              title="هێشتا هیچ داواکارییەک نییە"
              body="هەرچی داوا بکەیت لێرە دەردەکەوێت."
              action={{ label: 'بڕۆ بۆ فرۆشگا', onPress: () => router.replace('/') }}
            />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/orders/${item.id}`)}>
              <View style={styles.cardTop}>
                <Text style={styles.number}>#{item.invoice_no ?? item.id}</Text>
                <StatusPill status={item.status} />
              </View>

              <Text style={styles.when}>{formatDateTime(item.created_at)}</Text>

              <View style={styles.cardBottom}>
                <Text style={styles.items}>
                  {item.items?.length ?? 0} بەرهەم
                </Text>
                <Text style={styles.total}>{formatIQD(item.total_amount)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <TabBar />
    </View>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable style={styles.track} onPress={() => router.push('/track')} hitSlop={8}>
        <Text style={styles.trackText}>شوێنکەوتن</Text>
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
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
  track: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  trackText: { ...typography.tiny, color: colors.brand },

  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  number: { ...typography.heading, color: colors.text },
  when: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  cardBottom: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  items: { ...typography.small, color: colors.textMuted },
  total: { ...typography.title, color: colors.brand },

  secondary: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.small, color: colors.brand },
});
