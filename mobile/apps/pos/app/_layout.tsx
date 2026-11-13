import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { useLayout } from '@galokids/core';
import { db } from '@/offline';
import { SessionProvider, useSession } from '@/state/useSession';
import { SyncProvider } from '@/state/useSync';
import { SideNav } from '@/navigation/Nav';
import { SyncBanner } from '@/components/SyncBanner';
import SignInScreen from '@/screens/SignInScreen';
import { colors } from '@/theme';

/**
 * The shell.
 *
 * The local database is opened before anything renders, because every screen
 * below reads from it and a till that shows an empty catalogue for a second
 * looks broken to a cashier mid-queue.
 *
 * On a wide screen the navigation is a rail that stays put; on a phone it is
 * the home screen and each section is pushed over it. One component tree,
 * because two would drift.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // The till's own face. A font that will not load is not a reason to show a
  // cashier nothing at all — the app is usable in the system face — so a
  // failure lets the shell through rather than holding it.
  const [fontsReady, fontError] = useFonts({
    'IBMPlexSansArabic-Regular': require('../assets/fonts/IBMPlexSansArabic-Regular.ttf'),
    'IBMPlexSansArabic-Medium': require('../assets/fonts/IBMPlexSansArabic-Medium.ttf'),
    'IBMPlexSansArabic-SemiBold': require('../assets/fonts/IBMPlexSansArabic-SemiBold.ttf'),
    'IBMPlexSansArabic-Bold': require('../assets/fonts/IBMPlexSansArabic-Bold.ttf'),
  });

  useEffect(() => {
    db().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  if (!ready || (!fontsReady && !fontError)) return <Splash />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { user, loading } = useSession();

  if (loading) return <Splash />;
  if (!user) return <SignInScreen />;

  // Sync only runs once somebody is signed in: there is nothing to ask the
  // server without a token, and the retry timer would spend the battery of a
  // till sitting unused in a back room.
  return (
    <SyncProvider enabled>
      <Frame />
    </SyncProvider>
  );
}

function Frame() {
  const { wide } = useLayout();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SyncBanner />
      <View style={{ flex: 1, flexDirection: 'row-reverse' }}>
        {wide && <SideNav />}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}
