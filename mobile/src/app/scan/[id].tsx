import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { ReceiptItems } from '@/components/scan/ReceiptItems';
import { scanStatusText } from '@/components/scan/ScanQueueList';
import { ScanningPhoto } from '@/components/scan/ScanningPhoto';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ArrowCounterClockwiseIcon, HourglassIcon, PencilSimpleIcon, SparkleIcon, TrashIcon, WarningIcon, WifiSlashIcon } from '@/components/ui/icons';
import { StackScreen } from '@/components/ui/StackScreen';
import { draftFromScan, receiptDetailsFromScan, reviewHighlights } from '@/services/receiptReview';
import type { PendingScan } from '@/services/scanQueue';
import { useAppData } from '@/state/AppDataProvider';
import { useScanQueue } from '@/state/ScanQueueProvider';
import { colors, spacing } from '@/theme/tokens';

/**
 * One scanned receipt: the photo while it is read, then the review screen (brief §7.5 step 3).
 * Every field can be changed, and nothing is saved until "Save expense" is tapped.
 */
export default function ScanReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, online, retry, discard, finish } = useScanQueue();
  const item = items.find((candidate) => candidate.id === id);

  const close = (to: '/' | '/scan' = '/scan') => router.replace(to);

  if (!item) {
    return (
      <StackScreen title="Receipt">
        <Card style={styles.card}>
          <AppText variant="heading">This receipt is no longer here</AppText>
          <AppText color="muted">It may already have been saved or discarded.</AppText>
          <Button label="Back to Scan" onPress={() => close()} />
        </Card>
      </StackScreen>
    );
  }

  if (item.status === 'ready' && item.scan) {
    return <Review item={item} onSaved={() => finish(item.id)} onDiscard={() => {
      discard(item.id);
      close();
    }} />;
  }

  const scanning = item.status === 'scanning' || (item.status === 'waiting' && online);
  return (
    <StackScreen title="Receipt">
      <ScanningPhoto imageId={item.keepImageId ?? item.scanImageId} scanning={scanning} />
      <Card style={styles.card}>
        <View style={styles.statusRow} aria-live="polite">
          {item.status === 'failed' ? (
            <WarningIcon size={24} color={colors.danger} weight="fill" />
          ) : !online ? (
            <WifiSlashIcon size={24} color={colors.warning} />
          ) : (
            <HourglassIcon size={24} color={colors.teal} />
          )}
          <AppText variant="heading" style={styles.flex}>
            {item.status === 'failed' ? 'Could not read this receipt' : online ? 'Reading your receipt' : 'Waiting to scan'}
          </AppText>
        </View>
        <AppText color={item.status === 'failed' ? 'danger' : 'muted'}>
          {item.status === 'failed'
            ? scanStatusText(item, online)
            : online
              ? 'This usually takes a few seconds. You can leave this screen; it carries on and waits for you under Scan.'
              : 'You are offline. The photo is saved on your phone and will be read as soon as you are back online.'}
        </AppText>
        {item.status === 'failed' && item.failure?.canRetry ? <Button label="Try again" icon={ArrowCounterClockwiseIcon} onPress={() => retry(item.id)} /> : null}
        {item.status === 'failed' ? (
          <Button label="Type it in instead" icon={PencilSimpleIcon} variant="quiet" onPress={() => router.replace('/expense/new')} />
        ) : null}
        <Button
          label={item.status === 'failed' ? 'Discard this photo' : 'Back to Scan'}
          icon={item.status === 'failed' ? TrashIcon : undefined}
          variant="quiet"
          onPress={() => {
            if (item.status === 'failed') discard(item.id);
            close();
          }}
        />
      </Card>
    </StackScreen>
  );
}

function Review({ item, onSaved, onDiscard }: { item: PendingScan; onSaved: () => void; onDiscard: () => void }) {
  const router = useRouter();
  const { data, today, addExpense } = useAppData();
  const scan = item.scan;
  const trip = data.trips.find((t) => t.id === item.tripId);
  const initial = useMemo(() => (scan ? draftFromScan(scan, today) : undefined), [scan, today]);

  if (!scan || !trip || !initial) {
    return (
      <StackScreen title="Check receipt">
        <Card style={styles.card}>
          <AppText variant="heading">The trip for this receipt no longer exists</AppText>
          <Button label="Discard this receipt" variant="quiet" onPress={onDiscard} />
        </Card>
      </StackScreen>
    );
  }

  const highlights = reviewHighlights(scan, trip);
  const details = receiptDetailsFromScan(scan, item.keepImageId);
  const notes = scan.checks.filter((check) => !['date_outside_trip', 'date_missing'].includes(check.code));
  const readLabel = scan.readBy === 'demo' ? 'Sample answer (AI unavailable)' : scan.readBy === 'cache' ? 'Read by AI earlier' : 'Read by AI';

  return (
    <StackScreen title="Check receipt">
      <ScanningPhoto imageId={item.keepImageId ?? item.scanImageId} scanning={false} height={220} />
      <Card style={styles.card}>
        <View style={styles.statusRow}>
          <Chip tone="success" icon={SparkleIcon} label={readLabel} />
        </View>
        <AppText variant="heading">{scan.receipt.merchantName}</AppText>
        {scan.receipt.merchantNameOriginal ? <AppText color="muted">{scan.receipt.merchantNameOriginal}</AppText> : null}
        <ReceiptItems receipt={details} />
      </Card>

      {notes.length > 0 || Object.keys(highlights).length > 0 ? (
        <Card style={[styles.card, styles.notes]} role="alert">
          <View style={styles.statusRow}>
            <WarningIcon size={22} color={colors.warning} weight="fill" />
            <AppText variant="bodyStrong" color="warning" style={styles.flex}>
              Check the highlighted fields before saving
            </AppText>
          </View>
          {notes.map((check) => (
            <AppText key={check.code} color="warning">
              {check.message}
            </AppText>
          ))}
        </Card>
      ) : null}

      <ExpenseForm
        trip={trip}
        today={today}
        initial={initial}
        highlights={highlights}
        submitLabel="Save expense"
        onSubmit={(draft, rate) => {
          const result = addExpense(draft, rate, { source: 'scan', receipt: details });
          if (result.ok) {
            onSaved();
            router.replace('/');
          }
          return result;
        }}
      />
      <Button label="Discard this receipt" icon={TrashIcon} variant="quiet" onPress={onDiscard} />
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  notes: { backgroundColor: colors.warningSurface },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  flex: { flex: 1 },
});
