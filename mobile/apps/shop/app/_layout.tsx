import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider } from '@/state/useAccount';
import { BasketProvider } from '@/state/useBasket';
import { WishlistProvider } from '@/state/useWishlist';
import { colors } from '@/theme';

/**
 * The shell.
 *
 * No sign-in gate: browsing needs no account, and a wall in front of the
 * catalogue is the quickest way to lose a shopper who was only looking. The
 * app asks who they are at checkout and not before.
 */

// Held so the first frame a shopper sees is the real one. Without this the app
// paints once in the system font and again in IBM Plex a moment later, and
// every heading visibly jumps.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    'IBMPlexSansArabic-Regular': require('../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
    'IBMPlexSansArabic-Medium': require('../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
    'IBMPlexSansArabic-SemiBold': require('../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
    'IBMPlexSansArabic-Bold': require('../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
  });

  useEffect(() => {
    // A font that will not load is not a reason to show a shopper nothing at
    // all: the app is perfectly usable in the system face, so let it through
    // and let the splash go either way.
    if (fontsReady || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, fontError]);

  if (!fontsReady && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AccountProvider>
        <BasketProvider>
          <WishlistProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </WishlistProvider>
        </BasketProvider>
      </AccountProvider>
    </SafeAreaProvider>
  );
}
