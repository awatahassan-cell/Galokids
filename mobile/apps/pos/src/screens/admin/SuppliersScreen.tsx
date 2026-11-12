import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { backoffice, displayPhone, formatIQD, type Supplier } from '@galokids/core';
import { Button, Empty, Loading, NeedsConnection, Problem, Screen, Stat } from '@/components/kit';
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
            <FlatList
              data={list.data!}
              keyExtractor={supplier => String(supplier.id)}
              contentContainerStyle={styles.list}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              renderItem={({ item }) => {
                const balance = Number(item.balance ?? 0);

                return (
                  <Pressable style={styles.card} onPress={() => balance > 0 && setPaying(item)}>
                    <View style={styles.head}>
                      <Text style={[styles.balance, balance > 0 ? styles.owing : styles.clear]}>
                        {formatIQD(balance)}
                      </Text>

                      <View style={styles.headText}>
                        <Text style={styles.name}>{item.name}</Text>
                        {item.phone && <Text style={styles.phone}>{displayPhone(item.phone)}</Text>}
                      </View>
                    </View>

                    {balance > 0 && <Text style={styles.hint}>کلیک بکە بۆ تۆمارکردنی پارەدان</Text>}
                  </Pressable>
                );
              }}
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
  list: { gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.xs,
  },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  name: { ...typography.heading, color: colors.text, textAlign: 'right' },
  phone: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  balance: { ...typography.heading, ...typography.mono },
  owing: { color: colors.danger },
  clear: { color: colors.success },
  hint: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },

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
