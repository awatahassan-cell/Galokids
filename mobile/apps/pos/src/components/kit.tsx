import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError, formatIQD, useLayout } from '@galokids/core';
import { useSync } from '@/state/useSync';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The pieces every back-office screen is made of.
 *
 * Twenty screens would otherwise each invent their own spinner, their own way
 * of saying "no connection", and their own idea of what a row looks like — and
 * the differences would read as bugs to the shopkeeper. These exist so a
 * screen says what it has and not how to draw it.
 */

/* ------------------------------------------------------------- shell --- */

export function Screen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  actions,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
  scroll?: boolean;
}) {
  const router = useRouter();
  const { wide, gutter, maxContentWidth } = useLayout();

  const header = (
    <View style={[styles.header, { paddingHorizontal: gutter }]}>
      {!wide && (
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Text style={styles.backText}>→</Text>
        </Pressable>
      )}

      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {actions}
    </View>
  );

  const body = (
    <View style={[styles.body, { paddingHorizontal: gutter, maxWidth: maxContentWidth }]}>
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.screen}>
        {header}
        {body}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          ) : undefined
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------- the states --- */

export function Loading() {
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

/**
 * Something went wrong, said in a way that tells the shopkeeper what to do.
 *
 * The two cases need different words. "Try again" is useless advice when the
 * phone has no signal, and "check your connection" is misleading when the
 * server answered and refused.
 */
export function Problem({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.isOffline;
  const forbidden = error instanceof ApiError && error.status === 403;

  const message = offline
    ? 'هیچ پەیوەندییەک بە سێرڤەرەوە نییە. ئەم شاشەیە پێویستی بە ئینتەرنێتە.'
    : forbidden
      ? 'ئەم بەشە لە دەسەڵاتی هەژمارەکەتدا نییە.'
      : error instanceof Error
        ? error.message
        : 'هەڵەیەکی نەناسراو ڕوویدا.';

  return (
    <View style={styles.centre}>
      <Text style={styles.problemMark}>{offline ? '📡' : forbidden ? '🔒' : '⚠️'}</Text>
      <Text style={styles.problemText}>{message}</Text>

      {onRetry && !forbidden && (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>هەوڵدانەوە</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.centre}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body && <Text style={styles.problemText}>{body}</Text>}
    </View>
  );
}

/** Shown in place of a screen that genuinely cannot work without a signal. */
export function NeedsConnection({ what }: { what: string }) {
  const { syncNow, syncing } = useSync();

  return (
    <View style={styles.centre}>
      <Text style={styles.problemMark}>📡</Text>
      <Text style={styles.emptyTitle}>ئینتەرنێت پێویستە</Text>
      <Text style={styles.problemText}>
        {what} پێویستی بە پەیوەندی هەیە. فرۆشتن بەردەوامە و پاشەکەوت دەکرێت.
      </Text>

      <Pressable style={styles.retry} onPress={() => syncNow()} disabled={syncing}>
        <Text style={styles.retryText}>{syncing ? 'هەوڵدەدات…' : 'هەوڵدانەوە'}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------ pieces --- */

/** A headline number: takings, stock value, how many orders. */
export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const colour =
    tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.text;

  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: colour }]}>{value}</Text>
      {hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

export function Money({ amount, tone }: { amount: number; tone?: 'good' | 'bad' }) {
  const colour = tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.text;

  return <Text style={[styles.money, { color: colour }]}>{formatIQD(amount)}</Text>;
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  if (!onPress) return <View style={styles.card}>{children}</View>;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      {children}
    </Pressable>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.rowValue}>{value}</Text> : value}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map(option => {
        const active = option.id === value;

        return (
          <Pressable
            key={option.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(option.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = 'گەڕان…',
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={styles.search}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      textAlign="right"
    />
  );
}

export function Button({
  label,
  onPress,
  tone = 'brand',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'brand' | 'quiet' | 'danger';
  disabled?: boolean;
}) {
  const background =
    tone === 'brand' ? colors.brand : tone === 'danger' ? colors.dangerSoft : colors.brandSoft;
  const text = tone === 'brand' ? '#fff' : tone === 'danger' ? colors.danger : colors.brand;

  return (
    <Pressable
      style={[styles.button, { backgroundColor: background }, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, { color: text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1 },
  title: { ...typography.display, color: colors.text, textAlign: 'right' },
  subtitle: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  back: { width: TOUCH_TARGET - 12, height: TOUCH_TARGET - 12, alignItems: 'center', justifyContent: 'center' },
  backText: { ...typography.title, color: colors.brand },

  scroll: { paddingBottom: spacing.xxl },
  body: { gap: spacing.md, width: '100%', alignSelf: 'flex-end' },

  centre: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  problemMark: { fontSize: 36 },
  problemText: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 360 },
  emptyTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  retry: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    marginTop: spacing.sm,
  },
  retryText: { color: '#fff', ...typography.heading },

  stat: {
    flexGrow: 1,
    flexBasis: 150,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  statLabel: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  statValue: { ...typography.title, textAlign: 'right', ...typography.mono },
  statHint: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },

  money: { ...typography.heading, ...typography.mono },

  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardPressed: { opacity: 0.72 },

  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowLabel: { ...typography.small, color: colors.textMuted },
  rowValue: { ...typography.small, color: colors.text },

  chips: { gap: spacing.sm, paddingVertical: spacing.xs, flexDirection: 'row-reverse' },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.small, color: colors.textMuted },
  chipTextActive: { color: '#fff' },

  search: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },

  button: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { ...typography.heading },
});
