import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { backoffice, displayPhone, type Paginated, type User } from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { Table, Titled, type Column } from '@/components/Table';
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
        <Table
          rows={list.data!.data}
          keyFor={user => String(user.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={COLUMNS}
        />
      )}

      <Text style={styles.total}>
        {list.data ? `${list.data.total} کڕیار` : ''}
      </Text>
    </Screen>
  );
}

// The panel's customer table: who, how to reach them, where they are.
const COLUMNS: Column<User>[] = [
  {
    title: 'ناو',
    width: 2,
    primary: true,
    render: user => (
      <Titled
        title={user.name || '—'}
        leading={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name || '?').slice(0, 1)}</Text>
          </View>
        }
      />
    ),
  },
  { title: 'مۆبایل', width: 1.4, align: 'center', render: user => displayPhone(user.phone) || '—' },
  { title: 'ئیمەیڵ', width: 2, render: user => user.email || '—' },
  { title: 'ناونیشان', width: 2, render: user => user.address || '—' },
];

const styles = StyleSheet.create({
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.small, color: colors.brand },
  total: { ...typography.tiny, color: colors.textFaint, textAlign: 'right', paddingVertical: spacing.sm },
});
