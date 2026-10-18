import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { InstallAppCard } from '@/components/InstallAppCard';
import { DemoDateCard } from '@/components/me/DemoDateCard';
import { MyPlanCard } from '@/components/plan/MyPlanCard';
import { WrappedCard } from '@/components/home/WrappedCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, type ChipTone } from '@/components/ui/Chip';
import { ArrowsClockwiseIcon, PlayIcon } from '@/components/ui/icons';
import { Screen } from '@/components/ui/Screen';
import { env } from '@/config/env';
import { formatDayMonth } from '@/domain/dates';
import { useAppData } from '@/state/AppDataProvider';
import { useCommunity } from '@/state/CommunityProvider';
import { useLaunch } from '@/state/LaunchProvider';
import { healthService, type ServerHealth } from '@/services/healthService';
import type { RequestFailure, RequestResult } from '@/services/http';
import { colors, spacing } from '@/theme/tokens';

type ServerState = { kind: 'checking' } | { kind: 'connected'; health: ServerHealth } | { kind: 'failed'; reason: RequestFailure };

const failureMessages: Record<RequestFailure, string> = {
  offline: 'The server could not be reached. Check your internet connection, or that the server is running.',
  timeout: 'The server took too long to answer. Please try again.',
  server: 'The server reported a problem. Please try again in a moment.',
  invalid_response: 'Something answered, but it was not the ITER server.',
};

function toServerState(result: RequestResult<ServerHealth>): ServerState {
  return result.ok ? { kind: 'connected', health: result.data } : { kind: 'failed', reason: result.reason };
}

function describe(state: ServerState): { label: string; tone: ChipTone; detail: string } {
  switch (state.kind) {
    case 'checking':
      return { label: 'Checking…', tone: 'neutral', detail: 'Contacting the ITER server.' };
    case 'connected':
      return {
        label: 'Connected',
        tone: 'success',
        detail: state.health.aiConfigured
          ? `Server v${state.health.version}. AI scanning is ready.`
          : `Server v${state.health.version}. AI scanning is not set up yet (no API key on the server).`,
      };
    case 'failed':
      return { label: 'Not connected', tone: 'danger', detail: failureMessages[state.reason] };
  }
}

export default function MeScreen() {
  const [server, setServer] = useState<ServerState>({ kind: 'checking' });

  // The screen starts in the "checking" state, so the first check only needs to fetch.
  useEffect(() => {
    let active = true;
    void healthService.check().then((result) => {
      if (active) setServer(toServerState(result));
    });
    return () => {
      active = false;
    };
  }, []);

  const check = async () => {
    setServer({ kind: 'checking' });
    setServer(toServerState(await healthService.check()));
  };

  const status = describe(server);

  const { data, trip, summary, resetDemo } = useAppData();
  const community = useCommunity();
  const launch = useLaunch();
  const router = useRouter();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const pastTrips = data.trips.filter((t) => t.id !== trip?.id);

  return (
    <Screen title="Me" subtitle="Profile, plan and settings.">
      <Card>
        <AppText variant="heading">{data.user.displayName}</AppText>
        {trip ? <AppText color="muted">{`Current trip: ${trip.city}, ${formatDayMonth(trip.startDate)} to ${formatDayMonth(trip.endDate)}`}</AppText> : null}
        {pastTrips.length > 0 ? <AppText color="muted">{`Earlier trips: ${pastTrips.map((t) => t.city).join(', ')}`}</AppText> : null}
      </Card>
      {trip && summary && summary.phase !== 'upcoming' ? <WrappedCard city={trip.city} final={summary.phase === 'ended'} /> : null}
      <MyPlanCard />
      <InstallAppCard />
      <DemoDateCard />
      <Card>
        <AppText variant="heading">Demo data</AppText>
        <AppText color="muted">
          {confirmingReset
            ? 'This removes every trip, expense and community post you created on this phone and brings back the Tokyo demo. It cannot be undone.'
            : 'Put the app back to the Tokyo demo trip and the demo date, exactly as it was when first opened.'}
        </AppText>
        {confirmingReset ? (
          <View style={styles.confirmRow}>
            <View style={styles.confirmButton}>
              <Button label="Keep my data" variant="quiet" onPress={() => setConfirmingReset(false)} />
            </View>
            <View style={styles.confirmButton}>
              <Button
                label="Yes, reset"
                onPress={() => {
                  resetDemo();
                  community.reset();
                  setConfirmingReset(false);
                }}
              />
            </View>
          </View>
        ) : (
          <Button label="Reset the demo" variant="quiet" onPress={() => setConfirmingReset(true)} />
        )}
        <Button
          label="Replay the launch animation"
          icon={PlayIcon}
          variant="quiet"
          onPress={() => {
            // From Home, so the photo can land on Home's card.
            router.navigate('/');
            launch.replay();
          }}
        />
      </Card>
      <Card>
        <AppText variant="heading">Server connection</AppText>
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          <Chip label={status.label} tone={status.tone} />
          {server.kind === 'checking' ? <ActivityIndicator color={colors.teal} /> : null}
        </View>
        <AppText color="muted">{status.detail}</AppText>
        <Button
          label="Check again"
          icon={ArrowsClockwiseIcon}
          onPress={() => void check()}
          disabled={server.kind === 'checking'}
          accessibilityLabel="Check the server connection again"
        />
      </Card>
      <ComingSoon phase="Later" features={['Trip history', 'Settings: notifications, scan quality, privacy, delete my data']} />
      <AppText variant="caption" color="muted" align="center">
        {`ITER prototype v${env.appVersion} · demo data, no real money`}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  confirmRow: { flexDirection: 'row', gap: spacing.md },
  confirmButton: { flex: 1 },
});
