import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CaretRightIcon, ReceiptIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StoredImage } from '@/components/ui/StoredImage';
import { formatDayMonth } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { categoryLabels, type Expense } from '@/domain/types';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

function ExpenseRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const scanned = expense.source !== 'manual';
  const amountMyr = formatMoney(expense.amountMyr, 'MYR');
  const foreign = expense.currency === 'MYR' ? null : formatMoney(expense.amountOriginal, expense.currency);
  return (
    <PressableScale
      onPress={onPress}
      role="button"
      aria-label={`${expense.merchantName}, ${formatDayMonth(expense.purchaseDate)}, ${categoryLabels[expense.category]}, ${amountMyr}${scanned ? ', from a scanned receipt' : ''}. Open to edit or delete.`}
      style={styles.row}>
      <View>
        {expense.receipt?.imageId ? (
          <StoredImage id={expense.receipt.imageId} alt="" style={styles.thumb} />
        ) : (
          <CategoryIcon category={expense.category} size={TILE} />
        )}
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
      <CaretRightIcon size={16} color={colors.textMuted} />
    </PressableScale>
  );
}

export interface ExpenseListProps {
  expenses: Expense[];
  title?: string;
  /** How many to show before offering "See all". `null` shows every expense. */
  limit?: number | null;
}

/** A list of expenses, most recent first. Tap one to edit or delete it. Scanned receipts carry a small green receipt badge. */
export function ExpenseList({ expenses, title = 'Recent', limit = 6 }: ExpenseListProps) {
  const router = useRouter();
  const shown = limit === null ? expenses : expenses.slice(0, limit);
  return (
    <Card style={styles.card}>
      <AppText variant="heading">{title}</AppText>
      {shown.length === 0 ? (
        <AppText color="muted">Nothing logged yet. Your expenses will appear here as you add them.</AppText>
      ) : (
        shown.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} onPress={() => router.push({ pathname: '/expense/[id]', params: { id: expense.id } })} />
        ))
      )}
      {expenses.length > shown.length ? (
        <Button variant="quiet" label={`See all ${expenses.length} expenses`} onPress={() => router.push('/expenses')} />
      ) : null}
    </Card>
  );
}

const TILE = 48;
const BADGE = 22;

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET + spacing.sm },
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
  thumb: { width: TILE, height: TILE, borderRadius: radius.tile - 8 },
  text: { flex: 1 },
  amount: { alignItems: 'flex-end' },
});
