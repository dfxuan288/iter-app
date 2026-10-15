import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NotePencilIcon } from '@/components/ui/icons';
import { formatDayMonth, weekdayShort, type IsoDate } from '@/domain/dates';
import { colors, spacing } from '@/theme/tokens';

/**
 * "Nothing logged for Sun 15 Nov. Forgot something?" Adding a forgotten expense for an earlier
 * day lowers today's daily amount straight away, because that money has already gone.
 */
export function MissedDayCard({ day }: { day: IsoDate }) {
  const router = useRouter();
  // "I spent nothing" hides the question until the app is next opened.
  const [dismissed, setDismissed] = useState<IsoDate | null>(null);
  if (dismissed === day) return null;
  const label = `${weekdayShort(day)} ${formatDayMonth(day)}`;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <NotePencilIcon size={22} color={colors.teal} weight="fill" />
        <AppText variant="bodyStrong" style={styles.flex}>{`Nothing logged for ${label}. Forgot something?`}</AppText>
      </View>
      <AppText color="muted">Add it with that day’s date. Today’s amount adjusts, because the money has already gone.</AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button label="I spent nothing" variant="quiet" onPress={() => setDismissed(day)} />
        </View>
        <View style={styles.flex}>
          <Button label={`Add for ${formatDayMonth(day)}`} onPress={() => router.push({ pathname: '/expense/new', params: { date: day } })} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
