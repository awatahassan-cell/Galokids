import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import {
  Alert,
  backoffice,
  formatDay,
  formatIQD,
  presetRanges,
  toDateKey,
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
import { Pill, Table, type Column } from '@/components/Table';
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

  // The panel's expense table: when, what for, which kind, how much, and the
  // one thing you can do to it. A visible button rather than a long press — a
  // gesture nobody can discover is a feature nobody has.
  const columns: Column<Expense>[] = [
    { title: 'بەروار', width: 1, render: expense => formatDay(expense.date ?? expense.created_at) },
    {
      title: 'وەسف',
      width: 2.2,
      primary: true,
      render: expense => expense.description || expense.category,
    },
    {
      title: 'جۆر',
      width: 1,
      align: 'center',
      render: expense => <Pill label={expense.category} tone="neutral" />,
    },
    {
      title: 'بڕ',
      width: 1,
      align: 'center',
      render: expense => <Text style={styles.amount}>{formatIQD(expense.amount)}</Text>,
    },
    {
      title: 'کردار',
      width: 0.8,
      align: 'center',
      render: expense => <RowAction label="سڕینەوە" danger onPress={() => remove(expense)} />,
    },
  ];

  return (
    <Screen
      title="خەرجییەکان"
      subtitle={`${formatDay(range.from)} — ${formatDay(range.to)}`}
      scroll={false}
      actions={<Button tone="ink" label="زیادکردن" onPress={() => setComposing(true)} />}
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
            <Table
              rows={list.data!.data}
              keyFor={expense => String(expense.id)}
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              columns={columns}
            />
          )}

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

function RowAction({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={[actionStyles.button, danger && actionStyles.danger]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={[actionStyles.text, danger && actionStyles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  danger: { backgroundColor: colors.dangerSoft },
  text: { ...typography.tiny, color: colors.brand },
  dangerText: { color: colors.danger },
});

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

    // The API requires a category, not a description — asking for the optional
    // one and omitting the required one is how this screen would have failed
    // on every save with a validation error nobody could act on.
    if (!category.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('ناتەواو', 'جۆری خەرجی و بڕێکی دروست پێویستە.');
      return;
    }

    setSaving(true);

    try {
      await backoffice.saveExpense({
        category: category.trim(),
        amount: value,
        description: description.trim() || null,
        // Required by the API. Today unless the shop says otherwise, which is
        // what recording a spend as it happens means.
        date: toDateKey(),
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
            placeholder="جۆری خەرجی (کرێ، گواستنەوە، مووچە…)"
            placeholderTextColor={colors.textFaint}
            value={category}
            onChangeText={setCategory}
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
            placeholder="تێبینی (ئارەزوومەندانە)"
            placeholderTextColor={colors.textFaint}
            value={description}
            onChangeText={setDescription}
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
  amount: { ...typography.heading, color: colors.danger },

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
