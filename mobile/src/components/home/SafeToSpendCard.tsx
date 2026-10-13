import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { CheckCircleIcon, LightningIcon, MapPinIcon, WarningIcon, type Icon } from '@/components/ui/icons';
import { GlassPanel } from '@/components/ui/OceanCard';
import { PhotoCard } from '@/components/ui/PhotoCard';
import { findDestination } from '@/data/destinations';
import type { BudgetStatus, TripSummary } from '@/domain/budget';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { Trip } from '@/domain/types';
import { colors, spacing } from '@/theme/tokens';

const statusChips: Record<BudgetStatus, { label: string; icon: Icon; tone: ChipTone }> = {
  on_track: { label: 'On track', icon: CheckCircleIcon, tone: 'glass' },
  spending_fast: { label: 'Spending fast', icon: LightningIcon, tone: 'warning' },
  running_short: { label: 'Running short', icon: WarningIcon, tone: 'danger' },
};

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });
const days = (count: number) => (count === 1 ? '1 day' : `${count} days`);

function headline(trip: Trip, summary: TripSummary): { dayChip: string; amount: string; caption: string } {
  switch (summary.phase) {
    case 'upcoming':
      return {
        dayChip: `Starts ${formatDayMonth(trip.startDate)}`,
        amount: rm(summary.safePerDayMyr),
        caption: `a day across your ${days(summary.totalDays)}`,
      };
    case 'ended':
      return {
        dayChip: 'Trip ended',
        amount: rm(summary.remainingMyr),
        caption: summary.remainingMyr >= 0 ? 'left over from your budget' : 'over your budget',
      };
    case 'active':
      return {
        dayChip: `Day ${summary.dayNumber} of ${summary.totalDays}`,
        amount: rm(summary.safePerDayMyr),
        caption: summary.daysLeft === 1 ? 'left to spend today, your last day' : `a day for the next ${days(summary.daysLeft)}`,
      };
  }
}

/** The main card on Home: the safe-to-spend number over a photo of the destination. */
export function SafeToSpendCard({ trip, summary }: { trip: Trip; summary: TripSummary }) {
  const destination = findDestination(trip.destinationId);
  const { dayChip, amount, caption } = headline(trip, summary);
  const status = statusChips[summary.status];

  return (
    <PhotoCard photo={destination?.photo} photoAlt={destination?.photoAlt}>
      <View style={styles.chipRow}>
        <Chip tone="photo" icon={MapPinIcon} label={trip.city} />
        <Chip tone="photo" label={dayChip} />
      </View>
      {/* Leaves the top of the photo clear, so the destination is recognisable. */}
      <View style={styles.photoWindow} />
      <View accessible aria-label={`Safe to spend: ${amount} ${caption}`}>
        <AppText variant="display" color="inverse" style={styles.onPhoto}>
          {amount}
        </AppText>
        <AppText color="inverse" style={styles.onPhoto}>
          {caption}
        </AppText>
      </View>
      <GlassPanel style={styles.statRow}>
        <View style={styles.stat}>
          <AppText variant="caption" color="inverseMuted">
            Spent so far
          </AppText>
          <AppText variant="number" color="inverse">
            {rm(summary.spentMyr)}
          </AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <AppText variant="caption" color="inverseMuted">
            Remaining
          </AppText>
          <AppText variant="number" color="inverse">
            {rm(summary.remainingMyr)}
          </AppText>
        </View>
      </GlassPanel>
      {summary.phase === 'active' ? <Chip tone={status.tone} icon={status.icon} label={status.label} /> : null}
    </PhotoCard>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoWindow: { height: 112 },
  // A soft shadow keeps the white text readable where the photo is bright.
  onPhoto: { textShadowColor: 'rgba(5,59,80,0.55)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: spacing.xxs },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.glassBorder, marginHorizontal: spacing.lg },
});
