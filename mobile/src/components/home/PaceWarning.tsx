import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { WarningIcon } from '@/components/ui/icons';
import type { TripSummary } from '@/domain/budget';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { colors, radius, spacing } from '@/theme/tokens';

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });

/** What to tell the user about their pace, or null when there is nothing to warn about. */
export function paceMessage(summary: TripSummary): { title: string; body: string; tone: 'warning' | 'danger' } | null {
  if (summary.phase !== 'active') return null;
  const { forecast } = summary;

  if (summary.status === 'running_short') {
    return {
      tone: 'danger',
      title: 'Running short',
      body: `What is left (${rm(summary.remainingMyr)}) no longer covers your stay, transport and reserve. Try to hold spending until you have checked your plan.`,
    };
  }
  if (forecast.runOutDayNumber !== null && forecast.runOutDate !== null && forecast.runOutDayNumber <= summary.totalDays) {
    return {
      tone: 'warning',
      title: `At this pace, money runs out on day ${forecast.runOutDayNumber}`,
      body: `Leaving out your stay and transport, you are averaging ${rm(forecast.burnRateMyr)} a day. Keeping to ${rm(summary.safePerDayMyr)} a day gets you to the end of the trip (${formatDayMonth(forecast.runOutDate)} is when it would run out).`,
    };
  }
  if (summary.status === 'spending_fast') {
    return {
      tone: 'warning',
      title: 'Spending faster than planned',
      body: `You planned about ${rm(summary.plannedPerDayMyr)} a day. To finish the trip comfortably, keep to ${rm(summary.safePerDayMyr)} a day from here.`,
    };
  }
  return null;
}

export function PaceWarning({ summary }: { summary: TripSummary }) {
  const message = paceMessage(summary);
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
