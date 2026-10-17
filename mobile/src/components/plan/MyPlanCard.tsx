import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TicketIcon } from '@/components/ui/icons';
import { planConfig, passOffer } from '@/config/plans';
import { formatDayMonth, formatDayRange, formatFullDate } from '@/domain/dates';
import { savedForLater, trialRange } from '@/domain/plan';
import { useAppData } from '@/state/AppDataProvider';
import { spacing } from '@/theme/tokens';

/** Me tab: what covers today, when the trial was used, and passes saved for later. */
export function MyPlanCard() {
  const router = useRouter();
  const { access, data, today, trip, scansLeft } = useAppData();
  const trial = trialRange(data.plan);
  const saved = savedForLater(data.plan, today);

  let status: string;
  let detail: string | null = null;
  if (access.level === 'full' && access.cover?.kind === 'pass') {
    status = `${passOffer(access.cover.pass.kind).name}: Active until ${formatDayMonth(access.cover.range.end)}`;
  } else if (access.level === 'full' && access.cover?.kind === 'trial') {
    status = `${planConfig.trial.name}: Active until ${formatDayMonth(access.cover.range.end)}`;
    detail = `${scansLeft ?? planConfig.trial.scansPerDay} of ${planConfig.trial.scansPerDay} scans left today`;
  } else if (access.level === 'full') {
    status = trial ? 'Your next trip needs a pass' : `${planConfig.trial.name}: starts on day 1 of your trip`;
    if (trip && trip.startDate > today) detail = `Your trip starts on ${formatDayMonth(trip.startDate)}. Until then, everything is open for planning.`;
  } else {
    status = 'Free version';
    detail = 'Community and your own records. Get a pass for safe to spend, scanning and the rest.';
  }

  return (
    <Card style={styles.card}>
      <AppText variant="heading">My plan</AppText>
      <AppText variant="bodyStrong">{status}</AppText>
      {detail ? <AppText color="muted">{detail}</AppText> : null}
      {trial && !(access.level === 'full' && access.cover?.kind === 'trial') ? (
        <AppText color="muted">{`${planConfig.trial.name} used ${formatDayRange(trial.start, trial.end)}`}</AppText>
      ) : null}
      {saved.map((group) => (
        <AppText key={group.kind} color="muted">
          {`Saved for later: ${group.count} × ${passOffer(group.kind).name} · Expires ${formatFullDate(group.expiresOn)}`}
        </AppText>
      ))}
      <Button label="See plans" icon={TicketIcon} variant="quiet" onPress={() => router.push('/plans')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
});
