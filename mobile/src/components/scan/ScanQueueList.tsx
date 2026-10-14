import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CaretRightIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StoredImage } from '@/components/ui/StoredImage';
import type { PendingScan } from '@/services/scanQueue';
import { useScanQueue } from '@/state/ScanQueueProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

/** One line describing where a scan is up to. */
export function scanStatusText(item: PendingScan, online: boolean): string {
  switch (item.status) {
    case 'waiting':
      return online ? 'Sending' : 'Waiting to scan · will process when online';
    case 'scanning':
      return 'Reading the receipt';
    case 'ready':
      return 'Ready to check and save';
    case 'failed':
      return item.failure?.message ?? 'Could not be read';
  }
}

/** Receipts that have been photographed but not saved yet. Hidden when there are none. */
export function ScanQueueList({ tripId, title = 'Your receipts' }: { tripId?: string; title?: string }) {
  const router = useRouter();
  const { items, online } = useScanQueue();
  const shown = tripId ? items.filter((item) => item.tripId === tripId) : items;
  if (shown.length === 0) return null;

  return (
    <Card style={styles.card}>
      <AppText variant="heading">{title}</AppText>
      {shown.map((item) => {
        const status = scanStatusText(item, online);
        const name = item.scan?.receipt.merchantName ?? 'Receipt';
        return (
          <PressableScale
            key={item.id}
            onPress={() => router.push({ pathname: '/scan/[id]', params: { id: item.id } })}
            role="button"
            aria-label={`${name}: ${status}. Open.`}
            style={styles.row}>
            <StoredImage id={item.keepImageId ?? item.scanImageId} alt="" style={styles.thumb} />
            <View style={styles.text}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {name}
              </AppText>
              <AppText variant="caption" color={item.status === 'failed' ? 'danger' : item.status === 'ready' ? 'accent' : 'muted'} numberOfLines={2}>
                {status}
              </AppText>
            </View>
            <CaretRightIcon size={16} color={colors.textMuted} />
          </PressableScale>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET + spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.tile - 8 },
  text: { flex: 1 },
});
