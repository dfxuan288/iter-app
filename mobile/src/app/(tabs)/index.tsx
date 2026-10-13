import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CategoryList } from '@/components/home/CategoryList';
import { DailySpendBars } from '@/components/home/DailySpendBars';
import { ExpenseList } from '@/components/home/ExpenseList';
import { PaceWarning } from '@/components/home/PaceWarning';
import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { PlusIcon, WarningIcon } from '@/components/ui/icons';
import { Reveal } from '@/components/ui/Reveal';
import { Screen } from '@/components/ui/Screen';
import { formatDayMonth } from '@/domain/dates';
import { useAppData } from '@/state/AppDataProvider';
import { colors, radius, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { ready, trip, summary, expenses, saveFailed } = useAppData();
  const planTrip = () => router.push('/trip/new');

  const brand = (
    <View style={styles.brandRow}>
      <View style={styles.logoTile}>
        <Image
          source={require('@/assets/images/iter-symbol.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="ITER logo"
        />
      </View>
      <View style={styles.brandText}>
        <AppText variant="heading">ITER</AppText>
        <AppText variant="caption" color="muted">
          Smarter journeys. Safer spends.
        </AppText>
      </View>
      <IconButton icon={PlusIcon} accessibilityLabel="Plan a new trip" onPress={planTrip} />
    </View>
  );

  if (!ready) {
    return (
      <Screen title="Safe to spend" top={brand}>
        <View style={styles.skeletonHero} accessible aria-label="Loading your trip" />
        <View style={styles.skeletonCard} />
      </Screen>
    );
  }

  if (!trip || !summary) {
    return (
      <Screen title="Safe to spend" top={brand}>
        <Card>
          <AppText variant="heading">No trip yet</AppText>
          <AppText color="muted">
            Tell ITER where you are going and how much you want to spend. It will work out what is safe to spend each day.
          </AppText>
          <Button label="Plan a trip" icon={PlusIcon} onPress={planTrip} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="Safe to spend"
      subtitle={`${trip.city}, ${formatDayMonth(trip.startDate)} to ${formatDayMonth(trip.endDate)}`}
      top={brand}>
      {saveFailed ? (
        <View style={styles.saveWarning} role="alert">
          <WarningIcon size={20} color={colors.warning} weight="fill" />
          <AppText variant="caption" style={styles.saveWarningText}>
            Your latest change could not be saved on this phone. It will be kept while the app stays open.
          </AppText>
        </View>
      ) : null}
      <Reveal index={0}>
        <SafeToSpendCard trip={trip} summary={summary} />
      </Reveal>
      <PaceWarning summary={summary} />
      <Reveal index={1}>
        <DailySpendBars days={summary.dailySpend} />
      </Reveal>
      <Reveal index={2}>
        <CategoryList categories={summary.categories} />
      </Reveal>
      <Reveal index={3}>
        <ExpenseList expenses={expenses} />
      </Reveal>
    </Screen>
  );
}

const TILE = 48;

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandText: { flex: 1 },
  logoTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 26, height: 32 },
  skeletonHero: { height: 380, borderRadius: radius.card, backgroundColor: colors.surfaceSunken },
  skeletonCard: { height: 180, borderRadius: radius.card, backgroundColor: colors.surfaceSunken },
  saveWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSurface,
    borderRadius: radius.tile,
    padding: spacing.md,
  },
  saveWarningText: { flex: 1, color: colors.warning },
});
