import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { WarningIcon } from '@/components/ui/icons';
import type { TripSummary } from '@/domain/budget';
import { formatMoney } from '@/domain/money';
import { colors, radius, spacing } from '@/theme/tokens';

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });
const days = (count: number) => (count === 1 ? '1 day' : `${count} days`);

/**
 * What the status chip means, in plain words and with the card's own numbers (team review,
 * 20 Oct 2026), or null when on track. It replaces the old "money runs out on day N" forecast,
 * which used a different calculation and could contradict the card.
 */
export function statusMessage(summary: TripSummary): { title: string; body: string; tone: 'warning' | 'danger' } | null {
  if (summary.phase !== 'active' || summary.status === 'on_track') return null;
  const { daysAfterToday, tomorrowPerDayMyr, plannedPerDayMyr, safePerDayMyr, overTodayMyr, spendableLeftMyr, reserveMyr } = summary;
  const ahead = tomorrowPerDayMyr !== null && daysAfterToday > 0 ? `From tomorrow you have ${rm(tomorrowPerDayMyr)} a day for your last ${days(daysAfterToday)}` : null;

  if (spendableLeftMyr < 0) {
    return {
      tone: 'danger',
      title: 'You are using your reserve',
      body: `Your spending money is used up: you are ${rm(-spendableLeftMyr)} into the ${rm(reserveMyr)} you kept aside. Spend only what you must until the trip ends.`,
    };
  }
  if (summary.status === 'running_short') {
    return {
      tone: 'danger',
      title: 'Running short',
      body: `${ahead ?? 'Little is left'}, under half of the ${rm(plannedPerDayMyr)} a day you planned. Try to hold spending today.`,
    };
  }
  if (overTodayMyr > 0) {
    return {
      tone: 'warning',
      title: 'Over today’s amount',
      body: `You are ${rm(overTodayMyr)} over today’s ${rm(safePerDayMyr)}. ${ahead ? `${ahead}.` : 'It is the last day of your trip.'}`,
    };
  }
  return {
    tone: 'warning',
    title: 'Spending faster than planned',
    body: `${ahead ?? 'You have little left'}, below the ${rm(plannedPerDayMyr)} a day you planned.`,
  };
}

export function StatusWarning({ summary }: { summary: TripSummary }) {
  const message = statusMessage(summary);
  if (!message) return null;
  const danger = message.tone === 'danger';
  const ink = danger ? colors.danger : colors.warning;
  return (
    <View style={[styles.card, { backgroundColor: danger ? colors.dangerSurface : colors.warningSurface }]} role="alert">
      <WarningIcon size={24} color={ink} weight="fill" />
      <View style={styles.text}>
        <AppText variant="bodyStrong" style={{ color: ink }}>
          {message.title}
        </AppText>
        <AppText style={{ color: ink }}>{message.body}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.card, padding: spacing.xl },
  text: { flex: 1, gap: spacing.xs },
});
