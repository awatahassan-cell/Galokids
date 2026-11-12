import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { backoffice, timeAgo, type Paginated, type Review } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * What customers said about the clothes.
 *
 * A verified review — one left by somebody whose order actually contained the
 * product — is marked, because that is the difference between a customer's
 * opinion and a stranger's.
 */
export default function ReviewsScreen() {
  const { can } = useSession();
  const list = useFetch<Paginated<Review>>(() => backoffice.reviews({ limit: 100 }), []);
  const offline = useNeedsConnection(list.error);

  const remove = (review: Review) => {
    Alert.alert('سڕینەوە', 'ئەم هەڵسەنگاندنە بسڕدرێتەوە؟', [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بەڵێ',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteReview(review.id);
            list.refresh();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <Screen title="هەڵسەنگاندنەکان" subtitle="ڕای کڕیاران لەسەر بەرهەمەکان" scroll={false}>
      {offline ? (
        <NeedsConnection what="هەڵسەنگاندنەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.data.length ?? 0) === 0 ? (
        <Empty title="هێشتا هیچ هەڵسەنگاندنێک نییە" />
      ) : (
        <FlatList
          data={list.data!.data}
          keyExtractor={review => String(review.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onLongPress={() => (can('products.manage') ? remove(item) : undefined)}
            >
              <View style={styles.head}>
                <Text style={styles.stars}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>

                <View style={styles.headText}>
                  <Text style={styles.who}>{item.customer_name || 'میوان'}</Text>
                  <Text style={styles.when}>{timeAgo(item.created_at)}</Text>
                </View>

                {item.verified_purchase && (
                  <View style={styles.verified}>
                    <Text style={styles.verifiedText}>کڕینی پشتڕاستکراو</Text>
                  </View>
                )}
              </View>

              {item.comment && <Text style={styles.comment}>{item.comment}</Text>}
            </Pressable>
          )}
        />
      )}

      {can('products.manage') && (
        <Text style={styles.hint}>بۆ سڕینەوە، دەستت لەسەر هەڵسەنگاندنێک ڕاگرە.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.md },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  stars: { ...typography.body, color: colors.warning },
  who: { ...typography.small, color: colors.text, textAlign: 'right' },
  when: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  verified: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.pill, backgroundColor: colors.successSoft,
  },
  verifiedText: { ...typography.tiny, color: colors.success },
  comment: { ...typography.small, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
  hint: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },
});
