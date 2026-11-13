import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { useSession } from '@/state/useSession';
import { useSync } from '@/state/useSync';

/**
 * The strip across the top of the wide layout.
 *
 * The panel's own header: the shop's mark and name on the right with a small
 * "control panel" badge, and on the left what a shopkeeper glances at all day —
 * whether the till is in step with the server, and who is signed in. The sync
 * state is the same one the phone shows as a banner; here it is a pill, because
 * a full-width bar would sit between two floating cards and spoil the shell.
 */
export function ShellHeader() {
  const { user } = useSession();
  const { online, syncing, pending, rejected, syncNow } = useSync();

  const state = rejected > 0
    ? { text: `${rejected} فرۆشتن ڕەتکرایەوە`, bg: colors.dangerSoft, fg: colors.danger }
    : pending > 0
      ? { text: `${pending} فرۆشتن چاوەڕێی ناردنە`, bg: colors.warningSoft, fg: colors.warning }
      : online
        ? { text: 'هەموو فرۆشتنەکان نێردراون', bg: colors.successSoft, fg: colors.success }
        : { text: 'ئۆفلاین — فرۆشتن بەردەوامە', bg: colors.brandSoft, fg: colors.brand };

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markText}>G</Text>
        </View>

        <View style={styles.brandText}>
          <View style={styles.nameRow}>
            <Text style={styles.badge}>کۆنتڕۆڵ پەنێڵ</Text>
            <Text style={styles.name}>گەلۆ کیدز</Text>
          </View>
          <Text style={styles.tag}>بەڕێوەبردن و فرۆشتن</Text>
        </View>
      </View>

      <View style={styles.tools}>
        <Pressable
          style={[styles.sync, { backgroundColor: state.bg }]}
          onPress={() => syncNow()}
          disabled={syncing}
        >
          <View style={[styles.dot, { backgroundColor: state.fg }]} />
          <Text style={[styles.syncText, { color: state.fg }]}>{syncing ? 'دەنێردرێت…' : state.text}</Text>
        </Pressable>

        <View style={styles.user}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name}
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? '?').slice(0, 1).toUpperCase()}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
  mark: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#fff', fontSize: 17, fontFamily: fonts.bold, lineHeight: 24 },
  brandText: { alignItems: 'flex-end' },
  nameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.heading, color: colors.text },
  badge: {
    ...typography.tiny,
    color: '#fff',
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tag: { ...typography.tiny, color: colors.textMuted },

  tools: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
  sync: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { ...typography.tiny },
  user: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', ...typography.tiny },
  userName: { ...typography.small, color: colors.text, maxWidth: 140 },
});
