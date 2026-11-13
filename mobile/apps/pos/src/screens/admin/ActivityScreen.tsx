import {
  backoffice,
  formatDateTime,
  type ActivityLog,
  type Paginated,
} from '@galokids/core';
import { Empty, Loading, NeedsConnection, Problem, Screen } from '@/components/kit';
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
        <Table
          rows={list.data!.data}
          keyFor={entry => String(entry.id)}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          columns={COLUMNS}
        />
      )}
    </Screen>
  );
}

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
