import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { db } from '@/offline';
import { SessionProvider, useSession } from '@/state/useSession';
import { SyncProvider } from '@/state/useSync';
import SignInScreen from '@/screens/SignInScreen';
import { colors } from '@/theme';

/**
 * The shell.
 *
 * The local database is opened before anything renders, because every screen
 * below reads from it and a till that shows an empty catalogue for a second
 * looks broken to a cashier mid-queue.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    db()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  if (!ready) return <Splash />;

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

  // Sync only runs once somebody is signed in: there is no point asking the
  // server for anything without a token, and the retry timer would spend the
  // battery of a till sitting unused in a back room.
  return (
    <SyncProvider enabled>
      <Stack screenOptions={{ headerShown: false }} />
    </SyncProvider>
  );
}

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}
