import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PencilSimpleIcon, ReceiptIcon } from '@/components/ui/icons';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { categoryLabels, type Expense } from '@/domain/types';
import { colors, radius, spacing } from '@/theme/tokens';

function ExpenseRow({ expense }: { expense: Expense }) {
  const scanned = expense.source !== 'manual';
  const SourceIcon = scanned ? ReceiptIcon : PencilSimpleIcon;
  const amountMyr = formatMoney(expense.amountMyr, 'MYR');
  const foreign = expense.currency === 'MYR' ? null : formatMoney(expense.amountOriginal, expense.currency);
  return (
    <View
      style={styles.row}
      accessible
      aria-label={`${expense.merchantName}, ${formatDayMonth(expense.purchaseDate)}, ${categoryLabels[expense.category]}, ${amountMyr}${scanned ? ', from a scanned receipt' : ''}`}>
      <View style={[styles.iconTile, scanned && styles.iconTileScanned]}>
        <SourceIcon size={22} color={colors.navy} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {expense.merchantName}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {`${formatDayMonth(expense.purchaseDate)}, ${categoryLabels[expense.category]}`}
        </AppText>
      </View>
      <View style={styles.amount}>
        <AppText variant="bodyStrong">{amountMyr}</AppText>
        {foreign ? (
          <AppText variant="caption" color="muted">
            {foreign}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** The most recent expenses. Scanned receipts get the green receipt tile. */
export function ExpenseList({ expenses, limit = 6 }: { expenses: Expense[]; limit?: number }) {
  const shown = expenses.slice(0, limit);
  return (
    <Card style={styles.card}>
      <AppText variant="heading">Recent</AppText>
      {shown.length === 0 ? (
        <AppText color="muted">Nothing logged yet. Your expenses will appear here as you add them.</AppText>
      ) : (
        shown.map((expense) => <ExpenseRow key={expense.id} expense={expense} />)
      )}
      {expenses.length > shown.length ? (
        <AppText variant="caption" color="muted" align="center">
          {`and ${expenses.length - shown.length} more on this trip`}
        </AppText>
      ) : null}
    </Card>
  );
}

const TILE = 44;

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.tile - 6,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileScanned: { backgroundColor: colors.accentSoft },
  text: { flex: 1 },
  amount: { alignItems: 'flex-end' },
});
