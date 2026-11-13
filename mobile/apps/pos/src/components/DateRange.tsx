import { StyleSheet, Text, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Chips } from '@/components/kit';
import { presetRanges, toDateKey } from '@galokids/core';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * From and to, for any list that can be narrowed by day.
 *
 * Quick choices first — today, the week, the month — because that is what is
 * wanted nineteen times in twenty, and two boxes for the other time. A date is
 * typed as YYYY-MM-DD: there is no native date picker in a React Native text
 * box, and a half-typed date is simply not sent, rather than sent wrong.
 */
export interface Range {
  from: string;
  to: string;
}

const VALID = /^\d{4}-\d{2}-\d{2}$/;

/** The values safe to send: a half-typed date is dropped, not sent. */
export function sendable(range: Range): { from?: string; to?: string } {
  return { from: VALID.test(range.from) ? range.from : undefined, to: VALID.test(range.to) ? range.to : undefined };
}

export function DateRange({ value, onChange }: { value: Range; onChange: (next: Range) => void }) {
  const presets = presetRanges();
  const today = toDateKey();

  const active = (() => {
    if (!value.from && !value.to) return 'all';
    for (const [id, range] of Object.entries(presets)) {
      if (range.from === value.from && range.to === value.to) return id;
    }
    return 'custom';
  })();

  return (
    <View style={{ gap: spacing.xs }}>
      <Chips
        value={active}
        onChange={id => {
          if (id === 'all') onChange({ from: '', to: '' });
          else if (id === 'custom') onChange({ from: value.from || today, to: value.to || today });
          else onChange({ from: presets[id]!.from, to: presets[id]!.to });
        }}
        options={[
          { id: 'all', label: 'هەموو بەروارەکان' },
          ...Object.entries(presets).map(([id, range]) => ({ id, label: range.label })),
          { id: 'custom', label: 'دیاریکراو' },
        ]}
      />

      {active === 'custom' && (
        <View style={styles.pair}>
          <TextInput
            style={styles.input}
            value={value.from}
            onChangeText={from => onChange({ ...value, from })}
            placeholder="لە — 2026-11-01"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.dash}>—</Text>
          <TextInput
            style={styles.input}
            value={value.to}
            onChangeText={to => onChange({ ...value, to })}
            placeholder="بۆ — 2026-11-30"
            placeholderTextColor={colors.textFaint}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...typography.small,
    color: colors.text,
    backgroundColor: 'rgba(241,245,249,0.85)',
  },
  dash: { color: colors.textFaint },
});
