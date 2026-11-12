import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { ApiError, ORDER_STATUS_FLOW, orderStatusLabel, type OrderStatus } from '@galokids/core';
import { useBasket } from '@/state/useBasket';
import { useWishlist } from '@/state/useWishlist';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The parts every screen in the shop needs, in the website's own visual
 * language: a soft tinted page, white cards with generous corners, candy pink
 * for decoration and ink for the thing you press.
 *
 * Gathered here rather than written out per screen because these are the
 * places a shop's app is usually weakest — what it says when something is
 * loading, empty or broken. Six screens each inventing their own wording is
 * how one of them ends up showing a raw error and another shows nothing.
 */

/**
 * The ambient colour behind every page.
 *
 * The website paints three big radial gradients into one fixed layer. There
 * are no radial gradients in React Native, so this is the same idea with
 * three very soft circles — cheap, and it does the job of stopping a white
 * screen from looking like a blank document.
 */
export function PageWash() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.blob, styles.blobOne]} />
      <View style={[styles.blob, styles.blobTwo]} />
      <View style={[styles.blob, styles.blobThree]} />
    </View>
  );
}

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

  return (
    <View style={styles.screen}>
      <PageWash />

      <View style={styles.header}>
        {back && (
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            {/* Pointing the way the language reads. */}
            <Text style={styles.backMark}>→</Text>
          </Pressable>
        )}

        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
 * The website's phone bar: a tinted tile behind the active icon, a candy rule
 * across the top of it, and a count badge in a white ring. Fixed to the bottom
 * on every screen, because the alternative — a back button and nothing else —
 * means getting from an order to the shop takes as many taps as it took to
 * get there.
 */
export function TabBar() {
  const router = useRouter();
  const path = usePathname();
  const basket = useBasket();
  const wishlist = useWishlist();

  // All four from the same family. Mixing a colour emoji with monochrome
  // typographic glyphs — a basket next to a line-drawn house — reads as four
  // icons borrowed from four different places, which is exactly how it looked.
  const tabs: { href: string; icon: string; label: string; badge?: number }[] = [
    { href: '/', icon: '🏠', label: 'فرۆشگا' },
    { href: '/wishlist', icon: '💗', label: 'دڵخوازەکان', badge: wishlist.count },
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
            // replace rather than push: tapping between tabs should not build
            // a back stack twenty screens deep.
            onPress={() => router.replace(tab.href as never)}
          >
            {active && <View style={styles.tabRule} />}

            <View style={[styles.tabTile, active && styles.tabTileActive]}>
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

/** A white tile with the website's corners, hairline and lift. */
export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

/** The small bold pill the website puts above a section heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.eyebrow}>
      <Text style={styles.eyebrowText}>{children}</Text>
    </View>
  );
}

/** The ink button that means "do the thing". */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
  tone = 'ink',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'ink' | 'candy';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primary,
        tone === 'candy' && styles.primaryCandy,
        (disabled || busy) && styles.primaryOff,
        pressed && styles.primaryPressed,
      ]}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={colors.brandDeep} />
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
      <View style={styles.markRing}>
        <Text style={styles.mark}>{offline ? '📡' : '🙁'}</Text>
      </View>

      <Text style={styles.centreTitle}>
        {offline ? 'هیچ پەیوەندییەک نییە' : 'شتێک هەڵەی تێدا بوو'}
      </Text>
      <Text style={styles.centreBody}>
        {offline
          ? 'ئینتەرنێتەکەت بپشکنە و هەوڵ بدەرەوە.'
          : (error as Error)?.message || 'هەوڵ بدەرەوە.'}
      </Text>

      {onRetry && (
        <View style={styles.centreAction}>
          <PrimaryButton label="هەوڵدانەوە" onPress={onRetry} />
        </View>
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
      <View style={styles.markRing}>
        <Text style={styles.mark}>{mark}</Text>
      </View>

      <Text style={styles.centreTitle}>{title}</Text>
      {body ? <Text style={styles.centreBody}>{body}</Text> : null}

      {action && (
        <View style={styles.centreAction}>
          <PrimaryButton label={action.label} onPress={action.onPress} tone="candy" />
        </View>
      )}
    </View>
  );
}

const STATUS_TONE: Record<string, { bg: string; fg: string; line: string }> = {
  pending: { bg: colors.sunnySoft, fg: colors.sunnyText, line: colors.sunnyLine },
  processing: { bg: colors.grapeSoft, fg: colors.grapeText, line: colors.grapeLine },
  shipped: { bg: colors.bubbleSoft, fg: colors.bubbleText, line: colors.bubbleLine },
  delivered: { bg: colors.mintSoft, fg: colors.mintText, line: '#C6F2E3' },
  cancelled: { bg: colors.dangerSoft, fg: colors.danger, line: '#FECDD3' },
  returned: { bg: colors.dangerSoft, fg: colors.danger, line: '#FECDD3' },
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? {
    bg: colors.border,
    fg: colors.textMuted,
    line: colors.borderStrong,
  };

  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.line }]}>
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
    const tone = STATUS_TONE[status]!;

    return (
      <View style={[styles.stopped, { backgroundColor: tone.bg, borderColor: tone.line }]}>
        <Text style={[styles.stoppedText, { color: tone.fg }]}>
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
        const here = index === reached;

        return (
          <View key={step} style={styles.progressStep}>
            {/* The line sits between the dots, so the first step has none. */}
            {index > 0 && <View style={[styles.progressLine, done && styles.progressLineDone]} />}

            <View style={styles.progressDotWrap}>
              <View
                style={[
                  styles.progressDot,
                  done && styles.progressDotDone,
                  here && styles.progressDotHere,
                ]}
              >
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

/** The pastel panel the website puts a product photo on. */
export function MediaWash({
  wash,
  children,
  style,
}: {
  wash: readonly [string, string];
  children?: ReactNode;
  style?: object;
}) {
  return (
    <LinearGradient
      colors={[wash[0], wash[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wash, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  blob: { position: 'absolute', borderRadius: radius.pill, opacity: 0.5 },
  blobOne: {
    width: 420,
    height: 420,
    top: -180,
    insetInlineEnd: -160,
    backgroundColor: colors.bubbleSoft,
  },
  blobTwo: {
    width: 360,
    height: 360,
    top: 220,
    insetInlineStart: -180,
    backgroundColor: colors.brandSoft,
  },
  blobThree: {
    width: 380,
    height: 380,
    bottom: -160,
    insetInlineEnd: -140,
    backgroundColor: colors.sunnySoft,
  },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  backMark: { fontSize: 18, color: colors.text },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: { ...typography.title, color: colors.text, textAlign: 'right' },
  subtitle: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },

  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  bodyPlain: { flex: 1 },

  tabs: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: spacing.xs },
  tabRule: {
    position: 'absolute',
    top: -4,
    insetInlineStart: 18,
    insetInlineEnd: 18,
    height: 3,
    borderBottomStartRadius: 3,
    borderBottomEndRadius: 3,
    backgroundColor: colors.brand,
  },
  tabTile: {
    width: 36,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabTileActive: { backgroundColor: colors.brandSoft, borderColor: colors.brandLine },
  // Emoji carry their own colour, so the active state is told by the tinted
  // tile, the candy rule above it and the label — not by the glyph.
  tabIcon: { fontSize: 17, lineHeight: 22, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabLabel: { ...typography.tiny, color: colors.textFaint },
  tabLabelActive: { color: colors.brandText },
  tabBadge: {
    position: 'absolute',
    top: -5,
    insetInlineStart: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandDeep,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontFamily: fonts.bold, lineHeight: 13 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },

  eyebrow: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandLine,
  },
  eyebrowText: { ...typography.tiny, color: colors.brandText, letterSpacing: 0.5 },

  primary: {
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    ...shadow.card,
  },
  primaryCandy: { backgroundColor: colors.brandDeep },
  primaryOff: { opacity: 0.4 },
  primaryPressed: { transform: [{ scale: 0.98 }] },
  primaryText: { color: '#fff', ...typography.heading },

  centre: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    flexGrow: 1,
  },
  markRing: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  mark: { fontSize: 36, lineHeight: 44 },
  centreTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  centreBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  centreAction: { marginTop: spacing.md, alignSelf: 'stretch', maxWidth: 280 },

  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: { ...typography.tiny },

  stopped: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  stoppedText: { ...typography.small, textAlign: 'right' },

  progress: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  progressStep: { flex: 1, flexDirection: 'row-reverse', alignItems: 'flex-start' },
  progressLine: { flex: 1, height: 2, marginTop: 14, backgroundColor: colors.borderStrong },
  progressLineDone: { backgroundColor: colors.brand },
  progressDotWrap: { alignItems: 'center', gap: spacing.xs, width: 66 },
  progressDot: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: { borderColor: colors.brand, backgroundColor: colors.brand },
  /** The stage it is at now, lifted so the eye lands on it first. */
  progressDotHere: { borderColor: colors.brandDeep, backgroundColor: colors.brandDeep },
  // No fontFamily on purpose. IBM Plex Sans Arabic has no U+2713, so asking
  // for it in that face fell back per-glyph and drew a maths radical rather
  // than a tick. The system font has one.
  progressTick: { fontSize: 13, fontWeight: '700', color: 'transparent', lineHeight: 18 },
  progressTickDone: { color: '#fff' },
  progressLabel: { ...typography.tiny, color: colors.textFaint, textAlign: 'center' },
  progressLabelDone: { color: colors.text },

  wash: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
