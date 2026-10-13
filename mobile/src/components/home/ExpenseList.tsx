import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ReceiptIcon } from '@/components/ui/icons';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { categoryLabels, type Expense } from '@/domain/types';
import { colors, radius, spacing } from '@/theme/tokens';

function ExpenseRow({ expense }: { expense: Expense }) {
  const scanned = expense.source !== 'manual';
  const amountMyr = formatMoney(expense.amountMyr, 'MYR');
  const foreign = expense.currency === 'MYR' ? null : formatMoney(expense.amountOriginal, expense.currency);
  return (
    <View
      style={styles.row}
      accessible
      aria-label={`${expense.merchantName}, ${formatDayMonth(expense.purchaseDate)}, ${categoryLabels[expense.category]}, ${amountMyr}${scanned ? ', from a scanned receipt' : ''}`}>
      <View>
        <CategoryIcon category={expense.category} size={TILE} />
        {scanned ? (
          <View style={styles.scanBadge}>
            <ReceiptIcon size={12} color={colors.navy} weight="bold" />
          </View>
        ) : null}
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

/** The most recent expenses. Scanned receipts carry a small green receipt badge. */
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

const TILE = 48;
const BADGE = 22;

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scanBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: BADGE,
    height: BADGE,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  amount: { alignItems: 'flex-end' },
});
