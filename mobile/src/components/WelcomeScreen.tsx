import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Language } from '../i18n/strings';
import { useShop } from '../store/ShopProvider';
import { FLAG_FOR } from './Flags';

/**
 * The first thing a new customer sees: who the shop is, and a choice of
 * language.
 *
 * Deliberately not translated. Everything on it is shown in all three
 * languages at once, because the one thing that cannot be assumed here is
 * which language the reader has. Guessing from the phone's locale and
 * showing a Kurdish welcome to an Arabic speaker is the exact failure this
 * screen exists to prevent — the phone's locale is only used to decide which
 * card sits at the top.
 *
 * It appears once. After a choice is made the language is remembered, and it
 * can be changed at any time from the account screen — which the footer says,
 * in all three languages, so nobody worries they are choosing permanently.
 */

interface Choice {
  code: Language;
  title: string;
  subtitle: string;
}

const CHOICES: Choice[] = [
  { code: 'ku', title: 'کوردی', subtitle: 'بەرهەمەکان بە زمانی کوردی' },
  { code: 'ar', title: 'العربية', subtitle: 'المنتجات باللغة العربية' },
  { code: 'en', title: 'English', subtitle: 'Products in English' },
];

export const WelcomeScreen: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { settings } = useShop();
  const insets = useSafeAreaInsets();

  // A short fade on first paint. The screen replaces the splash, and cutting
  // straight from one to the other reads as a flicker.
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const onChoose = useCallback((code: Language) => setLanguage(code), [setLanguage]);

  // The phone's own language first, so the most likely choice is under the
  // thumb — without hiding the other two.
  const ordered = [...CHOICES].sort((a, b) =>
    a.code === language ? -1 : b.code === language ? 1 : 0
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.candy[50] }}>
      {/* Two soft blooms behind the card, the same wash the website uses. */}
      <View
        style={{
          position: 'absolute',
          top: -70,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: radius.pill,
          backgroundColor: colors.candy[200],
          opacity: 0.55,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 40,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: radius.pill,
          backgroundColor: colors.bubble[200],
          opacity: 0.5,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: Math.max(insets.bottom, spacing.xl),
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radius['3xl'],
              padding: spacing.xl,
              alignItems: 'center',
              ...shadow.md,
            }}
          >
            {settings.storeLogo ? (
              <Image
                source={settings.storeLogo}
                style={{ width: 78, height: 78, marginBottom: spacing.lg }}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <Text style={{ fontSize: 52, marginBottom: spacing.sm }}>🧸</Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.candy[50],
                borderColor: colors.candy[100],
                borderWidth: 1,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: 5,
              }}
            >
              <Text style={{ fontSize: 12 }}>✨</Text>
              <Text style={{ fontSize: 12, fontWeight: '900', color: colors.candy[700] }}>
                {settings.storeName
                  ? `${settings.storeName} · Galo Kids`
                  : 'Welcome to Galo Kids'}
              </Text>
            </View>

            {/* The heading, in all three. No `T` component here: this screen
                has no single direction to lay itself out in. */}
            <Text
              style={{
                fontSize: 21,
                lineHeight: 32,
                fontWeight: '900',
                color: colors.slate[900],
                textAlign: 'center',
                marginTop: spacing.lg,
              }}
            >
              تکایە زمانێک هەڵبژێرە
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 21,
                fontWeight: '700',
                color: colors.slate[500],
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              الرجاء اختيار اللغة · Please choose your language
            </Text>

            <View style={{ width: '100%', gap: spacing.md, marginTop: spacing.xl }}>
              {ordered.map(choice => {
                const Flag = FLAG_FOR[choice.code];
                return (
                <Pressable
                  key={choice.code}
                  onPress={() => onChoose(choice.code)}
                  accessibilityRole="button"
                  accessibilityLabel={choice.title}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    borderRadius: radius['2xl'],
                    borderWidth: 2,
                    borderColor: pressed ? colors.candy[400] : colors.slate[100],
                    backgroundColor: pressed ? colors.candy[50] : colors.slate[50],
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: radius.lg,
                      backgroundColor: colors.white,
                      borderWidth: 1,
                      borderColor: colors.slate[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Flag size={30} />
                  </View>

                  <View style={{ flex: 1 }}>
                    {/* Each card reads in its own language's direction. */}
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '900',
                        color: colors.slate[900],
                        textAlign: choice.code === 'en' ? 'left' : 'right',
                        writingDirection: choice.code === 'en' ? 'ltr' : 'rtl',
                      }}
                    >
                      {choice.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        lineHeight: 18,
                        fontWeight: '700',
                        color: colors.slate[400],
                        textAlign: choice.code === 'en' ? 'left' : 'right',
                        writingDirection: choice.code === 'en' ? 'ltr' : 'rtl',
                      }}
                    >
                      {choice.subtitle}
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: colors.slate[200],
                      backgroundColor: colors.white,
                    }}
                  />
                </Pressable>
                );
              })}
            </View>

            <Text
              style={{
                fontSize: 11,
                lineHeight: 18,
                fontWeight: '700',
                color: colors.slate[400],
                textAlign: 'center',
                marginTop: spacing.lg,
              }}
            >
              دواتریش دەتوانیت لە ڕێکخستنەکان زمان بگۆڕیت{'\n'}
              يمكنك تغيير اللغة لاحقاً · You can change this later
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};
