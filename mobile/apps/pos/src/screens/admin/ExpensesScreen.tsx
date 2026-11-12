import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  backoffice,
  formatDay,
  formatIQD,
  presetRanges,
  type Expense,
  type Paginated,
} from '@galokids/core';
import {
  Button,
  Chips,
  Empty,
  Loading,
  NeedsConnection,
  Problem,
  Screen,
  Stat,
} from '@/components/kit';
import { useFetch, useNeedsConnection } from '@/state/useFetch';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * What the shop spent.
 *
 * Rent, wages, a delivery, a repair — the figures that turn takings into
 * profit. The daily report already subtracts them, so anything missing here
 * makes the shop look more profitable than it is, and recording one has to be
 * quick enough that it actually happens.
 */
export default function ExpensesScreen() {
  const ranges = presetRanges();
  const [key, setKey] = useState<keyof typeof ranges>('month');
  const range = ranges[key]!;

  const [composing, setComposing] = useState(false);

  const list = useFetch<Paginated<Expense>>(
    () => backoffice.expenses({ from: range.from, to: range.to, limit: 100 }),
    [range.from, range.to]
  );

  const offline = useNeedsConnection(list.error);
  const total = (list.data?.data ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0);

  const remove = (expense: Expense) => {
    Alert.alert('سڕینەوە', `«${expense.description}» بسڕدرێتەوە؟`, [
      { text: 'نەخێر', style: 'cancel' },
      {
        text: 'بەڵێ',
        style: 'destructive',
        onPress: async () => {
          try {
            await backoffice.deleteExpense(expense.id);
            list.refresh();
          } catch (error) {
            Alert.alert('نەتوانرا بسڕدرێتەوە', (error as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <Screen
      title="خەرجییەکان"
      subtitle={`${formatDay(range.from)} — ${formatDay(range.to)}`}
      scroll={false}
      actions={<Button label="زیادکردن" onPress={() => setComposing(true)} />}
    >
      <Chips
        value={key as string}
        onChange={next => setKey(next as keyof typeof ranges)}
        options={Object.entries(ranges).map(([id, value]) => ({ id, label: value.label }))}
      />

      {offline ? (
        <NeedsConnection what="خەرجییەکان" />
      ) : list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <Problem error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <View style={styles.stats}>
            <Stat label="کۆی خەرجی" value={formatIQD(total)} tone="bad" />
            <Stat label="ژمارە" value={String(list.data?.data.length ?? 0)} />
          </View>

          {(list.data?.data.length ?? 0) === 0 ? (
            <Empty title="هیچ خەرجییەک تۆمار نەکراوە" body="لەم ماوەیەدا هیچ خەرجییەک نییە." />
          ) : (
            <FlatList
              data={list.data!.data}
              keyExtractor={expense => String(expense.id)}
              contentContainerStyle={styles.list}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onLongPress={() => remove(item)}>
                  <Text style={styles.amount}>{formatIQD(item.amount)}</Text>

                  <View style={styles.rowBody}>
                    <Text style={styles.description} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={styles.meta}>
                      {[item.category, formatDay(item.spent_on ?? item.created_at)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}

          <Text style={styles.hint}>بۆ سڕینەوە، دەستت لەسەر خەرجییەک ڕاگرە.</Text>
        </>
      )}

      <ExpenseComposer
        visible={composing}
        onClose={() => setComposing(false)}
        onSaved={() => {
          setComposing(false);
          list.refresh();
        }}
      />
    </Screen>
  );
}

function ExpenseComposer({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(amount);

    if (!description.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('ناتەواو', 'ناونیشان و بڕێکی دروست پێویستە.');
      return;
    }

    setSaving(true);

    try {
      await backoffice.saveExpense({
        description: description.trim(),
        amount: value,
        category: category.trim() || null,
      });

      setDescription('');
      setAmount('');
      setCategory('');
      onSaved();
    } catch (error) {
      Alert.alert('نەتوانرا پاشەکەوت بکرێت', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>خەرجییەکی نوێ</Text>

          <TextInput
            style={styles.input}
            placeholder="بۆچی؟ (کرێ، گواستنەوە…)"
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
            textAlign="right"
          />

          <TextInput
            style={styles.input}
            placeholder="بڕ"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            textAlign="right"
          />

          <TextInput
            style={styles.input}
            placeholder="جۆر (ئارەزوومەندانە)"
            placeholderTextColor={colors.textFaint}
            value={category}
            onChangeText={setCategory}
            textAlign="right"
          />

          <View style={styles.sheetActions}>
            <Button label="پاشگەزبوونەوە" tone="quiet" onPress={onClose} />
            <Button label={saving ? 'پاشەکەوت…' : 'پاشەکەوتکردن'} onPress={save} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row-reverse', gap: spacing.sm },
  list: { gap: spacing.xs, paddingBottom: spacing.md, paddingTop: spacing.sm },
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
  rowBody: { flex: 1 },
  description: { ...typography.body, color: colors.text, textAlign: 'right' },
  meta: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  amount: { ...typography.heading, color: colors.danger, ...typography.mono },
  hint: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { ...typography.title, color: colors.text, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  sheetActions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.sm },
});
