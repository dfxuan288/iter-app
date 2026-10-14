import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { bundledPhoto, choosePhoto, takePhoto, type PickResult } from '@/components/scan/photoPicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CameraIcon, CaretRightIcon, ImageSquareIcon, SparkleIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StoredImage } from '@/components/ui/StoredImage';
import { sampleMenus, type SampleMenu } from '@/data/sampleMenus';
import type { CurrencyCode } from '@/domain/money';
import { useMenus } from '@/state/MenuProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

/** Photograph a menu (or try a sample) to see every dish translated, with Ringgit prices. */
export function MenuCapture({ tripId }: { tripId: string }) {
  const router = useRouter();
  const { menus, startMenuScan } = useMenus();
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recent = menus.filter((menu) => menu.tripId === tripId);

  const begin = async (pick: () => Promise<PickResult>, sample?: { id: string; currency: CurrencyCode }) => {
    setMessage(null);
    const photo = await pick();
    if (!photo) return;
    if ('error' in photo) {
      setMessage(photo.error);
      return;
    }
    setPreparing(true);
    const result = await startMenuScan({ uri: photo.uri, sampleId: sample?.id, currencyHint: sample?.currency });
    setPreparing(false);
    if (result.ok) router.push({ pathname: '/menu/[id]', params: { id: result.id } });
    else setMessage(result.message);
  };

  const fromSample = (sample: SampleMenu) => begin(() => bundledPhoto(sample.image), { id: sample.id, currency: sample.currency });

  return (
    <View style={styles.stack}>
      <Card style={styles.card}>
        <AppText variant="heading">Translate a menu</AppText>
        <AppText color="muted">See every dish in English with its price in Ringgit, tax and service included. Pork and alcohol are flagged where the menu makes it clear.</AppText>
        {preparing ? (
          <View style={styles.preparing} aria-live="polite">
            <ActivityIndicator color={colors.teal} />
            <AppText color="muted">Getting the photo ready</AppText>
          </View>
        ) : (
          <>
            <Button label="Take a photo" icon={CameraIcon} onPress={() => begin(takePhoto)} />
            <Button label="Choose from photos" icon={ImageSquareIcon} variant="quiet" onPress={() => begin(choosePhoto)} />
          </>
        )}
        {message ? (
          <AppText color="danger" role="alert">
            {message}
          </AppText>
        ) : null}
      </Card>

      {recent.length > 0 ? (
        <Card style={styles.card}>
          <AppText variant="heading">Your menus</AppText>
          {recent.map((menu) => {
            const name = menu.scan?.menu.restaurantName ?? 'Menu';
            const status = menu.status === 'reading' ? 'Translating' : menu.status === 'failed' ? (menu.failure?.message ?? 'Could not be read') : `${menu.scan?.menu.dishes.length ?? 0} dishes`;
            return (
              <PressableScale
                key={menu.id}
                onPress={() => router.push({ pathname: '/menu/[id]', params: { id: menu.id } })}
                role="button"
                aria-label={`${name}: ${status}. Open.`}
                style={styles.row}>
                <StoredImage id={menu.imageId} alt="" style={styles.thumb} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {name}
                  </AppText>
                  <AppText variant="caption" color={menu.status === 'failed' ? 'danger' : 'muted'} numberOfLines={2}>
                    {status}
                  </AppText>
                </View>
                <CaretRightIcon size={16} color={colors.textMuted} />
              </PressableScale>
            );
          })}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.sampleHeader}>
          <SparkleIcon size={20} color={colors.accentText} weight="fill" />
          <AppText variant="heading">No menu to hand?</AppText>
        </View>
        <AppText color="muted">Try a sample. It is read by the real AI, just like a photo.</AppText>
        <View style={styles.samples}>
          {sampleMenus.map((sample) => (
            <PressableScale
              key={sample.id}
              onPress={() => fromSample(sample)}
              disabled={preparing}
              role="button"
              aria-label={`Translate the sample menu: ${sample.title}. ${sample.detail}`}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET + spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.tile - 8 },
  flex: { flex: 1 },
  sampleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  samples: { flexDirection: 'row', gap: spacing.md },
  sample: { flex: 1, borderRadius: radius.tile, backgroundColor: colors.surface, overflow: 'hidden' },
  sampleImage: { height: 120, backgroundColor: colors.surfaceSunken },
  sampleText: { padding: spacing.md, gap: spacing.xxs },
});
