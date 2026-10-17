import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LockSimpleIcon, TicketIcon } from '@/components/ui/icons';
import { colors, radius, spacing } from '@/theme/tokens';

export interface LockedFeatureProps {
  title: string;
  body: string;
  /** Anything that stays free, shown under the message (e.g. spent and remaining on Home). */
  children?: ReactNode;
}

/** Shown in place of a feature the free version does not include, with the way to unlock it. */
export function LockedFeature({ title, body, children }: LockedFeatureProps) {
  const router = useRouter();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <LockSimpleIcon size={22} color={colors.navy} weight="bold" />
        </View>
        <AppText variant="heading" style={styles.flex}>
          {title}
        </AppText>
      </View>
      <AppText color="muted">{body}</AppText>
      {children}
      <Button label="See plans" icon={TicketIcon} variant="accent" onPress={() => router.push('/plans')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
