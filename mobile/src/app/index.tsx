import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/theme/tokens';

export default function HomeScreen() {
  return (
    <Screen
      title="ITER"
      subtitle="Know what's safe to spend."
      header={
        <View style={styles.logoRow}>
          <Image
            source={require('@/assets/images/iter-symbol-white.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="ITER logo"
          />
        </View>
      }>
      <Card>
        <AppText variant="heading">The foundations are in place</AppText>
        <AppText color="muted">
          This is the app shell: the five tabs, the ITER colours and the connection to the server. Your trip and
          the safe-to-spend number arrive next.
        </AppText>
      </Card>
      <ComingSoon
        phase="Phase 1"
        features={[
          'Safe to spend per day, with spent and remaining',
          'Status: on track, spending fast or running short',
          'Daily spend bars and recent expenses',
          'Plan a trip: destination, dates, budget and categories',
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoRow: { marginTop: spacing.lg },
  logo: { width: 56, height: 70 },
});
