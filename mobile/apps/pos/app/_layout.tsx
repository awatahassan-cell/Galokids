import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useLayout } from '@galokids/core';
import { db } from '@/offline';
import { SessionProvider, useSession } from '@/state/useSession';
import { SyncProvider } from '@/state/useSync';
import { SideNav } from '@/navigation/Nav';
import { SyncBanner } from '@/components/SyncBanner';
import { ShellHeader } from '@/components/ShellHeader';
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
      {/* The navigator paints its own pale grey behind every screen unless told
          otherwise, which hid the shell's gradient and its cards. */}
      <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' } }}>
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </ThemeProvider>
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

  // Compact: the phone's own screens, on the same soft background.
  if (!wide) {
    return (
      <Backdrop>
        <SyncBanner />
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </Backdrop>
    );
  }

  // Wide: the panel's shell — a floating header and menu, and the section in
  // one large rounded card between them, on a pale blue wash.
  return (
    <Backdrop padded>
      <View style={{ flex: 1, flexDirection: 'row-reverse', gap: 24 }}>
        <SideNav />
        <View style={{ flex: 1, gap: 20, minWidth: 0 }}>
          <ShellHeader />
          <View style={shell.card}>
            <Slot />
          </View>
        </View>
      </View>
    </Backdrop>
  );
}

function Backdrop({ children, padded }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <LinearGradient
      colors={['#D2E0F2', '#E8EEF8', '#DFE9F5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, padding: padded ? 24 : 0 }}
    >
      {children}
    </LinearGradient>
  );
}

const shell = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    shadowColor: '#b4c3d7',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
});

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}
