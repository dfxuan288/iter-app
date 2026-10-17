import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CheckIcon } from '@/components/ui/icons';
import { StackScreen } from '@/components/ui/StackScreen';
import { planConfig, passOffer, type PassKind } from '@/config/plans';
import { formatDayMonth, formatDayRange } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { pricePerDaySen, trialRange } from '@/domain/plan';
import { useAppData } from '@/state/AppDataProvider';
import { useSavedToast } from '@/state/SavedToastProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const rm = (sen: number) => formatMoney(sen, 'MYR');
const length = (days: number) => (days === 1 ? '1 day' : `${days} days in a row`);

/** Plans: the free trial and the passes, with a simulated purchase (no money moves). */
export default function PlansScreen() {
  const { access, data, today, trip } = useAppData();
  const { trial } = planConfig;
  const trialDays = trialRange(data.plan);
  const onTrial = access.level === 'full' && access.because === 'trial';
  const trialNote = onTrial
    ? `Active until ${formatDayMonth(trialDays!.end)}`
    : trialDays
      ? `Used ${formatDayRange(trialDays.start, trialDays.end)}`
      : trip && trip.startDate >= today
        ? `Starts on day 1 of your trip, ${formatDayMonth(trip.startDate)}`
        : 'Starts on the first day of your trip';
  const currentPass = access.level === 'full' && access.cover?.kind === 'pass' ? access.cover.pass.kind : null;

  return (
    <StackScreen title="Plans">
      <AppText variant="title">Pay only for the days you travel.</AppText>

      <Card style={styles.card}>
        <Header label={trial.label} yours={onTrial} />
        <AppText variant="heading">{trial.name}</AppText>
        <AppText variant="number">{`RM 0 · ${trial.days} days`}</AppText>
        <AppText color="muted">{trial.blurb}</AppText>
        <AppText variant="label" color={onTrial ? 'accent' : 'muted'}>
          {trialNote}
        </AppText>
      </Card>

      {planConfig.passOrder.map((kind) => (
        <PassCard key={kind} kind={kind} yours={currentPass === kind} />
      ))}

      <Card style={styles.card}>
        <AppText variant="heading">Every plan includes</AppText>
        {planConfig.includes.map((item) => (
          <View key={item} style={styles.includeRow}>
            <CheckIcon size={20} color={colors.accentText} weight="bold" />
            <AppText style={styles.flex}>{item}</AppText>
          </View>
        ))}
      </Card>

      <View style={styles.smallPrint}>
        <AppText variant="caption" color="muted">
          {planConfig.freeVersion}
        </AppText>
        <AppText variant="caption" color="muted">
          {`Unused passes expire ${planConfig.unusedPassExpiryMonths} months after purchase. A pass starts by itself on the first trip day not already covered.`}
        </AppText>
        <AppText variant="caption" color="muted">
          This is a prototype: buying is simulated and no money is taken.
        </AppText>
      </View>
    </StackScreen>
  );
}

function Header({ label, yours }: { label: string; yours: boolean }) {
  return (
    <View style={styles.header}>
      <Chip label={label} tone="neutral" />
      {yours ? <Chip label="Your plan" tone="success" /> : null}
    </View>
  );
}

function PassCard({ kind, yours }: { kind: PassKind; yours: boolean }) {
  const { buyPass } = useAppData();
  const { showSaved } = useSavedToast();
  const [confirming, setConfirming] = useState(false);
  const offer = passOffer(kind);
  const best = planConfig.bestValue === kind;

  return (
    <Card style={[styles.card, best ? styles.best : null]}>
      <Header label={offer.label} yours={yours} />
      <AppText variant="heading">{offer.name}</AppText>
      <AppText variant="number">{`${rm(offer.priceSen)} · ${length(offer.days)}`}</AppText>
      {offer.days > 1 ? <AppText color="muted">{`About ${rm(pricePerDaySen(kind))} a day.`}</AppText> : null}
      <AppText color="muted">{offer.blurb}</AppText>
      {confirming ? (
        <View style={styles.confirm} role="alert">
          <AppText variant="bodyStrong">{`Buy ${offer.name} for ${rm(offer.priceSen)}?`}</AppText>
          <View style={styles.confirmRow}>
            <View style={styles.flex}>
              <Button label="Cancel" variant="quiet" onPress={() => setConfirming(false)} />
            </View>
            <View style={styles.flex}>
              <Button
                label="Buy"
                variant="accent"
                onPress={() => {
                  buyPass(kind);
                  setConfirming(false);
                  showSaved(`${offer.name} added`);
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <Button label={`Buy ${offer.name}`} variant={best ? 'accent' : 'primary'} onPress={() => setConfirming(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  best: { borderWidth: 2, borderColor: colors.accent },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  includeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  confirm: { gap: spacing.md, padding: spacing.md, borderRadius: radius.tile - 8, backgroundColor: colors.surface },
  confirmRow: { flexDirection: 'row', gap: spacing.md },
  smallPrint: { gap: spacing.sm },
});
