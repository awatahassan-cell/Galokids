import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { displayPhone, type Category } from '@galokids/core';
import { KidsIcon, kidsIconForCategory, type KidsIconName } from '@/components/KidsIcon';
import { useAccount } from '@/state/useAccount';
import { useBasket } from '@/state/useBasket';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The bar across the top, and the panel behind the hamburger.
 *
 * The website's: the shop's mark and name on the reading side, then search,
 * the basket, the shopper's initial and the menu. The drawer carries what does
 * not fit a four-tab bar — the categories, the pages, signing out — grouped
 * under the same small capital headings.
 */

export function Header({
  onSearch,
  onMenu,
}: {
  onSearch?: () => void;
  onMenu: () => void;
}) {
  const router = useRouter();
  const basket = useBasket();
  const { user } = useAccount();

  return (
    <View style={styles.header}>
      <Pressable
        style={styles.iconButton}
        onPress={onMenu}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="لیستی بەشەکان"
      >
        <View style={styles.burger}>
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
        </View>
      </Pressable>

      <Pressable style={styles.brand} onPress={() => router.replace('/')}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>🎈</Text>
        </View>
        <Text style={styles.brandName}>گەلۆ کیدز</Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={styles.iconButton}
          onPress={onSearch ?? (() => router.push('/products'))}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="گەڕان"
        >
          <KidsIcon name="search" size={19} />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={() => router.replace('/basket')}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="سەبەتە"
        >
          <KidsIcon name="basket" size={19} />
          {basket.itemCount > 0 && (
            <View style={styles.count}>
              <Text style={styles.countText}>{basket.itemCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.avatar, !user && styles.avatarGuest]}
          onPress={() => router.replace('/account')}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="هەژمار"
        >
          {/* Their initial once there is one. A signed-out shopper has no
              initial, and a question mark in its place reads as an error
              rather than as "sign in". */}
          {user?.name?.trim() ? (
            <Text style={styles.avatarText}>{user.name.trim()[0]!.toUpperCase()}</Text>
          ) : (
            <KidsIcon name="user" size={19} color={colors.textMuted} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

interface DrawerLink {
  label: string;
  icon: KidsIconName;
  href: string;
}

/**
 * The sliding panel.
 *
 * It animates rather than appearing, because a panel that is simply there has
 * no direction and a shopper cannot tell where it came from or how to put it
 * back. From the reading side, which in Kurdish is the right.
 */
export function Drawer({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const router = useRouter();
  const path = usePathname();
  const { width } = useWindowDimensions();
  const { user, signOut } = useAccount();

  const panelWidth = Math.min(320, width * 0.86);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 1 : 0,
      duration: open ? 260 : 200,
      // Decelerating hard at the end is what makes a panel feel like it
      // settles rather than stops.
      easing: open ? Easing.bezier(0.32, 0.72, 0, 1) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  const go = (href: string) => {
    onClose();
    // After the panel has started closing, so the new screen is not painted
    // underneath a sheet that is still on its way out.
    setTimeout(() => router.replace(href as never), 180);
  };

  const browse: DrawerLink[] = [
    { label: 'سەرەکی', icon: 'home', href: '/' },
    { label: 'هەموو بەرهەمەکان', icon: 'shop', href: '/products' },
    { label: 'دڵخوازەکان', icon: 'heart', href: '/wishlist' },
    { label: 'سەبەتە', icon: 'basket', href: '/basket' },
  ];

  const account: DrawerLink[] = user
    ? [
        { label: 'هەژمارەکەم', icon: 'user', href: '/account' },
        { label: 'داواکارییەکانم', icon: 'box', href: '/orders' },
      ]
    : [{ label: 'چوونەژوورەوە', icon: 'login', href: '/sign-in' }];

  const support: DrawerLink[] = [
    { label: 'شوێنکەوتنی داواکاری', icon: 'truck', href: '/track' },
  ];

  if (!open) {
    // Unmounted when shut rather than hidden: a drawer left in the tree keeps
    // its scroll position and its categories rendered behind every screen.
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.scrim, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="داخستن" />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  // Positive, because the panel lives on the right.
                  outputRange: [panelWidth, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.panelHead}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeMark}>✕</Text>
          </Pressable>

          <View style={styles.panelBrand}>
            <View style={styles.logo}>
              <Text style={styles.logoMark}>🎈</Text>
            </View>
            <View style={styles.panelBrandText}>
              <Text style={styles.brandName}>گەلۆ کیدز</Text>
              <Text style={styles.brandLine}>
                {user ? displayPhone(user.phone) || user.name : 'جلوبەرگی منداڵان'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.panelBody} showsVerticalScrollIndicator={false}>
          <Group title="گەڕان">
            {browse.map(link => (
              <Row key={link.href} link={link} active={isOn(path, link.href)} onPress={go} />
            ))}
          </Group>

          {categories.length > 0 && (
            <Group title="بەشەکان">
              {categories.map(category => (
                <Row
                  key={category.id}
                  link={{
                    label: category.name_ku || category.name,
                    icon:
                      kidsIconForCategory(category.icon) ??
                      kidsIconForCategory(category.name_ku || category.name) ??
                      'clothes',
                    href: `/products?category=${category.id}`,
                  }}
                  active={false}
                  onPress={() => {
                    onClose();
                    setTimeout(
                      () =>
                        router.replace({
                          pathname: '/products',
                          params: { category: String(category.id) },
                        } as never),
                      180
                    );
                  }}
                />
              ))}
            </Group>
          )}

          <Group title="هەژمار">
            {account.map(link => (
              <Row key={link.href} link={link} active={isOn(path, link.href)} onPress={go} />
            ))}
          </Group>

          <Group title="یارمەتی">
            {support.map(link => (
              <Row key={link.href} link={link} active={isOn(path, link.href)} onPress={go} />
            ))}
          </Group>

          {user && (
            <Pressable
              style={styles.signOut}
              onPress={async () => {
                onClose();
                await signOut();
                router.replace('/');
              }}
            >
              <KidsIcon name="logout" size={18} />
              <Text style={styles.signOutText}>چوونەدەرەوە</Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function isOn(path: string, href: string): boolean {
  const target = href.split('?')[0]!;

  return target === '/' ? path === '/' : path.startsWith(target);
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  link,
  active,
  onPress,
}: {
  link: DrawerLink;
  active: boolean;
  onPress: (href: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.rowPressed]}
      onPress={() => onPress(link.href)}
    >
      <View style={[styles.rowIcon, active && styles.rowIconActive]}>
        <KidsIcon name={link.icon} size={18} />
      </View>
      <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
        {link.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  brand: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: { fontSize: 19, lineHeight: 26 },
  brandName: { ...typography.title, color: colors.text },
  brandLine: { ...typography.tiny, color: colors.textMuted },

  actions: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  burger: { gap: 3.5, alignItems: 'center' },
  burgerLine: { width: 16, height: 2, borderRadius: 2, backgroundColor: colors.text },
  count: {
    position: 'absolute',
    top: -5,
    insetInlineStart: -5,
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
  countText: { color: '#fff', fontSize: 9, fontFamily: fonts.bold, lineHeight: 13 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  avatarGuest: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: { color: '#fff', ...typography.heading },

  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43,45,66,0.42)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    insetInlineEnd: 0,
    backgroundColor: colors.surface,
    borderStartWidth: 1,
    borderStartColor: colors.border,
    ...shadow.raised,
  },
  panelHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelBrand: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  panelBrandText: { flex: 1, alignItems: 'flex-end' },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: { fontSize: 14, color: colors.textMuted, lineHeight: 18 },

  panelBody: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  group: { gap: 2 },
  groupTitle: {
    ...typography.tiny,
    color: colors.textFaint,
    letterSpacing: 1.2,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowActive: { backgroundColor: colors.brandSoft },
  rowPressed: { backgroundColor: colors.background },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconActive: { backgroundColor: colors.surface },
  rowLabel: { flex: 1, ...typography.body, color: colors.text, textAlign: 'right' },
  rowLabelActive: { fontFamily: fonts.bold, color: colors.brandText },

  signOut: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    marginTop: spacing.sm,
  },
  signOutText: { ...typography.body, color: colors.danger },
});
