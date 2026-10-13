import { DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AppTabs } from '@/components/navigation/AppTabs';
import { colors, MAX_APP_WIDTH } from '@/theme/tokens';

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
  return (
    <ThemeProvider value={iterTheme}>
      <StatusBar style="light" />
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
