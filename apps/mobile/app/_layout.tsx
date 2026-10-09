// apps/mobile/app/_layout.tsx
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreenNative from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { DatabaseProvider } from '@/core/db';
import { I18nProvider } from '@/core/i18n';
import { SessionProvider, useRouteGuard } from '@/core/session';
import { SyncProvider } from '@/core/sync';
import { fontAssets, theme } from '@/core/theme';
import { SplashScreen } from '@/modules/boot';
import { OfflineBanner } from '@/shared/ui';

void SplashScreenNative.preventAutoHideAsync();

/** Rendered inside the providers so the guard can read the session. */
function AppShell() {
  useRouteGuard();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.surface } }} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreenNative.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <I18nProvider>
      <DatabaseProvider fallback={<SplashScreen />}>
        <SessionProvider>
          <SyncProvider>
            <AppShell />
          </SyncProvider>
        </SessionProvider>
      </DatabaseProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
});
