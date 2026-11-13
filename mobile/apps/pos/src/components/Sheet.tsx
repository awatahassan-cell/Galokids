import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * The bottom sheet every back-office form and detail opens in, and the plain
 * labelled field that goes inside one.
 */
export function Sheet({
  title,
  onClose,
  children,
  maxWidth = 640,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxWidth }]}>
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

export function Field({
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
  half,
  phone,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  numeric?: boolean;
  multiline?: boolean;
  half?: boolean;
  phone?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline, half && styles.half]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={numeric ? 'number-pad' : phone ? 'phone-pad' : 'default'}
      multiline={multiline}
      textAlign="right"
    />
  );
}

/**
 * A field with its label above it, the way the panel's forms are laid out:
 * a small bold caption on the right, then the box.
 */
export function Labeled({
  label,
  required,
  children,
  half,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  half?: boolean;
}) {
  return (
    <View style={[{ gap: 6 }, half && styles.half]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** A label with its value, for a detail sheet. */
export function Fact({ label, value, tone }: { label: string; value: string; tone?: 'bad' | 'good' }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text
        style={[
          styles.factValue,
          tone === 'bad' && { color: colors.danger },
          tone === 'good' && { color: colors.success },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export const sheetStyles = StyleSheet.create({
  pair: { flexDirection: 'row-reverse', gap: spacing.sm },
  actions: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxHeight: '94%',
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

  group: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  groupTitle: { ...typography.eyebrow, color: colors.textMuted, textAlign: 'right' },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...typography.small,
    color: colors.text,
    backgroundColor: 'rgba(241,245,249,0.85)',
  },
  multiline: { minHeight: 70, paddingTop: spacing.sm, textAlignVertical: 'top' },
  half: { flex: 1, flexBasis: 0, minWidth: 0 },

  label: { ...typography.tiny, color: colors.text, textAlign: 'right' },
  fact: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: spacing.md },
  factLabel: { ...typography.small, color: colors.textMuted },
  factValue: { ...typography.small, color: colors.text, flexShrink: 1, textAlign: 'left' },
});
