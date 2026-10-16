import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DownloadSimpleIcon, ExportIcon, PlusSquareIcon, XIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { promptInstall, useInstallWay } from '@/services/installApp';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

const DISMISSED_KEY = 'iter.installCard.dismissed';

/**
 * "Download ITER" (put it on the home screen so it opens full screen, like an app).
 * `dismissible` shows a close button and remembers it, for Home; the Me tab shows it always.
 * Hidden once ITER is opened from the home screen, and in the native app.
 */
export function InstallAppCard({ dismissible = false }: { dismissible?: boolean }) {
  const way = useInstallWay();
  const [showSteps, setShowSteps] = useState(false);
  const [dismissed, setDismissed] = useState<boolean | null>(dismissible ? null : false);

  useEffect(() => {
    if (!dismissible) return;
    let active = true;
    void AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => active && setDismissed(value === 'yes'))
      .catch(() => active && setDismissed(false));
    return () => {
      active = false;
    };
  }, [dismissible]);

  if (way === 'installed' || way === 'none' || dismissed !== false) return null;

  const dismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISSED_KEY, 'yes').catch(() => undefined);
  };
  const download = async () => {
    if (way === 'prompt') await promptInstall();
    else setShowSteps(true);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Image source={require('@/assets/images/icon-192.png')} style={styles.icon} accessibilityLabel="" />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Get the ITER app</AppText>
          <AppText variant="caption" color="muted">
            Free. Opens full screen from your home screen, like any app.
          </AppText>
        </View>
        {dismissible ? (
          <PressableScale onPress={dismiss} role="button" aria-label="Hide this" style={styles.close}>
            <XIcon size={20} color={colors.textMuted} />
          </PressableScale>
        ) : null}
      </View>

      {showSteps ? (
        way === 'ios' ? (
          <View style={styles.steps}>
            <Step n={1} icon={<ExportIcon size={22} color={colors.teal} weight="bold" />} text="Tap the Share button at the bottom of Safari." />
            <Step n={2} icon={<PlusSquareIcon size={22} color={colors.teal} weight="bold" />} text="Scroll down and tap “Add to Home Screen”, then “Add”." />
            <AppText variant="caption" color="muted">
              On iPhone this works in Safari. In another browser, open this page in Safari first.
            </AppText>
          </View>
        ) : (
          <View style={styles.steps}>
            <Step n={1} icon={<DownloadSimpleIcon size={22} color={colors.teal} weight="bold" />} text="Open your browser’s menu (⋮ or ⋯)." />
            <Step n={2} icon={<PlusSquareIcon size={22} color={colors.teal} weight="bold" />} text="Choose “Install app” or “Add to Home screen”." />
            <AppText variant="caption" color="muted">
              On a laptop, open the link on your phone to put ITER on your home screen.
            </AppText>
          </View>
        )
      ) : (
        <Button label="Download ITER" icon={DownloadSimpleIcon} variant="accent" onPress={download} />
      )}
    </Card>
  );
}

function Step({ n, icon, text }: { n: number; icon: ReactNode; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <AppText variant="label">{String(n)}</AppText>
      </View>
      {icon}
      <AppText style={styles.flex}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 12 },
  flex: { flex: 1 },
  close: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
