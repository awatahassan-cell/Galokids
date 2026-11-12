import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
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
export default function RootLayout() {
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
