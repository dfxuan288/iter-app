import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, useFonts } from '@expo-google-fonts/outfit';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppDataProvider } from '@/state/AppDataProvider';
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
        <StatusBar style="dark" />
        {/* On a laptop or projector the app is shown as a centred phone-width column. */}
        <View style={styles.backdrop}>
          <View style={styles.app}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
          </View>
        </View>
      </AppDataProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, alignItems: 'center' },
  app: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH, backgroundColor: colors.surface, overflow: 'hidden' },
});
