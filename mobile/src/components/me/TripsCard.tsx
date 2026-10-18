import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CaretRightIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { formatDayRange, formatShortMonthYear } from '@/domain/dates';
import { formatMoney, sumMinor } from '@/domain/money';
import { tripsNewestFirst } from '@/services/tripService';
import { useAppData } from '@/state/AppDataProvider';
import { useSavedToast } from '@/state/SavedToastProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

/**
 * Me tab: trip history. Every saved trip with what was spent; tap one to make it the current trip.
 * The current trip can be removed here, after a confirmation (it deletes its expenses and photos).
 */
export function TripsCard() {
  const router = useRouter();
  const { data, trip, switchTrip, removeTrip } = useAppData();
  const { showSaved } = useSavedToast();
  const [confirming, setConfirming] = useState(false);
  const trips = tripsNewestFirst(data);
  const spentOn = (tripId: string) => sumMinor(data.expenses.filter((e) => e.tripId === tripId).map((e) => e.amountMyr));
  const currentCount = trip ? data.expenses.filter((e) => e.tripId === trip.id).length : 0;

  return (
    <Card style={styles.card}>
      <AppText variant="heading">Your trips</AppText>
      {trips.length === 0 ? <AppText color="muted">No trips yet. Plan one and it will be kept here.</AppText> : null}
      {trips.map((t) => {
        const current = t.id === trip?.id;
        const sameYear = t.startDate.slice(0, 4) === t.endDate.slice(0, 4);
        const when = `${formatDayRange(t.startDate, t.endDate)}${sameYear ? ` ${t.startDate.slice(0, 4)}` : ''}`;
        const label = `${t.city}, ${when}, ${formatMoney(spentOn(t.id), 'MYR', { trimZeros: true })} spent.${current ? ' Current trip.' : ' Tap to make it your current trip.'}`;
        return (
          <PressableScale
            key={t.id}
            disabled={current}
            onPress={() => {
              switchTrip(t.id);
              showSaved(`Switched to ${t.city}`);
              router.navigate('/');
            }}
            role="button"
            aria-label={label}
            style={[styles.row, current && styles.rowCurrent]}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{t.city}</AppText>
              <AppText variant="caption" color="muted">
                {`${t.city === t.country ? '' : `${t.country} · `}${when || formatShortMonthYear(t.startDate)}`}
              </AppText>
            </View>
            <View style={styles.right}>
              <AppText variant="bodyStrong">{formatMoney(spentOn(t.id), 'MYR', { trimZeros: true })}</AppText>
              {current ? <Chip label="Current" tone="success" /> : <CaretRightIcon size={16} color={colors.textMuted} />}
            </View>
          </PressableScale>
        );
      })}

      {trip && confirming ? (
        <View style={styles.confirm} role="alert">
          <AppText variant="bodyStrong">{`Remove your ${trip.city} trip?`}</AppText>
          <AppText color="muted">
            {`This deletes the trip, its ${currentCount} ${currentCount === 1 ? 'expense' : 'expenses'} and their receipt photos from this phone. It cannot be undone.`}
          </AppText>
          <View style={styles.confirmRow}>
            <View style={styles.flex}>
              <Button label="Keep it" variant="quiet" onPress={() => setConfirming(false)} />
            </View>
            <View style={styles.flex}>
              <Button
                label="Remove trip"
                onPress={() => {
                  removeTrip(trip.id);
                  setConfirming(false);
                  showSaved('Trip removed');
                }}
              />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Plan a trip" icon={PlusIcon} variant="quiet" onPress={() => router.push('/trip/new')} />
        {trip && !confirming ? <Button label="Remove this trip" icon={TrashIcon} variant="quiet" onPress={() => setConfirming(true)} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET + spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.tile - 8,
    backgroundColor: colors.surface,
  },
  rowCurrent: { backgroundColor: colors.accentSoft },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: spacing.xxs },
  confirm: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.tile - 8, backgroundColor: colors.surface },
  confirmRow: { flexDirection: 'row', gap: spacing.md },
  actions: { gap: spacing.sm },
});
