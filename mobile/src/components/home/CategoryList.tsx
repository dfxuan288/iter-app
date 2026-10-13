import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { CategoryProgress } from '@/domain/budget';
import { formatMoney } from '@/domain/money';
import { categoryLabels } from '@/domain/types';
import { colors, radius, spacing } from '@/theme/tokens';

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });

/** Spent against planned for each category. */
export function CategoryList({ categories }: { categories: CategoryProgress[] }) {
  return (
    <Card style={styles.card}>
      <AppText variant="heading">By category</AppText>
      {categories.map((item) => {
        const over = item.spentMyr > item.plannedMyr;
        const share = item.plannedMyr > 0 ? Math.min(1, item.spentMyr / item.plannedMyr) : item.spentMyr > 0 ? 1 : 0;
        return (
          <View
            key={item.category}
            style={styles.row}
            accessible
            aria-label={`${categoryLabels[item.category]}: ${rm(item.spentMyr)} spent of ${rm(item.plannedMyr)} planned${over ? ', over plan' : ''}`}>
            <View style={styles.labels}>
              <AppText variant="bodyStrong">{categoryLabels[item.category]}</AppText>
              <AppText variant="caption" color={over ? 'danger' : 'muted'}>
                {`${rm(item.spentMyr)} of ${rm(item.plannedMyr)}`}
              </AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }, over && styles.fillOver]} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { gap: spacing.sm },
  labels: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.teal },
  fillOver: { backgroundColor: colors.danger },
});
