import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { backoffice, displayPhone, type Paginated, type User } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * The shop's customers.
 *
 * Filtered to role 0 on purpose: staff accounts are managed on their own
 * screen, where permissions are the point. Mixing them put a cashier's account
 * in the middle of a customer list and made it easy to edit the wrong one.
 */
export default function CustomersScreen() {
  const [search, setSearch] = useState('');

  const list = useFetch<Paginated<User>>(
    () => backoffice.users({ role: 0, search: search.trim() || undefined, limit: 50 }),
    [search]
  );

  const offline = useNeedsConnection(list.error);

  return (
    <Screen title="کڕیاران" subtitle="هەموو ئەوانەی هەژماریان هەیە" scroll={false}>
      <SearchField value={search} onChange={setSearch} placeholder="ناو، مۆبایل یان ئیمەیڵ…" />

      {offline ? (
        <NeedsConnection what="لیستی کڕیاران" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (list.data?.data.length ?? 0) === 0 ? (
        <Empty title="هیچ کڕیارێک نەدۆزرایەوە" />
      ) : (
        <FlatList
          data={list.data!.data}
          keyExtractor={user => String(user.id)}
          contentContainerStyle={styles.list}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.name || '?').slice(0, 1)}</Text>
              </View>

              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.contact} numberOfLines={1}>
                  {[displayPhone(item.phone), item.email].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <Text style={styles.total}>
        {list.data ? `${list.data.total} کڕیار` : ''}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 38, height: 38, borderRadius: radius.pill,
    backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.heading, color: colors.brand },
  rowBody: { flex: 1 },
  name: { ...typography.body, color: colors.text, textAlign: 'right' },
  contact: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  total: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },
});
