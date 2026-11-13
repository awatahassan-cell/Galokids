import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Alert, backoffice, displayPhone, formatIQD, type Supplier } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
import { Pill, Table, type Column } from '@/components/Table';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Who the shop buys from, and what it still owes them.
 *
 * The balance counts direct payments as well as purchases. Leaving those out
 * showed a debt the shop had already settled, which is the kind of error that
 * gets argued about at the door.
 */
export default function SuppliersScreen() {
  const [paying, setPaying] = useState<Supplier | null>(null);
  const list = useFetch<Supplier[]>(() => backoffice.suppliers(), []);
  const offline = useNeedsConnection(list.error);

  const owed = (list.data ?? []).reduce((sum, s) => sum + Math.max(0, Number(s.balance ?? 0)), 0);

  // Who the shop buys from, how to reach them, and what it still owes each.
  const columns: Column<Supplier>[] = [
    { title: 'دابینکەر', width: 2, primary: true, render: supplier => supplier.name },
    {
      title: 'مۆبایل',
      width: 1.3,
      align: 'center',
      render: supplier => displayPhone(supplier.phone) || '—',
    },
    { title: 'تێبینی', width: 2, render: supplier => supplier.notes || '—' },
    {
      title: 'قەرزی ماوە',
      width: 1.2,
      align: 'center',
      render: supplier => {
        const balance = Number(supplier.balance ?? 0);

        return (
          <Pill label={formatIQD(balance)} tone={balance > 0 ? 'bad' : 'good'} />
        );
      },
    },
    {
      title: 'کردار',
      width: 1.1,
      align: 'center',
      render: supplier =>
        Number(supplier.balance ?? 0) > 0 ? (
          <Pressable style={styles.payButton} onPress={() => setPaying(supplier)}>
            <Text style={styles.payButtonText}>پارەدان</Text>
          </Pressable>
        ) : (
          <Text style={styles.noAction}>—</Text>
        ),
    },
  ];

  return (
    <Screen title="دابینکەران" subtitle="هەژمار و قەرزەکان" scroll={false}>
      {offline ? (
        <NeedsConnection what="دابینکەران" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <Stat label="کۆی قەرز" value={formatIQD(owed)} tone={owed > 0 ? 'bad' : 'good'} />

          {(list.data?.length ?? 0) === 0 ? (
            <Empty title="هیچ دابینکەرێک نییە" />
          ) : (
            <Table
              rows={list.data!}
              keyFor={supplier => String(supplier.id)}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              columns={columns}
            />
          )}
        </>
      )}

      <PaymentSheet
        supplier={paying}
        onClose={() => setPaying(null)}
        onSaved={() => { setPaying(null); list.refresh(); }}
      />
    </Screen>
  );
}

function PaymentSheet({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  if (!supplier) return null;

  const save = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('بڕ', 'بڕێکی دروست بنووسە.');
      return;
    }

    setSaving(true);
    try {
      await backoffice.paySupplier(supplier.id, value);
      setAmount('');
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا تۆمار بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{supplier.name}</Text>
          <Text style={styles.sheetSub}>قەرزی ماوە: {formatIQD(Number(supplier.balance ?? 0))}</Text>

          <TextInput style={styles.input} placeholder="بڕی پارەدان"
            placeholderTextColor={colors.textFaint} keyboardType="number-pad"
            value={amount} onChangeText={setAmount} textAlign="right" />

          <View style={styles.sheetActions}>
            <Button label="داخستن" tone="quiet" onPress={onClose} />
            <Button label={saving ? 'تۆمار…' : 'تۆمارکردن'} onPress={save} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  payButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  payButtonText: { color: '#fff', ...typography.tiny },
  noAction: { ...typography.small, color: colors.textFaint },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm,
  },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  sheetSub: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, ...typography.body, color: colors.text,
  },
  sheetActions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.sm },
});
