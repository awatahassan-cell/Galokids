import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { ApiError, ORDER_STATUS_FLOW, orderStatusLabel, type OrderStatus } from '@galokids/core';
import { useBasket } from '@/state/useBasket';
import { useWishlist } from '@/state/useWishlist';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The parts every screen in the shop needs.
 *
 * Gathered here rather than written out per screen because they are the places
 * a shop's app is usually weakest — what it says when something is loading,
 * empty, or broken. Six screens each inventing their own wording is how one of
 * them ends up showing a raw error, and one of them showing nothing at all.
 */

/** A screen with a title, a back arrow and the shop's bottom navigation. */
export function Page({
  title,
  subtitle,
  children,
  scroll = true,
  back = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  back?: boolean;
}) {
  const router = useRouter();

  const header = (
    <View style={styles.header}>
      {back && (
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
          {/* Pointing the way the language reads. */}
          <Text style={styles.backMark}>→</Text>
        </Pressable>
      )}

      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {header}

      {scroll ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.bodyPlain}>{children}</View>
      )}

      <TabBar />
    </View>
  );
}

/**
 * The four places a shopper goes.
 *
 * Fixed at the bottom on every screen, because the alternative — a back button
 * and nothing else — means getting from an order to the shop takes as many
 * taps as it took to get there.
 */
export function TabBar() {
  const router = useRouter();
  const path = usePathname();
  const basket = useBasket();
  const wishlist = useWishlist();

  const tabs: { href: string; icon: string; label: string; badge?: number }[] = [
    { href: '/', icon: '🏠', label: 'فرۆشگا' },
    { href: '/wishlist', icon: '♡', label: 'دڵخوازەکان', badge: wishlist.count },
    { href: '/basket', icon: '🧺', label: 'سەبەتە', badge: basket.itemCount },
    { href: '/account', icon: '👤', label: 'هەژمار' },
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map(tab => {
        const active = tab.href === '/' ? path === '/' : path.startsWith(tab.href);

        return (
          <Pressable
            key={tab.href}
            style={styles.tab}
            // replace rather than push: tapping between tabs should not build a
            // back stack twenty screens deep.
            onPress={() => router.replace(tab.href as never)}
          >
            <View>
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
              {tab.badge ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

/**
 * Something went wrong, said in a way a shopper can act on.
 *
 * No signal and a server that refused are different problems with different
 * answers, and telling a shopper to try again when their phone has no bars is
 * advice they cannot take.
 */
export function Problem({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.isOffline;

  return (
    <View style={styles.centre}>
      <Text style={styles.problemMark}>{offline ? '📡' : '😕'}</Text>
      <Text style={styles.problemTitle}>
        {offline ? 'هیچ پەیوەندییەک نییە' : 'شتێک هەڵەی تێدا بوو'}
      </Text>
      <Text style={styles.problemBody}>
        {offline
          ? 'ئینتەرنێتەکەت بپشکنە و هەوڵ بدەرەوە.'
          : (error as Error)?.message || 'هەوڵ بدەرەوە.'}
      </Text>

      {onRetry && (
        <Pressable style={styles.action} onPress={onRetry}>
          <Text style={styles.actionText}>هەوڵدانەوە</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Empty({
  mark = '🗂️',
  title,
  body,
  action,
}: {
  mark?: string;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.centre}>
      <Text style={styles.problemMark}>{mark}</Text>
      <Text style={styles.problemTitle}>{title}</Text>
      {body && <Text style={styles.problemBody}>{body}</Text>}

      {action && (
        <Pressable style={styles.action} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#fffbeb', fg: '#b45309' },
  processing: { bg: colors.brandSoft, fg: colors.brandDark },
  shipped: { bg: '#eff6ff', fg: '#1d4ed8' },
  delivered: { bg: colors.successSoft, fg: colors.success },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger },
  returned: { bg: colors.dangerSoft, fg: colors.danger },
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? { bg: colors.border, fg: colors.textMuted };

  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{orderStatusLabel(status)}</Text>
    </View>
  );
}

/**
 * How far along an order is.
 *
 * Only drawn for an order still on its way. A cancelled or returned order is
 * not at an earlier stage of the same journey, and showing it three-quarters
 * along a progress bar would tell a customer their refunded order is nearly
 * with them.
 */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled' || status === 'returned') {
    return (
      <View style={[styles.stopped, { backgroundColor: STATUS_TONE[status]!.bg }]}>
        <Text style={[styles.stoppedText, { color: STATUS_TONE[status]!.fg }]}>
          {status === 'cancelled'
            ? 'ئەم داواکارییە هەڵوەشێنراوەتەوە.'
            : 'ئەم داواکارییە گەڕێنراوەتەوە.'}
        </Text>
      </View>
    );
  }

  const reached = Math.max(0, ORDER_STATUS_FLOW.indexOf(status));

  return (
    <View style={styles.progress}>
      {ORDER_STATUS_FLOW.map((step, index) => {
        const done = index <= reached;

        return (
          <View key={step} style={styles.progressStep}>
            {/* The line sits between the dots, so the last step has none. */}
            {index > 0 && <View style={[styles.progressLine, done && styles.progressLineDone]} />}

            <View style={styles.progressDotWrap}>
              <View style={[styles.progressDot, done && styles.progressDotDone]}>
                <Text style={[styles.progressTick, done && styles.progressTickDone]}>
                  {done ? '✓' : ''}
                </Text>
              </View>
              <Text style={[styles.progressLabel, done && styles.progressLabelDone]}>
                {orderStatusLabel(step)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMark: { fontSize: 20, color: colors.brand },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: { ...typography.title, color: colors.text, textAlign: 'right' },
  subtitle: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },

  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  bodyPlain: { flex: 1 },

  tabs: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  tabIcon: { fontSize: 20, color: colors.textFaint },
  tabIconActive: { color: colors.brand },
  tabLabel: { ...typography.tiny, color: colors.textFaint },
  tabLabelActive: { color: colors.brand },
  tabBadge: {
    position: 'absolute',
    top: -4,
    insetInlineEnd: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', ...typography.tiny },

  centre: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm, flexGrow: 1 },
  problemMark: { fontSize: 44 },
  problemTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  problemBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  action: {
    marginTop: spacing.sm,
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  actionText: { color: '#fff', ...typography.heading },

  pill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { ...typography.tiny },

  stopped: { padding: spacing.md, borderRadius: radius.md },
  stoppedText: { ...typography.small, textAlign: 'right' },

  progress: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  progressStep: { flex: 1, flexDirection: 'row-reverse', alignItems: 'flex-start' },
  progressLine: {
    flex: 1,
    height: 2,
    marginTop: 13,
    backgroundColor: colors.border,
  },
  progressLineDone: { backgroundColor: colors.brand },
  progressDotWrap: { alignItems: 'center', gap: spacing.xs, width: 68 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: { borderColor: colors.brand, backgroundColor: colors.brand },
  progressTick: { ...typography.small, color: 'transparent' },
  progressTickDone: { color: '#fff' },
  progressLabel: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },
  progressLabelDone: { color: colors.text },
});
