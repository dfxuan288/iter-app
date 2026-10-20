import { StyleSheet, View } from 'react-native';

import { AnimatedMoney } from '@/components/ui/AnimatedMoney';
import { AppText } from '@/components/ui/AppText';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { CheckCircleIcon, LightningIcon, MapPinIcon, WarningIcon, type Icon } from '@/components/ui/icons';
import { GlassPanel } from '@/components/ui/OceanCard';
import { PhotoCard } from '@/components/ui/PhotoCard';
import { LAUNCH_CARD_ID } from '@/components/launch/launchContent';
import { findDestination } from '@/data/destinations';
import type { BudgetStatus, TripSummary } from '@/domain/budget';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { Trip } from '@/domain/types';
import { colors, radius, spacing } from '@/theme/tokens';

const statusChips: Record<BudgetStatus, { label: string; icon: Icon; tone: ChipTone }> = {
  on_track: { label: 'On track', icon: CheckCircleIcon, tone: 'glass' },
  spending_fast: { label: 'Spending fast', icon: LightningIcon, tone: 'warning' },
  running_short: { label: 'Running short', icon: WarningIcon, tone: 'danger' },
};

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });
/** Long amounts (thousands with sen, e.g. RM 1,038.03) step down a size so they stay on one line. */
const statSize = (sen: number) => (rm(sen).length > 9 ? styles.statLong : null);
const days = (count: number) => (count === 1 ? '1 day' : `${count} days`);

interface Headline {
  dayChip: string;
  /** Sen, shown large. */
  amountSen: number;
  caption: string;
  /** The "left today" line: the amount (sen), the words around it, and whether today went over. */
  today?: { sen: number; template: (amount: string) => string; over: boolean };
}

function headline(trip: Trip, summary: TripSummary): Headline {
  switch (summary.phase) {
    case 'upcoming':
      return {
        dayChip: `Starts ${formatDayMonth(trip.startDate)}`,
        amountSen: summary.safePerDayMyr,
        caption: `a day across your ${days(summary.totalDays)}`,
      };
    case 'ended':
      return {
        dayChip: 'Trip ended',
        amountSen: Math.abs(summary.remainingMyr),
        caption: summary.remainingMyr >= 0 ? 'left over from your budget' : 'over your budget',
      };
    case 'active': {
      // The daily amount is set each morning and stays put all day; today's spending shows on the line under it.
      const lastDay = summary.daysLeft === 1;
      const over = summary.leftTodayMyr < 0;
      return {
        dayChip: `Day ${summary.dayNumber} of ${summary.totalDays}`,
        amountSen: summary.safePerDayMyr,
        caption: lastDay ? 'to spend today, your last day' : `a day across your ${days(summary.daysLeft)} left`,
        today: {
          sen: Math.abs(summary.leftTodayMyr),
          template: over ? (amount) => `${amount} over today's amount${lastDay ? '' : ', so tomorrow gets less'}` : (amount) => `${amount} left today`,
          over,
        },
      };
    }
  }
}

/** The main card on Home: the safe-to-spend number over a photo of the destination. */
export function SafeToSpendCard({ trip, summary }: { trip: Trip; summary: TripSummary }) {
  const destination = findDestination(trip.destinationId);
  const { dayChip, amountSen, caption, today } = headline(trip, summary);
  const todayText = today ? today.template(rm(today.sen)) : '';
  const status = statusChips[summary.status];

  return (
    <PhotoCard photo={destination?.photo} photoAlt={destination?.photoAlt} nativeID={LAUNCH_CARD_ID}>
      <View style={styles.chipRow}>
        <Chip tone="photo" icon={MapPinIcon} label={trip.city} />
        <Chip tone="photo" label={dayChip} />
      </View>
      {/* Leaves the top of the photo clear, so the destination is recognisable. */}
      <View style={styles.photoWindow} />
      <View accessible aria-label={`Safe to spend: ${rm(amountSen)} ${caption}.${today ? ` ${todayText}.` : ''}`}>
        <AnimatedMoney sen={amountSen} variant="display" color="inverse" style={styles.onPhoto} />
        <AppText color="inverse" style={styles.onPhoto}>
          {caption}
        </AppText>
        {today ? (
          // Highlighted so today's position stands out: green while within today's amount, amber once over it.
          <View style={[styles.todayPill, today.over ? styles.todayPillOver : null]}>
            <AnimatedMoney sen={today.sen} template={today.template} variant="bodyStrong" style={{ color: today.over ? colors.warning : colors.navy }} />
          </View>
        ) : null}
      </View>
      <GlassPanel style={styles.statRow}>
        <View style={styles.stat}>
          <AppText variant="caption" color="inverseMuted">
            Spent so far
          </AppText>
          <AnimatedMoney sen={summary.spentMyr} variant="number" color="inverse" style={statSize(summary.spentMyr)} />
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <AppText variant="caption" color="inverseMuted">
            Total remaining
          </AppText>
          <AnimatedMoney sen={summary.remainingMyr} variant="number" color="inverse" style={statSize(summary.remainingMyr)} />
        </View>
      </GlassPanel>
      {summary.phase === 'active' ? <Chip tone={status.tone} icon={status.icon} label={status.label} /> : null}
    </PhotoCard>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoWindow: { height: 112 },
  todayPill: { alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.accent },
  todayPillOver: { backgroundColor: colors.warningSurface },
  // A soft shadow keeps the white text readable where the photo is bright.
  onPhoto: { textShadowColor: 'rgba(5,59,80,0.55)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: spacing.xxs },
  statLong: { fontSize: 18, lineHeight: 28 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.glassBorder, marginHorizontal: spacing.lg },
});
