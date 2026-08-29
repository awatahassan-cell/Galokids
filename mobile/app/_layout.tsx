import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageProvider';
import { ShopProvider } from '../src/store/ShopProvider';
import { CartProvider } from '../src/store/CartProvider';
import { AuthProvider } from '../src/store/AuthProvider';
import { WelcomeScreen } from '../src/components/WelcomeScreen';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or the module is unavailable in this environment.
});

/**
 * Holds the splash screen until the saved language is known.
 *
 * Without this the app paints one frame left-to-right in English and then
 * snaps into Kurdish, which looks like a bug every single launch.
 */
const Gate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready } = useLanguage();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;
  return <>{children}</>;
};

/**
 * The welcome screen, on a first launch only.
 *
 * Rendered in place of the navigator rather than as a route inside it. A
 * route would need a redirect fired after the tabs had already mounted,
 * which means the home screen paints first in a language nobody has chosen
 * yet — and on a slow phone that frame is visible.
 *
 * A link that launched the app is not lost by this. The system holds it, and
 * `Linking.getInitialURL()` still returns it once the tabs mount, so someone
 * who taps a discount link and installs the app still lands on the offer
 * after choosing a language.
 */
const FirstRun: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasChosen } = useLanguage();

  if (!hasChosen) return <WelcomeScreen />;
  return <>{children}</>;
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <Gate>
            <ShopProvider>
              <AuthProvider>
                <CartProvider>
                  <StatusBar style="dark" />
                  <FirstRun>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'slide_from_right',
                      }}
                    >
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="product/[id]" />
                      <Stack.Screen name="order/[id]" />
                      <Stack.Screen name="checkout" options={{ animation: 'slide_from_bottom' }} />
                      <Stack.Screen name="auth/sign-in" options={{ animation: 'slide_from_bottom' }} />
                    </Stack>
                  </FirstRun>
                </CartProvider>
              </AuthProvider>
            </ShopProvider>
          </Gate>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
