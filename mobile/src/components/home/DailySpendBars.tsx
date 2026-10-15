import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { DailySpend } from '@/domain/budget';
import { formatDayMonth, weekdayShort } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

const BAR_AREA = 112;
const MIN_BAR = 6;
/** Room above the bars for the label of the bar being pointed at. */
const LABEL_ROOM = 44;

const describe = (day: DailySpend) =>
  `${weekdayShort(day.date)} ${formatDayMonth(day.date)}${day.isToday ? ' (today)' : ''}: ${day.isFuture ? 'still to come' : formatMoney(day.spentMyr, 'MYR')}`;

/**
 * One bar per day of the trip, with today highlighted and the days to come left empty. Hover
 * (laptop) or tap (phone) a bar to see that day's date and amount; each bar is also a button that
 * screen readers announce with the same words.
 */
export function DailySpendBars({ days }: { days: DailySpend[] }) {
  const [pointed, setPointed] = useState<string | null>(null);
  const highest = Math.max(1, ...days.map((day) => day.spentMyr));
  const today = days.find((day) => day.isToday);

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading">Each day</AppText>
        {today ? <AppText color="muted">{`Today ${formatMoney(today.spentMyr, 'MYR', { trimZeros: true })}`}</AppText> : null}
      </View>
      <AppText variant="caption" color="muted">
        Tap or point at a bar to see the day.
      </AppText>
      <View style={styles.chart} role="group" aria-label="Spending each day">
        {days.map((day, index) => {
          const height = day.isFuture ? MIN_BAR : Math.max(MIN_BAR, Math.round((day.spentMyr / highest) * BAR_AREA));
          const selected = pointed === day.date;
          // Labels near the right edge open leftwards, so they stay on screen.
          const anchor = index < days.length / 2 ? styles.labelLeft : styles.labelRight;
          return (
            <Pressable
              key={day.date}
              onHoverIn={() => setPointed(day.date)}
              onHoverOut={() => setPointed((current) => (current === day.date ? null : current))}
              onPress={() => setPointed(selected ? null : day.date)}
              role="button"
              aria-label={describe(day)}
              aria-pressed={selected}
              style={[styles.column, selected ? styles.columnSelected : null]}>
              <View style={styles.barArea}>
                {selected ? (
                  <View style={[styles.label, anchor, { bottom: height + spacing.sm }]} pointerEvents="none">
                    <AppText variant="caption" color="muted" numberOfLines={1}>
                      {`${weekdayShort(day.date)} ${formatDayMonth(day.date)}`}
                    </AppText>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {day.isFuture ? 'Still to come' : formatMoney(day.spentMyr, 'MYR')}
                    </AppText>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bar,
                    { height },
                    day.isToday ? styles.barToday : day.isFuture ? styles.barFuture : styles.barPast,
                    selected ? styles.barSelected : null,
                  ]}
                />
              </View>
              <AppText variant="caption" color={day.isToday ? 'primary' : 'muted'} style={day.isToday && styles.todayLabel}>
                {day.dayNumber}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs + 2, marginTop: LABEL_ROOM },
  // The whole column is the target, much bigger than the bar itself.
  column: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs, borderRadius: radius.tile - 8 },
  // Raised above the other columns so its label is not hidden behind their bars.
  columnSelected: { backgroundColor: colors.surface, zIndex: 2 },
  barArea: { height: BAR_AREA, alignSelf: 'stretch', justifyContent: 'flex-end' },
  bar: { borderRadius: radius.pill },
  barPast: { backgroundColor: colors.teal },
  barToday: { backgroundColor: colors.accent },
  barFuture: { backgroundColor: colors.surfaceSunken },
  barSelected: { backgroundColor: colors.navy },
  label: {
    position: 'absolute',
    zIndex: 2,
    minWidth: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.tile - 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  labelLeft: { left: 0 },
  labelRight: { right: 0 },
  todayLabel: { fontWeight: '700' },
});
