import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CategoryList } from '@/components/home/CategoryList';
import { DailySpendBars } from '@/components/home/DailySpendBars';
import { ExpenseList } from '@/components/home/ExpenseList';
import { MissedDayCard } from '@/components/home/MissedDayCard';
import { InstallAppCard } from '@/components/InstallAppCard';
import { PaceWarning } from '@/components/home/PaceWarning';
import { RefundCard } from '@/components/home/RefundCard';
import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { LockedFeature } from '@/components/plan/LockedFeature';
import { WrappedCard } from '@/components/home/WrappedCard';
import { ScanQueueList } from '@/components/scan/ScanQueueList';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Lottie } from '@/components/ui/Lottie';
import { IconButton } from '@/components/ui/IconButton';
import { CalendarBlankIcon, PlusIcon, WarningIcon } from '@/components/ui/icons';
import { Reveal } from '@/components/ui/Reveal';
import { Screen } from '@/components/ui/Screen';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { unloggedYesterday } from '@/domain/budget';
import { summarizeRefunds } from '@/domain/taxRefund';
import { useAppData } from '@/state/AppDataProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const planeAnimation = require('@/assets/lottie/plane.json');

export default function HomeScreen() {
  const router = useRouter();
  const { ready, trip, summary, expenses, saveFailed, today, access, expensesToDate, laterExpenseCount } = useAppData();
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
        <Card style={styles.noTrip}>
          <Lottie source={planeAnimation} size={200} height={140} loop style={styles.noTripArt} />
          <AppText variant="heading">No trip yet</AppText>
          <AppText color="muted">
            Tell ITER where you are going and how much you want to spend. It will work out what is safe to spend each day.
          </AppText>
          <Button label="Plan a trip" icon={PlusIcon} onPress={planTrip} />
        </Card>
      </Screen>
    );
  }

  const missedDay = unloggedYesterday(summary);
  // Free version during a trip: the daily amount, warnings and tax refund need a pass; the
  // person's own records (spent, remaining, the lists) stay.
  const locked = access.level === 'free' && summary.phase === 'active';

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
      {laterExpenseCount > 0 ? (
        <View style={styles.dateNote} role="note">
          <CalendarBlankIcon size={20} color={colors.teal} />
          <AppText variant="caption" style={styles.saveWarningText}>
            {`Showing the trip as of ${formatDayMonth(today)}. ${laterExpenseCount} ${laterExpenseCount === 1 ? 'expense is' : 'expenses are'} dated later and will appear as the app date moves on (Me → App date).`}
          </AppText>
        </View>
      ) : null}
      <Reveal index={0}>
        {locked ? (
          <LockedFeature
            title="Safe to spend needs a pass"
            body={`Day ${summary.dayNumber} of ${summary.totalDays}. Get a Day Pass or a 7-Day Pass to see what is safe to spend today, with warnings before you run short.`}>
            <View style={styles.lockedFigures}>
              <View style={styles.flex}>
                <AppText variant="caption" color="muted">
                  Spent so far
                </AppText>
                <AppText variant="number">{formatMoney(summary.spentMyr, 'MYR', { trimZeros: true })}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="caption" color="muted">
                  Remaining
                </AppText>
                <AppText variant="number">{formatMoney(summary.remainingMyr, 'MYR', { trimZeros: true })}</AppText>
              </View>
            </View>
          </LockedFeature>
        ) : (
          <SafeToSpendCard trip={trip} summary={summary} />
        )}
      </Reveal>
      {summary.phase === 'ended' ? <WrappedCard city={trip.city} final /> : null}
      <Button label="Add an expense" variant="accent" icon={PlusIcon} onPress={() => router.push('/expense/new')} />
      <InstallAppCard dismissible />
      {locked ? null : (
        <>
          <RefundCard summary={summarizeRefunds(trip, expensesToDate)} trip={trip} today={today} />
          <PaceWarning summary={summary} />
        </>
      )}
      {missedDay ? <MissedDayCard day={missedDay} /> : null}
      <ScanQueueList tripId={trip.id} title="Receipts not saved yet" />
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
  noTrip: { gap: spacing.sm },
  dateNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.tile - 8, backgroundColor: colors.accentSoft },
  lockedFigures: { flexDirection: 'row', gap: spacing.lg },
  flex: { flex: 1 },
  noTripArt: { alignSelf: 'center' },
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
