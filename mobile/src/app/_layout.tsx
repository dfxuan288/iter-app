import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, useFonts } from '@expo-google-fonts/outfit';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppDataProvider } from '@/state/AppDataProvider';
import { CommunityProvider } from '@/state/CommunityProvider';
import { FxProvider } from '@/state/FxProvider';
import { MenuProvider } from '@/state/MenuProvider';
import { SavedToastProvider } from '@/state/SavedToastProvider';
import { ScanQueueProvider } from '@/state/ScanQueueProvider';
import { colors, MAX_APP_WIDTH } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

const FONT_WAIT_MS = 1500;

const iterTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.teal,
    background: colors.surface,
    card: colors.card,
    text: colors.navy,
    border: colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });
  const [waitedLongEnough, setWaitedLongEnough] = useState(false);
  // If the font fails or is slow (poor signal), carry on with the phone's own font rather than
  // holding the app on a blank screen. The headings switch to Outfit when it arrives.
  const ready = fontsLoaded || fontError !== null || waitedLongEnough;

  useEffect(() => {
    const timer = setTimeout(() => setWaitedLongEnough(true), FONT_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={styles.backdrop} />;

  return (
    <ThemeProvider value={iterTheme}>
      <AppDataProvider>
        <FxProvider>
          <ScanQueueProvider>
            <MenuProvider>
              <CommunityProvider>
                <StatusBar style="dark" />
                {/* On a laptop or projector the app is shown as a centred phone-width column. */}
                <View style={styles.backdrop}>
                  <View style={styles.app}>
                    <SavedToastProvider>
                      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.surface } }} />
                    </SavedToastProvider>
                  </View>
                </View>
              </CommunityProvider>
            </MenuProvider>
          </ScanQueueProvider>
        </FxProvider>
      </AppDataProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, alignItems: 'center' },
  app: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH, backgroundColor: colors.surface, overflow: 'hidden' },
});
