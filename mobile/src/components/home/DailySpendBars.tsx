import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { DailySpend } from '@/domain/budget';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { colors, radius, spacing } from '@/theme/tokens';

const BAR_AREA = 112;
const MIN_BAR = 6;

/** One bar per day of the trip, with today highlighted and the days to come left empty. */
export function DailySpendBars({ days }: { days: DailySpend[] }) {
  const highest = Math.max(1, ...days.map((day) => day.spentMyr));
  const today = days.find((day) => day.isToday);
  const description = days
    .filter((day) => !day.isFuture)
    .map((day) => `${formatDayMonth(day.date)}: ${formatMoney(day.spentMyr, 'MYR')}`)
    .join(', ');

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading">Each day</AppText>
        {today ? (
          <AppText color="muted">{`Today ${formatMoney(today.spentMyr, 'MYR', { trimZeros: true })}`}</AppText>
        ) : null}
      </View>
      <View style={styles.chart} accessible role="img" aria-label={`Spending each day. ${description}`}>
        {days.map((day) => {
          const height = day.isFuture ? MIN_BAR : Math.max(MIN_BAR, Math.round((day.spentMyr / highest) * BAR_AREA));
          return (
            <View key={day.date} style={styles.column}>
              <View style={styles.barArea}>
                <View
                  style={[
                    styles.bar,
                    { height },
                    day.isToday ? styles.barToday : day.isFuture ? styles.barFuture : styles.barPast,
                  ]}
                />
              </View>
              <AppText variant="caption" color={day.isToday ? 'primary' : 'muted'} style={day.isToday && styles.todayLabel}>
                {day.dayNumber}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs + 2, marginTop: spacing.md },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barArea: { height: BAR_AREA, alignSelf: 'stretch', justifyContent: 'flex-end' },
  bar: { borderRadius: radius.pill },
  barPast: { backgroundColor: colors.teal },
  barToday: { backgroundColor: colors.accent },
  barFuture: { backgroundColor: colors.surfaceSunken },
  todayLabel: { fontWeight: '700' },
});
