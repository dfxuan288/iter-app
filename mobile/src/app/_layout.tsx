import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, useFonts } from '@expo-google-fonts/outfit';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppTabs } from '@/components/navigation/AppTabs';
import { colors, MAX_APP_WIDTH } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

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
  // If the font cannot load, carry on with the phone's own font rather than blocking the app.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={styles.backdrop} />;

  return (
    <ThemeProvider value={iterTheme}>
      <StatusBar style="dark" />
      {/* On a laptop or projector the app is shown as a centred phone-width column. */}
      <View style={styles.backdrop}>
        <View style={styles.app}>
          <AppTabs />
        </View>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, alignItems: 'center' },
  app: { flex: 1, width: '100%', maxWidth: MAX_APP_WIDTH, backgroundColor: colors.surface, overflow: 'hidden' },
});
