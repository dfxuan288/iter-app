import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OceanCard } from '@/components/ui/OceanCard';
import { ConfettiIcon } from '@/components/ui/icons';
import { colors, spacing } from '@/theme/tokens';

/** The way into Trip Wrapped: on Home once a trip is over, and on Me during a trip ("so far"). */
export function WrappedCard({ city, final }: { city: string; final: boolean }) {
  const router = useRouter();
  return (
    <OceanCard style={styles.card}>
      <View style={styles.row}>
        <ConfettiIcon size={28} color={colors.white} weight="duotone" />
        <View style={styles.flex}>
          <AppText variant="heading" color="inverse">
            {final ? `Your ${city} trip, wrapped` : `Your ${city} trip so far`}
          </AppText>
          <AppText color="inverseMuted">{final ? 'Your biggest day, top spends and more, in a few cards.' : 'See your highlights until today, Wrapped style.'}</AppText>
        </View>
      </View>
      <Button label={final ? 'See Trip Wrapped' : 'See it wrapped'} variant="accent" onPress={() => router.push('/wrapped')} />
    </OceanCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xxs },
});
