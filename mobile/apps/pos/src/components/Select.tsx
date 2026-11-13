import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * A dropdown, for a short list of fixed choices.
 *
 * The panel uses a `<select>` for a governorate, a district and an order
 * status. There is no such control in React Native, so this is a field that
 * opens a list: it looks like the other fields, holds one value, and shows the
 * chosen label rather than the stored value — which is English for a
 * governorate and would otherwise be read back to a Kurdish shopkeeper as is.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = '— هەڵبژێرە —',
  disabled,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(option => option.id === value);

  return (
    <>
      <Pressable style={[styles.field, disabled && styles.disabled]} onPress={() => !disabled && setOpen(true)}>
        <Text style={styles.chevron}>⌄</Text>
        <Text style={[styles.value, !current && styles.placeholder]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map(option => {
                const active = option.id === value;

                return (
                  <Pressable
                    key={option.id}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    {active && <Text style={styles.tick}>●</Text>}
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(241,245,249,0.85)',
  },
  disabled: { opacity: 0.5 },
  value: { flex: 1, ...typography.small, color: colors.text, textAlign: 'right' },
  placeholder: { color: colors.textFaint },
  chevron: { fontSize: 16, color: colors.textMuted, lineHeight: 20 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  option: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.ink },
  optionText: { flex: 1, ...typography.body, color: colors.text, textAlign: 'right' },
  optionTextActive: { color: '#fff' },
  tick: { color: colors.brandOnDark, fontSize: 9 },
});
