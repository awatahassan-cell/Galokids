import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { LANGUAGES } from '../../src/i18n/strings';
import { FLAG_FOR } from '../../src/components/Flags';
import { useAuth } from '../../src/store/AuthProvider';
import { useShop } from '../../src/store/ShopProvider';
import { formatPhone } from '../../src/utils/phone';
import { Button, Card, Divider, Row, T } from '../../src/components/ui';

/**
 * The account screen, and everything that does not belong on a tab of its own:
 * orders, the shop's own pages, the language, and signing out.
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, isSignedIn, signOut } = useAuth();
  const { settings } = useShop();

  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = useCallback(() => {
    Alert.alert(t('signOut'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
        },
      },
    ]);
  }, [signOut, t]);

  const openWhatsApp = useCallback(() => {
    const number = String(settings.whatsappNumber ?? '').replace(/\D/g, '');
    if (!number) return;
    // wa.me wants the international form without a plus or leading zero.
    const international = number.startsWith('964') ? number : `964${number.replace(/^0/, '')}`;
    Linking.openURL(`https://wa.me/${international}`).catch(() => {});
  }, [settings.whatsappNumber]);

  const rows: { label: string; emoji: string; onPress: () => void }[] = [
    { label: t('myOrders'), emoji: '📦', onPress: () => router.push('/orders' as never) },
    { label: t('trackOrder'), emoji: '🚚', onPress: () => router.push('/track' as never) },
    { label: t('aboutUs'), emoji: 'ℹ️', onPress: () => router.push('/info/about' as never) },
    { label: t('faq'), emoji: '❓', onPress: () => router.push('/info/faq' as never) },
    { label: t('shippingReturns'), emoji: '↩️', onPress: () => router.push('/info/shipping' as never) },
    { label: t('sizeGuide'), emoji: '📏', onPress: () => router.push('/info/size-guide' as never) },
    { label: t('contactUs'), emoji: '✉️', onPress: () => router.push('/info/contact' as never) },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing['3xl'] }}
      showsVerticalScrollIndicator={false}
    >
      <T size="xl" weight="black" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
        {t('account')}
      </T>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        {isSignedIn && user ? (
          <Card style={{ padding: spacing.lg }}>
            <Row gap={spacing.lg}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.pill,
                  backgroundColor: colors.candy[500],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <T size="xl" weight="black" color={colors.white}>
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </T>
              </View>

              <View style={{ flex: 1 }}>
                <T size="base" weight="black" numberOfLines={1}>
                  {user.name}
                </T>
                {user.phone ? (
                  <T size="sm" weight="bold" color={colors.slate[500]}>
                    {formatPhone(user.phone)}
                  </T>
                ) : null}
              </View>

              <Pressable onPress={() => router.push('/profile' as never)} hitSlop={8}>
                <T size="xs" weight="black" color={colors.candy[700]}>
                  {t('editProfile')}
                </T>
              </Pressable>
            </Row>
          </Card>
        ) : (
          <Card style={{ padding: spacing.xl, gap: spacing.lg, alignItems: 'center' }}>
            <T size="base" weight="black" center>
              {t('signInToContinue')}
            </T>
            <Button
              full
              title={t('signIn')}
              onPress={() => router.push('/auth/sign-in' as never)}
            />
          </Card>
        )}

        <Card>
          {rows.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: colors.slate[100] }} /> : null}
              <Pressable
                onPress={row.onPress}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.lg,
                  backgroundColor: pressed ? colors.slate[50] : 'transparent',
                })}
              >
                <Row justify="space-between">
                  <Row gap={spacing.md}>
                    <T size="base">{row.emoji}</T>
                    <T size="sm" weight="black" color={colors.slate[700]}>
                      {row.label}
                    </T>
                  </Row>
                  <T size="sm" color={colors.slate[300]}>
                    {isRTL ? '‹' : '›'}
                  </T>
                </Row>
              </Pressable>
            </View>
          ))}
        </Card>

        {/* Language, laid out flat rather than behind a picker — the same
            decision the website's phone menu came to. */}
        <Card style={{ padding: spacing.lg }}>
          <T size="xs" weight="black" color={colors.slate[500]}>
            {t('language')}
          </T>
          <Row gap={spacing.sm} style={{ marginTop: spacing.md }}>
            {LANGUAGES.map(option => {
              const active = option.code === language;
              const Flag = FLAG_FOR[option.code];
              return (
                <Pressable
                  key={option.code}
                  onPress={() => setLanguage(option.code)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: active ? colors.candy[50] : colors.slate[50],
                    borderWidth: 1,
                    borderColor: active ? colors.candy[400] : colors.slate[200],
                  }}
                >
                  <Flag size={26} />
                  <T
                    size="xs"
                    weight="black"
                    color={active ? colors.candy[700] : colors.slate[500]}
                    style={{ marginTop: 2 }}
                  >
                    {option.label}
                  </T>
                </Pressable>
              );
            })}
          </Row>
        </Card>

        {settings.whatsappNumber ? (
          <Button
            full
            variant="secondary"
            title={t('whatsapp')}
            icon={<T size="base">💬</T>}
            onPress={openWhatsApp}
          />
        ) : null}

        {isSignedIn ? (
          <>
            <Divider spacingY={spacing.xs} />
            <Button
              full
              variant="ghost"
              title={t('signOut')}
              loading={signingOut}
              onPress={onSignOut}
            />
          </>
        ) : null}

        {settings.storeLogo ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xl, opacity: 0.5 }}>
            <Image
              source={settings.storeLogo}
              style={{ width: 44, height: 44 }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <T size="xs" weight="bold" color={colors.slate[400]} style={{ marginTop: spacing.sm }}>
              {settings.storeName || 'Galo Kids'}
            </T>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
