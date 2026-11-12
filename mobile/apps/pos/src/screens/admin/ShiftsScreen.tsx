import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatDateTime, formatIQD, shifts, type Shift } from '@galokids/core';
import {
  Button,
  Empty,
  Loading,
  NeedsConnection,
  Problem,
  Row,
  Screen,
  Stat,
} from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { useSync } from '@/state/useSync';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

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
  const [busy, setBusy] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [countedAmount, setCountedAmount] = useState('');

  // `/shifts/current` answers `{}` rather than null when there is none, and an
  // empty object is truthy — so the open shift is recognised by its id, not by
  // the response being non-null.
  const current = useFetch(() => shifts.current(), []);
  const history = useFetch<Shift[]>(() => shifts.list({ limit: 25 }), []);

  const openShiftRecord = (current.data && 'id' in current.data ? current.data : null) as Shift | null;

  const offline = !online || useNeedsConnection(current.error);

  const openShift = async () => {
    const value = Number(openingFloat || 0);
    if (!Number.isFinite(value) || value < 0) {
      Alert.alert('بڕی دەستپێک', 'بڕێکی دروست بنووسە.');
      return;
    }

    setBusy(true);
    try {
      await shifts.open(value);
      setOpeningFloat('');
      current.reload();
      history.refresh();
    } catch (error) {
      Alert.alert('نەتوانرا بکرێتەوە', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const closeShift = async () => {
    const value = Number(countedAmount);
    if (!Number.isFinite(value) || value < 0) {
      Alert.alert('بڕی ژمێردراو', 'ئەو بڕە بنووسە کە لە دراوەرەکەدا ژمێردرا.');
      return;
    }

    setBusy(true);
    try {
      await shifts.close(value);
      setCountedAmount('');
      current.reload();
      history.refresh();
    } catch (error) {
      Alert.alert('نەتوانرا دابخرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
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

          <Text style={styles.prompt}>
            پارەی ناو دراوەرەکە بژمێرە و بڕەکەی لێرە بنووسە. جیاوازییەکە تۆمار دەکرێت.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="بڕی ژمێردراو"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={countedAmount}
            onChangeText={setCountedAmount}
            textAlign="right"
          />

          <Button label={busy ? 'دادەخرێت…' : 'داخستنی شیفت'} tone="danger" onPress={closeShift} disabled={busy} />
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.prompt}>
            هیچ شیفتێکی کراوە نییە. پێش دەستپێکردنی فرۆشتن، ئەو پارەیە بنووسە کە لە دراوەرەکەدایە.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="بڕی دەستپێک"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={openingFloat}
            onChangeText={setOpeningFloat}
            textAlign="right"
          />

          <Button label={busy ? 'دەکرێتەوە…' : 'کردنەوەی شیفت'} onPress={openShift} disabled={busy} />
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
            <View style={styles.list}>
              {(history.data ?? []).map(shift => {
                const difference =
                  shift.closing_amount != null ? shift.closing_amount - shift.opening_float : null;

                return (
                  <View key={shift.id} style={styles.historyRow}>
                    <View style={styles.historyBody}>
                      <Text style={styles.historyWho}>{shift.user_name ?? `کارمەند #${shift.user_id}`}</Text>
                      <Text style={styles.historyWhen}>
                        {formatDateTime(shift.opened_at)}
                        {shift.closed_at ? ` → ${formatDateTime(shift.closed_at)}` : ' — کراوە'}
                      </Text>
                    </View>

                    {difference != null && (
                      <Text
                        style={[
                          styles.difference,
                          { color: difference < 0 ? colors.danger : colors.success },
                        ]}
                      >
                        {difference >= 0 ? '+' : ''}
                        {formatIQD(difference)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

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
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  sectionTitle: { ...typography.heading, color: colors.text, textAlign: 'right', marginTop: spacing.md },
  list: { gap: spacing.xs },
  historyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyBody: { flex: 1 },
  historyWho: { ...typography.small, color: colors.text, textAlign: 'right' },
  historyWhen: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  difference: { ...typography.heading, ...typography.mono },
});
