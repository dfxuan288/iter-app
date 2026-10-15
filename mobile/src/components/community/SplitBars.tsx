import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { rankedSplit, type CategorySplit } from '@/domain/community';
import { categoryLabels } from '@/domain/types';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Where the money went, as one bar per category, biggest first. One colour: each bar is labelled
 * with its category and percentage, so nothing depends on telling colours apart.
 */
export function SplitBars({ split, limit }: { split: CategorySplit; limit?: number }) {
  const rows = rankedSplit(split).slice(0, limit);
  const widest = Math.max(1, ...rows.map((row) => row.percent));
  const description = rows.map((row) => `${categoryLabels[row.category]} ${row.percent}%`).join(', ');
  return (
    <View style={styles.list} accessible role="img" aria-label={`Spending split: ${description}`}>
      {rows.map((row) => (
        <View key={row.category} style={styles.row}>
          <CategoryIcon category={row.category} size={28} />
          <AppText variant="caption" style={styles.label}>
            {categoryLabels[row.category]}
          </AppText>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(row.percent / widest) * 100}%` }]} />
          </View>
          <AppText variant="caption" style={styles.percent}>{`${row.percent}%`}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 72 },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.teal },
  percent: { width: 36, textAlign: 'right' },
});
