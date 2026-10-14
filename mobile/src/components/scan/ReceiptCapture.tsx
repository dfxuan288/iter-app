import { Asset } from 'expo-asset';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CameraIcon, ImageSquareIcon, SparkleIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { sampleReceipts, type SampleReceipt } from '@/data/sampleReceipts';
import { useScanQueue } from '@/state/ScanQueueProvider';
import { colors, radius, spacing } from '@/theme/tokens';

/** Take a photo, pick one from the gallery, or try a sample receipt. Each opens the review screen. */
export function ReceiptCapture() {
  const router = useRouter();
  const { startScan } = useScanQueue();
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const begin = async (getUri: () => Promise<{ uri: string; sampleId?: string } | null>) => {
    setMessage(null);
    let photo;
    try {
      photo = await getUri();
    } catch {
      setMessage('The camera or photos could not be opened. Check that ITER is allowed to use them.');
      return;
    }
    if (!photo) return;
    setPreparing(true);
    const result = await startScan(photo);
    setPreparing(false);
    if (result.ok) router.push({ pathname: '/scan/[id]', params: { id: result.id } });
    else setMessage(result.message);
  };

  const fromCamera = () =>
    begin(async () => {
      // A phone browser asks for camera access itself; the native app needs to ask first.
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMessage('ITER needs the camera to scan receipts. You can allow it in your phone’s settings, or choose a photo instead.');
          return null;
        }
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      return result.canceled ? null : result.assets[0] ? { uri: result.assets[0].uri } : null;
    });

  const fromGallery = () =>
    begin(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      return result.canceled ? null : result.assets[0] ? { uri: result.assets[0].uri } : null;
    });

  const fromSample = (sample: SampleReceipt) =>
    begin(async () => {
      const asset = await Asset.fromModule(sample.image as number).downloadAsync();
      return { uri: asset.localUri ?? asset.uri, sampleId: sample.id };
    });

  return (
    <View style={styles.stack}>
      <Card style={styles.card}>
        <AppText variant="heading">Scan a receipt</AppText>
        <AppText color="muted">Fit the whole receipt in the photo, flat and in good light. You check everything before it is saved.</AppText>
        {preparing ? (
          <View style={styles.preparing} aria-live="polite">
            <ActivityIndicator color={colors.teal} />
            <AppText color="muted">Getting the photo ready</AppText>
          </View>
        ) : (
          <>
            <Button label="Take a photo" icon={CameraIcon} onPress={fromCamera} />
            <Button label="Choose from photos" icon={ImageSquareIcon} variant="quiet" onPress={fromGallery} />
          </>
        )}
        {message ? (
          <AppText color="danger" role="alert">
            {message}
          </AppText>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <View style={styles.sampleHeader}>
          <SparkleIcon size={20} color={colors.accentText} weight="fill" />
          <AppText variant="heading">No receipt to hand?</AppText>
        </View>
        <AppText color="muted">Try a sample. It is read by the real AI, just like a photo.</AppText>
        <View style={styles.samples}>
          {sampleReceipts.map((sample) => (
            <PressableScale
              key={sample.id}
              onPress={() => fromSample(sample)}
              disabled={preparing}
              role="button"
              aria-label={`Scan the sample receipt: ${sample.title}. ${sample.detail}`}
              style={styles.sample}>
              <Image source={sample.image} style={styles.sampleImage} contentFit="cover" contentPosition="top" />
              <View style={styles.sampleText}>
                <AppText variant="bodyStrong">{sample.title}</AppText>
                <AppText variant="caption" color="muted">
                  {sample.detail}
                </AppText>
              </View>
            </PressableScale>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  card: { gap: spacing.md },
  preparing: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  sampleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  samples: { flexDirection: 'row', gap: spacing.md },
  sample: { flex: 1, borderRadius: radius.tile, backgroundColor: colors.surface, overflow: 'hidden' },
  sampleImage: { height: 120, backgroundColor: colors.surfaceSunken },
  sampleText: { padding: spacing.md, gap: spacing.xxs },
});
