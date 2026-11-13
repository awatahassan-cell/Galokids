import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Alert, displayPhone } from '@galokids/core';
import { PageWash, PrimaryButton, TabBar } from '@/components/ui';
import { useAccount } from '@/state/useAccount';
import { useBasket } from '@/state/useBasket';
import { useWishlist } from '@/state/useWishlist';
import { colors, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The shopper's own corner of the app.
 *
 * Everything that is about them rather than about the clothes: who they are,
 * what they ordered, what they saved. Signed out it is the same page with a
 * sign-in button where the name goes, rather than a separate screen — so a
 * shopper who signs in lands back exactly where they were.
 */
export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAccount();
  const wishlist = useWishlist();
  const basket = useBasket();

  const leave = () => {
    const go = async () => {
      await signOut();
      router.replace('/');
    };

    Alert.alert('چوونەدەرەوە', 'دڵنیایی؟ سەبەتە و دڵخوازەکانت لەسەر ئەم مۆبایلە دەمێننەوە.', [
      { text: 'نەخێر', style: 'cancel' },
      { text: 'چوونەدەرەوە', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <View style={styles.screen}>
      <PageWash />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarMark}>{user ? '👤' : '🎈'}</Text>
          </View>

          {user ? (
            <>
              <Text style={styles.name}>{user.name || 'بەخێربێی'}</Text>
              {user.phone && <Text style={styles.phone}>{displayPhone(user.phone)}</Text>}
            </>
          ) : (
            <>
              <Text style={styles.name}>بەخێربێی بۆ گالۆ کیدز</Text>
              <Text style={styles.phone}>
                بچۆ ژوورەوە بۆ داواکردن و بینینی داواکارییەکانت.
              </Text>

              <View style={styles.signIn}>
                <PrimaryButton
                  label="چوونەژوورەوە بە کۆد"
                  onPress={() => router.push('/sign-in')}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.menu}>
          <Item
            icon="📦"
            label="داواکارییەکانم"
            hint={user ? undefined : 'پێویستی بە چوونەژوورەوە هەیە'}
            onPress={() => router.push('/orders')}
          />
          <Item
            icon="🔎"
            label="شوێنکەوتنی داواکاری"
            hint="بە ژمارەی داواکاری — بەبێ هەژمار"
            onPress={() => router.push('/track')}
          />
          <Item
            icon="♡"
            label="دڵخوازەکان"
            badge={wishlist.count || undefined}
            onPress={() => router.replace('/wishlist')}
          />
          <Item
            icon="🧺"
            label="سەبەتە"
            badge={basket.itemCount || undefined}
            onPress={() => router.replace('/basket')}
          />
        </View>

        {user && (
          <Pressable style={styles.leave} onPress={leave}>
            <Text style={styles.leaveText}>چوونەدەرەوە</Text>
          </Pressable>
        )}

        <Text style={styles.note}>
          سەبەتە و دڵخوازەکان لەسەر ئەم مۆبایلە پارێزراون و بۆ مۆبایلێکی تر ناگوازرێن.
        </Text>
      </ScrollView>

      <TabBar />
    </View>
  );
}

function Item({
  icon,
  label,
  hint,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  hint?: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Text style={styles.itemChevron}>‹</Text>

      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{label}</Text>
        {hint && <Text style={styles.itemHint}>{hint}</Text>}
      </View>

      {badge ? (
        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>{badge}</Text>
        </View>
      ) : null}

      <Text style={styles.itemIcon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  identity: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarMark: { fontSize: 34 },
  name: { ...typography.display, color: colors.text, textAlign: 'center' },
  phone: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  signIn: { marginTop: spacing.lg, alignSelf: 'stretch', maxWidth: 280 },

  menu: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemIcon: { fontSize: 20 },
  itemText: { flex: 1, alignItems: 'flex-end' },
  itemLabel: { ...typography.body, color: colors.text, textAlign: 'right' },
  itemHint: { ...typography.tiny, color: colors.textFaint, textAlign: 'right' },
  itemChevron: { fontSize: 22, color: colors.textFaint },
  itemBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBadgeText: { ...typography.tiny, color: colors.brandText },

  leave: { alignItems: 'center', paddingVertical: spacing.md },
  leaveText: { ...typography.small, color: colors.danger },
  note: {
    ...typography.tiny,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
});
