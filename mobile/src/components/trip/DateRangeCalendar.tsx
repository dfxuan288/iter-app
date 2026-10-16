import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { CaretLeftIcon, CaretRightIcon } from '@/components/ui/icons';
import { formatFullDate, formatMonthYear, isWithin, monthGrid, type IsoDate } from '@/domain/dates';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface DateRange {
  start: IsoDate | null;
  end: IsoDate | null;
}

export interface DateRangeCalendarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Days before this cannot be chosen. */
  minDate: IsoDate;
}

/** Tap the first day, then the last day. Tapping again starts a new range. */
export function nextRange(current: DateRange, tapped: IsoDate): DateRange {
  if (current.start === null || current.end !== null || tapped < current.start) return { start: tapped, end: null };
  return { start: current.start, end: tapped };
}

export function DateRangeCalendar({ value, onChange, minDate }: DateRangeCalendarProps) {
  const anchor = value.start ?? minDate;
  const [view, setView] = useState({ year: Number(anchor.slice(0, 4)), monthIndex: Number(anchor.slice(5, 7)) - 1 });
  const grid = monthGrid(view.year, view.monthIndex);

  const shift = (months: number) => {
    const moved = new Date(Date.UTC(view.year, view.monthIndex + months, 1));
    setView({ year: moved.getUTCFullYear(), monthIndex: moved.getUTCMonth() });
  };

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <IconButton icon={CaretLeftIcon} accessibilityLabel="Previous month" onPress={() => shift(-1)} />
        <AppText variant="heading" aria-live="polite">
          {formatMonthYear(view.year, view.monthIndex)}
        </AppText>
        <IconButton icon={CaretRightIcon} accessibilityLabel="Next month" onPress={() => shift(1)} />
      </View>
      <View style={styles.week}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={`${label}-${index}`} style={styles.cell}>
            <AppText variant="caption" color="muted">
              {label}
            </AppText>
          </View>
        ))}
      </View>
      {grid.weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((date, dayIndex) => {
            if (date === null) return <View key={`empty-${dayIndex}`} style={styles.cell} />;
            const disabled = date < minDate;
            const isStart = date === value.start;
            const isEnd = date === value.end;
            const isEdge = isStart || isEnd;
            const hasRange = value.start !== null && value.end !== null && value.start !== value.end;
            const inRange = hasRange && isWithin(date, value.start as IsoDate, value.end as IsoDate);
            return (
              <View key={date} style={styles.cell}>
                {/* The band runs behind the whole range, so it joins up with the first and last day's circles. */}
                {inRange ? <View style={[styles.band, isStart && styles.bandFromMiddle, isEnd && styles.bandToMiddle]} /> : null}
                <Pressable
                  disabled={disabled}
                  onPress={() => onChange(nextRange(value, date))}
                  role="button"
                  aria-label={`${formatFullDate(date)}${isStart ? ', first day' : isEnd ? ', last day' : inRange ? ', in your trip' : ''}`}
                  aria-disabled={disabled}
                  style={[styles.day, isEdge && styles.edge]}>
                  <AppText
                    variant={isEdge ? 'bodyStrong' : 'body'}
                    color={isEdge ? 'inverse' : disabled ? 'muted' : 'primary'}
                    style={disabled && styles.disabledText}>
                    {Number(date.slice(8, 10))}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.lg, gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', top: 2, bottom: 2, left: 0, right: 0, backgroundColor: colors.accentSoft },
  // The first day's band starts at its centre; the last day's stops at its centre, under the circles.
  bandFromMiddle: { left: '50%' },
  bandToMiddle: { right: '50%' },
  day: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  edge: { backgroundColor: colors.navy },
  disabledText: { opacity: 0.45 },
});
