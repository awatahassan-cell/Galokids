import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { useSync } from '@/state/useSync';

/**
 * The strip that tells the cashier where they stand.
 *
 * It is always visible, and it is loudest when there is something to say. A
 * till quietly failing to sync for three days looks exactly like a working one
 * until somebody asks why the takings are wrong — so the number of unsent
 * sales sits on the screen, not in a settings page nobody opens.
 */
export function SyncBanner() {
  const { online, syncing, pending, rejected, syncNow } = useSync();

  const needsAttention = rejected > 0;
  const waiting = pending > 0;

  const tone = needsAttention
    ? { bg: colors.dangerSoft, fg: colors.danger }
    : waiting
      ? { bg: colors.warningSoft, fg: colors.warning }
      : online
        ? { bg: colors.successSoft, fg: colors.success }
        : { bg: colors.brandSoft, fg: colors.brand };

  const message = needsAttention
    ? `${rejected} فرۆشتن ڕەتکرایەوە — پێویستی بە سەیرکردن هەیە`
    : waiting
      ? `${pending} فرۆشتن چاوەڕێی ناردنە`
      : online
        ? 'هەموو فرۆشتنەکان نێردراون'
        : 'ئۆفلاین — فرۆشتن بەردەوامە و پاشەکەوت دەکرێت';

  return (
    <View style={[styles.bar, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />

      <Text style={[styles.message, { color: tone.fg }]} numberOfLines={1}>
        {message}
      </Text>

      <Pressable
        onPress={() => syncNow()}
        disabled={syncing}
        hitSlop={8}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      >
        <Text style={[styles.actionText, { color: tone.fg }]}>
          {syncing ? 'دەنێردرێت…' : 'ناردن'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  message: { flex: 1, textAlign: 'right', ...typography.small },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  actionPressed: { opacity: 0.6 },
  actionText: { ...typography.small },
});
