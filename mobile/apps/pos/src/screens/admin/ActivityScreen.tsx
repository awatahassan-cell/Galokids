import { FlatList, StyleSheet, Text, View } from 'react-native';
import { backoffice, timeAgo, type ActivityLog, type Paginated } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Who changed what.
 *
 * The answer to "the price was different yesterday". Price, cost and role
 * changes are recorded by the server as they happen, so this is a read-only
 * view of a record the app cannot alter.
 */
export default function ActivityScreen() {
  const list = useFetch<Paginated<ActivityLog>>(() => backoffice.activity({ limit: 100 }), []);
  const offline = useNeedsConnection(list.error);

  return (
    <Screen title="تۆماری چالاکی" subtitle="کێ چی گۆڕی، و کەی" scroll={false}>
      {offline ? (
        <NeedsConnection what="تۆماری چالاکی" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.data.length ?? 0) === 0 ? (
        <Empty title="هێشتا هیچ تۆمارێک نییە" />
      ) : (
        <FlatList
          data={list.data!.data}
          keyExtractor={entry => String(entry.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.action}>{item.description || item.action}</Text>
                <Text style={styles.meta}>
                  {[item.user_name, timeAgo(item.created_at)].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  row: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  rowBody: { gap: 2 },
  action: { ...typography.small, color: colors.text, textAlign: 'right' },
  meta: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
});
