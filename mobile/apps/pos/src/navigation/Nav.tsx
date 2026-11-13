import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useLayout } from '@galokids/core';
import { NavIcon } from '@/navigation/NavIcon';
import { GROUPS, sectionsFor, type Section } from '@/navigation/sections';
import { useSession } from '@/state/useSession';
import { useSync } from '@/state/useSync';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Getting around the back office.
 *
 * On a phone this is the home screen — a grid of tiles the cashier taps. On a
 * tablet or a browser it is a rail down the side, because a shopkeeper working
 * on a laptop should not have to go back to a menu between every screen.
 *
 * Both are built from one list, so a section cannot exist in one and be
 * forgotten in the other.
 */

export function SideNav() {
  const router = useRouter();
  const path = usePathname();
  const { can, user, signOut } = useSession();
  const { pending, online } = useSync();

  const visible = useMemo(() => sectionsFor(can), [can]);

  return (
    <View style={styles.rail}>
      <View style={styles.railHead}>
        <Text style={styles.railHeadText}>لیستی سەرەکی</Text>
      </View>

      <ScrollView contentContainerStyle={styles.railScroll} showsVerticalScrollIndicator={false}>
        {GROUPS.map(group => {
          const items = visible.filter(section => section.group === group.id);
          if (items.length === 0) return null;

          return (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>

              {items.map(section => {
                const active = path.includes(`/${section.route}`);
                const unavailable = !online && !section.offline;

                return (
                  <Pressable
                    key={section.id}
                    style={[styles.railItem, active && styles.railItemActive]}
                    onPress={() => router.push(`/(admin)/${section.route}` as never)}
                  >
                    <NavIcon
                      name={section.icon}
                      size={17}
                      // Indigo on the dark selected row, which is where the
                      // accent reads; grey everywhere else.
                      color={active ? colors.brandOnDark : colors.textFaint}
                    />
                    <Text
                      style={[
                        styles.railLabel,
                        active && styles.railLabelActive,
                        unavailable && styles.railLabelDim,
                      ]}
                      numberOfLines={1}
                    >
                      {section.title}
                    </Text>

                    {section.id === 'till' && pending > 0 && (
                      <View style={styles.railBadge}>
                        <Text style={styles.railBadgeText}>{pending}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>چوونەدەرەوە</Text>
      </Pressable>
    </View>
  );
}

/** The phone's home screen: every door the person is allowed through. */
export function SectionGrid() {
  const router = useRouter();
  const { can, user } = useSession();
  const { online } = useSync();
  const { columns } = useLayout();

  const visible = useMemo(() => sectionsFor(can), [can]);

  return (
    <ScrollView contentContainerStyle={styles.gridScroll}>
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>بەخێربێیت، {user?.name}</Text>
        <Text style={styles.greetingLine}>بەشێک هەڵبژێرە بۆ دەستپێکردن</Text>
      </View>

      {GROUPS.map(group => {
        const items = visible.filter(section => section.group === group.id);
        if (items.length === 0) return null;

        return (
          <View key={group.id} style={styles.gridGroup}>
            <Text style={styles.gridGroupTitle}>{group.title}</Text>

            <View style={styles.grid}>
              {items.map(section => (
                <Tile
                  key={section.id}
                  section={section}
                  width={`${100 / Math.max(2, columns - 1)}%`}
                  unavailable={!online && !section.offline}
                  onPress={() => router.push(`/(admin)/${section.route}` as never)}
                />
              ))}
            </View>
          </View>
        );
      })}

      {visible.length === 0 && (
        <View style={styles.noAccess}>
          <Text style={styles.noAccessTitle}>هیچ دەسەڵاتێکت نەدراوەتێ</Text>
          <Text style={styles.noAccessBody}>
            داوا لە بەڕێوەبەر بکە دەسەڵاتەکانت بۆ دیاری بکات.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Tile({
  section,
  width,
  unavailable,
  onPress,
}: {
  section: Section;
  width: `${number}%`;
  unavailable: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.tilePressed]}
      onPress={onPress}
    >
      <View style={styles.tileIcon}>
        <NavIcon name={section.icon} size={20} color={colors.brand} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>
        {section.title}
      </Text>
      <Text style={styles.tileSubtitle} numberOfLines={2}>
        {section.subtitle}
      </Text>

      {unavailable && (
        <View style={styles.tileOffline}>
          <Text style={styles.tileOfflineText}>ئینتەرنێت پێویستە</Text>
        </View>
      )}

      {section.offline && (
        <View style={styles.tileOfflineOk}>
          <Text style={styles.tileOfflineOkText}>بێ ئینتەرنێتیش</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A floating card, as in the panel: rounded all round, translucent white on
  // the blue wash, with the menu scrolling inside it.
  rail: {
    width: 250,
    borderRadius: 40,
    paddingTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
  },
  railHead: {
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  railHeadText: { ...typography.heading, color: colors.text, textAlign: 'right' },
  brand: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandText: { flex: 1, alignItems: 'flex-end' },
  brandName: { ...typography.heading, color: colors.text, textAlign: 'right' },
  brandRole: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold, lineHeight: 22 },
  railScroll: { padding: spacing.sm, gap: spacing.md },
  group: { gap: 2 },
  groupTitle: {
    ...typography.eyebrow,
    color: colors.textFaint,
    textAlign: 'right',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  railItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
  },
  // Near-black rather than a tinted row: the panel marks the open tab this
  // way, which says "you are here" without spending the accent colour.
  railItemActive: { backgroundColor: colors.ink },
  railLabel: { flex: 1, ...typography.small, color: colors.textMuted, textAlign: 'right' },
  railLabelActive: { color: '#fff', fontFamily: fonts.bold },
  railLabelDim: { opacity: 0.45 },
  railBadge: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBadgeText: { color: '#fff', ...typography.tiny },
  signOut: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  signOutText: { ...typography.small, color: colors.danger },

  gridScroll: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  greetingBlock: { alignItems: 'flex-end' },
  greeting: { ...typography.display, color: colors.text, textAlign: 'right' },
  greetingLine: { ...typography.small, color: colors.textMuted, textAlign: 'right' },
  gridGroup: { gap: spacing.sm },
  gridGroupTitle: { ...typography.eyebrow, color: colors.textFaint, textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    minHeight: 118,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
    alignItems: 'flex-end',
    ...shadow.card,
  },
  tilePressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tileTitle: { ...typography.heading, color: colors.text, textAlign: 'right' },
  tileSubtitle: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  tileOffline: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  tileOfflineText: { ...typography.tiny, color: colors.warning },
  tileOfflineOk: {
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  tileOfflineOkText: { ...typography.tiny, color: colors.success },

  noAccess: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  noAccessTitle: { ...typography.title, color: colors.text },
  noAccessBody: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
});
