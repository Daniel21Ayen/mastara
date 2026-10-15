import 'expo-blob';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreenNative from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { env } from '@/core/config/env';
import { DatabaseProvider } from '@/core/db';
import { I18nProvider } from '@/core/i18n';
import { ContentProtection } from '@/core/security';
import { SessionProvider, useRouteGuard, useSession } from '@/core/session';
import { SyncProvider } from '@/core/sync';
import { createStyles, fontAssets, ThemeProvider, useTheme } from '@/core/theme';
import { DatabaseErrorScreen, SplashScreen } from '@/modules/boot';
import { OfflineBanner } from '@/shared/ui';

void SplashScreenNative.preventAutoHideAsync();

/** Rendered inside the providers so the guard can read the session. */
function AppShell() {
  const theme = useTheme();
  const styles = useStyles();
  useRouteGuard();
  const { user } = useSession();
  // Behind every screen: white in light mode, the dark page colour in dark mode (no flash between screens).
  const base = theme.scheme === 'dark' ? theme.colors.background : theme.colors.surface;

  return (
    <View style={[styles.root, { backgroundColor: base }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
      <View style={[styles.root, { backgroundColor: base }]}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: base } }} />
      </View>
      {env.protectContent && user ? <ContentProtection identifier={user.identifier} /> : null}
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
    <ThemeProvider>
    <I18nProvider>
      <DatabaseProvider
        fallback={<SplashScreen />}
        renderError={({ onRetry, onReset }) => <DatabaseErrorScreen onRetry={onRetry} onReset={onReset} />}
      >
        <SessionProvider>
          <SyncProvider>
            <AppShell />
          </SyncProvider>
        </SessionProvider>
      </DatabaseProvider>
    </I18nProvider>
    </ThemeProvider>
  );
}

const useStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.surface },
}));
