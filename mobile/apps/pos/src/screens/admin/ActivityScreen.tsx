import { useState } from 'react';
import {
  backoffice,
  formatDateTime,
  type ActivityLog,
  type Paginated,
} from '@galokids/core';
import { Chips, Empty, Loading, NeedsConnection, Problem, Screen, SearchField } from '@/components/kit';
import { DateRange, sendable, type Range } from '@/components/DateRange';
import { Pill, Table, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';

/**
 * Who changed what.
 *
 * The answer to "the price was different yesterday". Price, cost and role
 * changes are recorded by the server as they happen, so this is a read-only
 * view of a record the app cannot alter.
 */
export default function ActivityScreen() {
  const [kind, setKind] = useState('');
  const [term, setTerm] = useState('');
  const [range, setRange] = useState<Range>({ from: '', to: '' });

  const list = useFetch<Paginated<ActivityLog>>(
    () => backoffice.activity({ limit: 100, action: kind || undefined, ...sendable(range) }),
    [kind, range.from, range.to]
  );
  const offline = useNeedsConnection(list.error);

  // The action is matched by its prefix on the server; the words typed here
  // narrow the page on screen.
  const needle = term.trim().toLowerCase();
  const rows = (list.data?.data ?? []).filter(
    entry => !needle || `${entry.user_name ?? ''} ${entry.action} ${entry.summary ?? ''}`.toLowerCase().includes(needle)
  );

  return (
    <Screen title="تۆماری چالاکی" subtitle="کێ چی گۆڕی، و کەی" scroll={false}>
      <SearchField value={term} onChange={setTerm} placeholder="گەڕان بە ناو، چالاکی یان وردەکاری…" />
      <DateRange value={range} onChange={setRange} />
      <Chips value={kind} onChange={setKind} options={KINDS} />

      {offline ? (
        <NeedsConnection what="تۆماری چالاکی" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : rows.length === 0 ? (
        <Empty title="هێشتا هیچ تۆمارێک نییە" />
      ) : (
        <Table
          rows={rows}
          keyFor={entry => String(entry.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={COLUMNS}
        />
      )}
    </Screen>
  );
}

const KINDS = [
  { id: '', label: 'هەموو کردارەکان' },
  { id: 'order', label: 'داواکاری' },
  { id: 'product', label: 'بەرهەم' },
  { id: 'stock', label: 'ستۆک' },
  { id: 'purchase', label: 'کڕین' },
  { id: 'coupon', label: 'کوپۆن' },
  { id: 'settings', label: 'ڕێکخستن' },
  { id: 'user', label: 'بەکارهێنەر' },
  { id: 'cash', label: 'دراوەر' },
];

// The panel's activity log: when, who, what kind of thing, and what happened.
const COLUMNS: Column<ActivityLog>[] = [
  { title: 'بەروار', width: 1.2, render: entry => formatDateTime(entry.created_at) },
  { title: 'بەکارهێنەر', width: 1.2, render: entry => entry.user_name || '—' },
  {
    title: 'چالاکی',
    width: 1.2,
    align: 'center',
    render: entry => <Pill label={entry.action} tone="neutral" />,
  },
  {
    title: 'وردەکاری',
    width: 3.4,
    primary: true,
    render: entry => entry.summary || entry.action,
  },
];
