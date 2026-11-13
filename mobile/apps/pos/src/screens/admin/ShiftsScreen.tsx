import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDateTime, formatIQD, shifts, type Shift } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Row, Screen } from '@/components/kit';
import { CashSheet, CloseShiftSheet, OpenShiftSheet } from '@/components/ShiftModals';
import { Pill, Table, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { useSync } from '@/state/useSync';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * The drawer.
 *
 * Opening a shift records what cash was in it; closing it records what was
 * counted at the end. The gap between that and what the till says it took is
 * the number a shop actually cares about, and it only exists if both ends are
 * recorded.
 *
 * Deliberately online-only. A shift is the shop's cash reconciliation, two
 * tills can be open at once, and a device guessing at that from its own slice
 * would produce a figure that looks authoritative and is not.
 */
export default function ShiftsScreen() {
  const { online } = useSync();
  const [sheet, setSheet] = useState<'open' | 'close' | 'cash' | null>(null);

  // `/shifts/current` answers `{}` rather than null when there is none, and an
  // empty object is truthy — so the open shift is recognised by its id, not by
  // the response being non-null.
  const current = useFetch(() => shifts.current(), []);
  const history = useFetch<Shift[]>(() => shifts.list({ limit: 25 }), []);

  const openShiftRecord = (current.data && 'id' in current.data ? current.data : null) as Shift | null;

  const offline = !online || useNeedsConnection(current.error);

  const changed = () => {
    current.reload();
    history.refresh();
  };

  return (
    <Screen title="شیفتەکان" subtitle="کردنەوە، داخستن و ژماردنی دراوەر" onRefresh={current.refresh} refreshing={current.refreshing}>
      {offline ? (
        <NeedsConnection what="شیفتەکان" />
      ) : current.loading && !current.data ? (
        <Loading />
      ) : current.error ? (
        <Problem error={current.error} onRetry={current.reload} />
      ) : openShiftRecord && openShiftRecord.status === 'open' ? (
        <View style={styles.panel}>
          <View style={styles.openBadge}>
            <Text style={styles.openBadgeText}>شیفت کراوەیە</Text>
          </View>

          <Row label="کراوەتەوە" value={formatDateTime(openShiftRecord.opened_at)} />
          <Row label="بڕی دەستپێک" value={formatIQD(openShiftRecord.opening_float)} />

          <View style={styles.actions}>
            <Button label="پارە لە دراوەر" tone="quiet" onPress={() => setSheet('cash')} />
            <Button label="داخستنی شیفت" tone="danger" onPress={() => setSheet('close')} />
          </View>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.prompt}>
            هیچ شیفتێکی کراوە نییە. پێش دەستپێکردنی فرۆشتن، ئەو پارەیە بنووسە کە لە دراوەرەکەدایە.
          </Text>

          <Button label="کردنەوەی شیفت" onPress={() => setSheet('open')} />
        </View>
      )}

      {!offline && (
        <>
          <Text style={styles.sectionTitle}>شیفتە پێشووەکان</Text>

          {history.loading && !history.data ? (
            <Loading />
          ) : (history.data?.length ?? 0) === 0 ? (
            <Empty title="هێشتا هیچ شیفتێک نییە" />
          ) : (
            <Table
              inline
              rows={history.data ?? []}
              keyFor={shift => String(shift.id)}
              columns={HISTORY}
            />
          )}
        </>
      )}

      {sheet === 'open' && (
        <OpenShiftSheet
          onClose={() => setSheet(null)}
          onOpened={() => {
            setSheet(null);
            changed();
          }}
        />
      )}
      {sheet === 'cash' && <CashSheet onClose={() => setSheet(null)} onChanged={() => {}} />}
      {sheet === 'close' && <CloseShiftSheet onClose={() => setSheet(null)} onClosed={changed} />}
    </Screen>
  );
}

// Every drawer that has been opened: whose, from when to when, what was in it
// at each end, and the gap between the two — which is the number that matters.
const HISTORY: Column<Shift>[] = [
  {
    title: 'کاشێر',
    width: 1.5,
    primary: true,
    render: shift => shift.user?.name ?? `کارمەند #${shift.user_id}`,
  },
  { title: 'کردنەوە', width: 1.3, render: shift => formatDateTime(shift.opened_at) },
  {
    title: 'داخستن',
    width: 1.3,
    render: shift => (shift.closed_at ? formatDateTime(shift.closed_at) : '—'),
  },
  {
    title: 'پارەی سەرەتا',
    width: 1.1,
    align: 'center',
    render: shift => formatIQD(shift.opening_float),
  },
  {
    title: 'ژمێردراو',
    width: 1.1,
    align: 'center',
    render: shift => (shift.counted_cash != null ? formatIQD(shift.counted_cash) : '—'),
  },
  {
    title: 'چاوەڕوانکراو',
    width: 1.1,
    align: 'center',
    render: shift => (shift.expected_cash != null ? formatIQD(shift.expected_cash) : '—'),
  },
  {
    title: 'جیاوازی',
    width: 1.1,
    align: 'center',
    render: shift => {
      if (shift.status === 'open' || shift.difference == null) return <Pill label="کراوەیە" tone="info" />;

      // The server's own figure: counted minus what the till expected, which
      // includes sales, refunds and cash in and out. The old column took
      // closing minus the opening float and so called every shift "up".
      const difference = shift.difference;

      return (
        <Pill
          label={`${difference >= 0 ? '+' : ''}${formatIQD(difference)}`}
          tone={difference < 0 ? 'bad' : 'good'}
        />
      );
    },
  },
];

const styles = StyleSheet.create({
  panel: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  openBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  openBadgeText: { ...typography.small, color: colors.success },
  prompt: { ...typography.small, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
  actions: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text, textAlign: 'right', marginTop: spacing.md },
});
