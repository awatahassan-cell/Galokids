import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import {
  Alert,
  formatDateTime,
  formatIQD,
  shifts,
  shop,
  type CashMovement,
  type Shift,
  type ShiftSummary,
} from '@galokids/core';
import { Button, Loading, Row } from '@/components/kit';
import { printLabelSheet } from '@/labels/print';
import { storeInfo } from '@/print/receipt';
import { buildZReportHtml } from '@/print/zreport';
import { useFetch } from '@/state/useFetch';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Opening and closing a shift, and moving cash in and out of the drawer.
 *
 * The same three sheets are used on the till and on the shifts screen, so a
 * shift opened in one is closed in the other and the figures never differ.
 */

function Shell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  numeric,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  numeric?: boolean;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={numeric ? 'number-pad' : 'default'}
      textAlign="right"
    />
  );
}

/* ------------------------------------------------------------- open --- */

export function OpenShiftSheet({ onClose, onOpened }: { onClose: () => void; onOpened: (shift: Shift) => void }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const open = async () => {
    const value = Number(amount || 0);
    if (!Number.isFinite(value) || value < 0) {
      return Alert.alert('بڕی دەستپێک', 'بڕێکی دروست بنووسە.');
    }

    setBusy(true);
    try {
      onOpened(await shifts.open(value));
    } catch (error) {
      Alert.alert('نەتوانرا شیفت بکرێتەوە', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="کردنەوەی شیفت" onClose={onClose}>
      <Text style={styles.hint}>پێش فرۆشتن، ئەو پارەیە بنووسە کە لە دراوەرەکەدایە.</Text>
      <Field value={amount} onChange={setAmount} placeholder="بڕی دەستپێک" numeric />
      <Button label={busy ? 'دەکرێتەوە…' : 'کردنەوەی شیفت'} onPress={open} disabled={busy} />
    </Shell>
  );
}

/* -------------------------------------------------------------- cash --- */

export function CashSheet({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const movements = useFetch<CashMovement[]>(() => shifts.cashMovements(), []);

  const save = async () => {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('بڕ', 'بڕێکی دروست بنووسە.');
    if (!reason.trim()) return Alert.alert('هۆکار', 'هۆکارەکە بنووسە.');

    setBusy(true);
    try {
      await shifts.recordCash(direction, value, reason.trim());
      setAmount('');
      setReason('');
      movements.reload();
      onChanged();
    } catch (error) {
      Alert.alert('نەتوانرا تۆمار بکرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="پارە لە دراوەر" onClose={onClose}>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, direction === 'in' && styles.toggleOn]}
          onPress={() => setDirection('in')}
        >
          <Text style={[styles.toggleText, direction === 'in' && styles.toggleTextOn]}>پارە خرایە ناو دراوەر</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, direction === 'out' && styles.toggleOn]}
          onPress={() => setDirection('out')}
        >
          <Text style={[styles.toggleText, direction === 'out' && styles.toggleTextOn]}>پارە دەرچوو</Text>
        </Pressable>
      </View>

      <Field value={amount} onChange={setAmount} placeholder="بڕ" numeric />
      <Field value={reason} onChange={setReason} placeholder="هۆکار (نموونە: کرێی شوفێر)" />
      <Button label={busy ? '…' : 'تۆمارکردن'} onPress={save} disabled={busy} />

      <Text style={styles.section}>جوڵەکانی ئەم شیفتە</Text>
      {movements.loading && !movements.data ? (
        <Loading />
      ) : (movements.data?.length ?? 0) === 0 ? (
        <Text style={styles.hint}>هیچ جوڵەیەک نییە.</Text>
      ) : (
        movements.data!.map(move => (
          <View key={move.id} style={styles.move}>
            <Text style={[styles.moveAmount, { color: move.direction === 'in' ? colors.success : colors.danger }]}>
              {move.direction === 'in' ? '+' : '−'}
              {formatIQD(move.amount)}
            </Text>
            <View style={styles.moveText}>
              <Text style={styles.moveReason}>{move.reason}</Text>
              <Text style={styles.hint}>{formatDateTime(move.created_at)}</Text>
            </View>
          </View>
        ))
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------ close --- */

function Summary({ summary, counted }: { summary: ShiftSummary; counted?: number | null }) {
  const difference = counted != null ? counted - summary.expected_cash : null;

  return (
    <View style={styles.summary}>
      <Row label="بڕی دەستپێک" value={formatIQD(summary.opening_float)} />
      <Row label="ژمارەی فرۆشتنەکان" value={String(summary.orders_count)} />
      <Row label="فرۆشتنی نەقد" value={formatIQD(summary.cash_sales)} />
      <Row label="فرۆشتنی کارت" value={formatIQD(summary.card_sales)} />
      <Row label="کۆی فرۆشتن" value={formatIQD(summary.total_sales)} />
      <Row label="گەڕاندنەوەکان" value={formatIQD(-summary.refunds)} />
      <Row label="خرایە ناو دراوەر" value={formatIQD(summary.cash_in)} />
      <Row label="دەرچوو لە دراوەر" value={formatIQD(-summary.cash_out)} />
      <Row label="چاوەڕوانکراو لە دراوەر" value={formatIQD(summary.expected_cash)} />
      {counted != null ? <Row label="ژمێردراو" value={formatIQD(counted)} /> : null}
      {difference != null ? (
        <Row
          label={difference < 0 ? 'کەمی' : difference > 0 ? 'زیادی' : 'جیاوازی'}
          value={formatIQD(Math.abs(difference))}
        />
      ) : null}
    </View>
  );
}

export function CloseShiftSheet({ onClose, onClosed }: { onClose: () => void; onClosed: () => void }) {
  const { user } = useSession();
  const report = useFetch(() => shifts.report(), []);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ shift: Shift; summary: ShiftSummary; counted: number } | null>(null);

  const countedValue = counted.trim() === '' ? null : Number(counted);

  const print = async (summary: ShiftSummary, shift: Shift | undefined, value: number | null) => {
    try {
      const settings = await shop.settings().catch(() => ({}));
      await printLabelSheet(
        buildZReportHtml(summary, { shift, counted: value, cashier: user?.name, store: storeInfo(settings) })
      );
    } catch (error) {
      Alert.alert('نەتوانرا چاپ بکرێت', (error as Error).message);
    }
  };

  const close = async () => {
    if (countedValue == null || !Number.isFinite(countedValue) || countedValue < 0) {
      return Alert.alert('بڕی ژمێردراو', 'ئەو بڕە بنووسە کە لە دراوەرەکەدا ژمێردرا.');
    }

    setBusy(true);
    try {
      const result = await shifts.close(countedValue, note.trim() || undefined);
      setDone({ ...result, counted: countedValue });
      onClosed();
    } catch (error) {
      Alert.alert('نەتوانرا شیفت دابخرێت', (error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Shell title="شیفت داخرا" onClose={onClose}>
        <Summary summary={done.summary} counted={done.counted} />
        <View style={styles.actions}>
          <Button label="چاپکردنی ڕاپۆرتی Z" tone="quiet" onPress={() => print(done.summary, done.shift, done.counted)} />
          <Button label="تەواو" onPress={onClose} />
        </View>
      </Shell>
    );
  }

  return (
    <Shell title="داخستنی شیفت" onClose={onClose}>
      {report.loading && !report.data ? (
        <Loading />
      ) : report.data ? (
        <>
          <Summary summary={report.data.summary} counted={countedValue} />
          <Text style={styles.hint}>
            پارەی ناو دراوەرەکە بژمێرە و لێرە بنووسە. جیاوازییەکە تۆمار دەکرێت.
          </Text>
          <Field value={counted} onChange={setCounted} placeholder="بڕی ژمێردراو" numeric />
          <Field value={note} onChange={setNote} placeholder="تێبینی (ئارەزوومەندانە)" />
          <Button label={busy ? 'دادەخرێت…' : 'داخستنی شیفت'} tone="danger" onPress={close} disabled={busy} />
          <Button
            label="چاپی پێشبینی"
            tone="quiet"
            onPress={() => print(report.data!.summary, report.data!.shift, countedValue)}
          />
        </>
      ) : (
        <Text style={styles.hint}>هیچ شیفتێکی کراوە نییە.</Text>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.title, color: colors.text },
  close: { fontSize: 20, color: colors.textMuted },
  body: { padding: spacing.lg, gap: spacing.md },
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  section: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right', marginTop: spacing.sm },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  toggle: { flexDirection: 'row-reverse', gap: spacing.sm },
  toggleBtn: {
    flex: 1,
    minHeight: TOUCH_TARGET - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  toggleText: { ...typography.small, color: colors.textMuted },
  toggleTextOn: { color: '#fff' },
  move: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  moveText: { flex: 1, alignItems: 'flex-end' },
  moveReason: { ...typography.small, color: colors.text, textAlign: 'right' },
  moveAmount: { ...typography.heading },
  summary: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
});
