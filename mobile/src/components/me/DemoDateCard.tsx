import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, CheckSquareIcon, SquareIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { defaultClock, DEMO_TODAY } from '@/config/demo';
import { formatDayMonth, weekdayShort } from '@/domain/dates';
import { useAppData } from '@/state/AppDataProvider';
import { colors, MIN_TOUCH_TARGET, spacing } from '@/theme/tokens';

/**
 * The presenter's date control (brief §7 demo controls: "jump to any trip day"). Moving to the
 * next day shows the daily amount rebalancing; "Use the real date" makes trips planned with real
 * dates behave as they would on the phone.
 */
export function DemoDateCard() {
  const { clock, today, summary, shiftDay, setClock } = useAppData();
  const real = clock.mode === 'real';
  const where =
    summary?.phase === 'active'
      ? `day ${summary.dayNumber} of ${summary.totalDays} of your trip`
      : summary?.phase === 'upcoming'
        ? 'before your trip starts'
        : summary?.phase === 'ended'
          ? 'after your trip ended'
          : 'no trip planned';

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <CalendarBlankIcon size={22} color={colors.teal} weight="fill" />
        <AppText variant="heading" style={styles.flex}>
          App date
        </AppText>
      </View>
      <AppText variant="title" aria-live="polite">{`${weekdayShort(today)} ${formatDayMonth(today)} ${today.slice(0, 4)}`}</AppText>
      <AppText color="muted">{`${real ? 'The phone’s real date' : 'Demo date'}, ${where}.`}</AppText>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Button label="Previous day" icon={CaretLeftIcon} variant="quiet" onPress={() => shiftDay(-1)} />
        </View>
        <View style={styles.flex}>
          <Button label="Next day" icon={CaretRightIcon} onPress={() => shiftDay(1)} />
        </View>
      </View>
      {!real && today !== DEMO_TODAY ? (
        <Button label={`Back to ${formatDayMonth(DEMO_TODAY)}, the demo day`} variant="quiet" onPress={() => setClock(defaultClock)} />
      ) : null}

      <PressableScale
        onPress={() => setClock(real ? defaultClock : { mode: 'real' })}
        role="checkbox"
        aria-checked={real}
        aria-label="Use the phone’s real date"
        style={styles.toggle}>
        {real ? <CheckSquareIcon size={26} color={colors.accentText} weight="fill" /> : <SquareIcon size={26} color={colors.textMuted} />}
        <View style={styles.flex}>
          <AppText>Use the phone’s real date</AppText>
          <AppText variant="caption" color="muted">
            For trips you plan with real dates. The Tokyo demo is set in November 2026.
          </AppText>
        </View>
      </PressableScale>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET },
});
