import { Pressable, StyleSheet, Text } from 'react-native';
import { Alert, backoffice, timeAgo, type Paginated, type Review } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { Table, Titled, type Column } from '@/components/Table';
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

  const canDelete = can('products.manage');

  // The panel's review table: who, how many stars, what they said, when.
  const columns: Column<Review>[] = [
    {
      title: 'نووسەر',
      width: 1.5,
      primary: true,
      render: review => (
        <Titled
          title={review.customer_name || 'میوان'}
          sub={review.verified_purchase ? 'کڕینی پشتڕاستکراو' : null}
        />
      ),
    },
    {
      title: 'هەڵسەنگاندن',
      width: 1,
      align: 'center',
      render: review => (
        <Text style={styles.stars}>
          {'★'.repeat(review.rating)}
          {'☆'.repeat(5 - review.rating)}
        </Text>
      ),
    },
    { title: 'بۆچوون', width: 3, render: review => review.comment || '—' },
    { title: 'بەروار', width: 1, align: 'center', render: review => timeAgo(review.created_at) },
    ...(canDelete
      ? [
          {
            title: 'کردار',
            width: 0.9,
            align: 'center' as const,
            render: (review: Review) => (
              <RowAction label="سڕینەوە" danger onPress={() => remove(review)} />
            ),
          },
        ]
      : []),
  ];

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
        <Table
          rows={list.data!.data}
          keyFor={review => String(review.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={columns}
        />
      )}

    </Screen>
  );
}

function RowAction({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[actionStyles.button, danger && actionStyles.danger]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={[actionStyles.text, danger && actionStyles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  danger: { backgroundColor: colors.dangerSoft },
  text: { ...typography.tiny, color: colors.brand },
  dangerText: { color: colors.danger },
});

const styles = StyleSheet.create({
  stars: { ...typography.body, color: colors.warning },
});
