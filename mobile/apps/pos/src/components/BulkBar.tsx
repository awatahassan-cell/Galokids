import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Alert } from '@galokids/core';
import { Button } from '@/components/kit';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * What appears when rows are ticked: how many, and what can be done to them.
 *
 * Deleting is always asked about first and is for admins only — one slip here
 * removes dozens of records, which is why the server refuses it to anyone else
 * too. `children` carries a resource's own extra actions, such as moving
 * orders to a new status.
 */
export function BulkBar({
  count,
  noun,
  onClear,
  onDelete,
  children,
}: {
  count: number;
  /** What the rows are called, in the plural: "داواکاری", "بەرهەم". */
  noun: string;
  onClear: () => void;
  onDelete?: () => Promise<void>;
  children?: ReactNode;
}) {
  if (count === 0) return null;

  const confirmDelete = () =>
    Alert.alert('سڕینەوە', `${count} ${noun} هەڵبژێردراو بە یەکجاری دەسڕدرێنەوە. دڵنیایت؟`, [
      { text: 'نەخێر', style: 'cancel' },
      { text: 'بیانسڕەوە', style: 'destructive', onPress: () => void onDelete?.() },
    ]);

  return (
    <View style={styles.bar}>
      <Text style={styles.count}>{count} {noun} هەڵبژێردراوە</Text>

      <View style={styles.actions}>
        {children}
        {onDelete ? <Button label="سڕینەوە" tone="danger" onPress={confirmDelete} /> : null}
        <Button label="هەڵوەشاندنەوە" tone="quiet" onPress={onClear} />
      </View>
    </View>
  );
}

/** Say what a bulk delete did — including what it refused and why. */
export function reportBulk(
  result: { deleted: number; skipped: { name?: string; reason: string }[] },
  noun: string
): void {
  const reasons: Record<string, string> = {
    self: 'هەژماری خۆت',
    last_admin: 'دوا ئەدمین',
    has_products: 'بەرهەمی تێدایە',
  };

  const skipped = result.skipped.length
    ? `\n\nڕانەگیران: ${result.skipped.map(s => `${s.name ?? ''} (${reasons[s.reason] ?? s.reason})`).join('، ')}`
    : '';

  Alert.alert('تەواو بوو', `${result.deleted} ${noun} سڕدرایەوە.${skipped}`);
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
  },
  count: { ...typography.heading, color: '#fff', textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
});
