import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Chip } from '@/components/ui/Chip';
import { PencilSimpleIcon, ReceiptIcon } from '@/components/ui/icons';
import { StackScreen } from '@/components/ui/StackScreen';
import { TicketCard } from '@/components/ui/TicketCard';
import { formatFullDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { categoryLabels } from '@/domain/types';
import { useAppData } from '@/state/AppDataProvider';
import { colors, spacing } from '@/theme/tokens';

type Mode = 'view' | 'edit' | 'confirm-delete';

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today, updateExpense, deleteExpense } = useAppData();
  const [mode, setMode] = useState<Mode>('view');

  const expense = data.expenses.find((e) => e.id === id);
  const trip = expense ? data.trips.find((t) => t.id === expense.tripId) : undefined;

  if (!expense || !trip) {
    return (
      <StackScreen title="Expense">
        <Card>
          <AppText variant="heading">This expense is no longer here</AppText>
          <AppText color="muted">It may have been deleted.</AppText>
          <Button label="Back to Home" onPress={() => router.replace('/')} />
        </Card>
      </StackScreen>
    );
  }

  if (mode === 'edit') {
    return (
      <StackScreen title="Edit expense">
        <ExpenseForm
          trip={trip}
          today={today}
          existing={expense}
          submitLabel="Save changes"
          onSubmit={(draft, rate) => {
            const result = updateExpense(expense.id, draft, rate);
            if (result.ok) setMode('view');
            return result;
          }}
        />
        <Button label="Cancel" variant="quiet" onPress={() => setMode('view')} />
      </StackScreen>
    );
  }

  const foreign = expense.currency !== 'MYR';
  const scanned = expense.source !== 'manual';

  return (
    <StackScreen title="Expense">
      <TicketCard
        stubColor={colors.surfaceSunken}
        stub={
          <View style={styles.rows}>
            <Row label="Paid on" value={formatFullDate(expense.purchaseDate)} />
            <Row label="Category" value={categoryLabels[expense.category]} />
            {foreign ? <Row label="Original amount" value={formatMoney(expense.amountOriginal, expense.currency)} /> : null}
            {foreign ? <Row label="Rate used" value={`1 MYR = ${expense.rateUsed} ${expense.currency}`} /> : null}
            {foreign ? <Row label="Rate date" value={formatFullDate(expense.rateDate)} /> : null}
            {expense.note ? <Row label="Note" value={expense.note} /> : null}
          </View>
        }>
        <View style={styles.header}>
          <CategoryIcon category={expense.category} size={56} />
          <View style={styles.headerText}>
            <AppText variant="heading">{expense.merchantName}</AppText>
            <Chip
              tone={scanned ? 'success' : 'neutral'}
              icon={scanned ? ReceiptIcon : PencilSimpleIcon}
              label={scanned ? 'Scanned receipt' : 'Typed in'}
            />
          </View>
        </View>
        <AppText variant="display" style={styles.amount}>
          {formatMoney(expense.amountMyr, 'MYR')}
        </AppText>
      </TicketCard>

      {mode === 'confirm-delete' ? (
        <Card>
          <AppText variant="heading">Delete this expense?</AppText>
          <AppText color="muted">
            {`${formatMoney(expense.amountMyr, 'MYR')} goes back into your budget. This cannot be undone.`}
          </AppText>
          <View style={styles.confirmRow}>
            <View style={styles.confirmButton}>
              <Button label="Keep it" variant="quiet" onPress={() => setMode('view')} />
            </View>
            <View style={styles.confirmButton}>
              <Button
                label="Yes, delete"
                onPress={() => {
                  deleteExpense(expense.id);
                  router.replace('/');
                }}
              />
            </View>
          </View>
        </Card>
      ) : (
        <View style={styles.confirmRow}>
          <View style={styles.confirmButton}>
            <Button label="Delete" variant="quiet" onPress={() => setMode('confirm-delete')} />
          </View>
          <View style={styles.confirmButton}>
            <Button label="Edit" icon={PencilSimpleIcon} onPress={() => setMode('edit')} />
          </View>
        </View>
      )}
    </StackScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText color="muted">{label}</AppText>
      <AppText variant="bodyStrong" align="right" style={styles.rowValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.sm },
  amount: { fontSize: 44, lineHeight: 50 },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  rowValue: { flex: 1 },
  confirmRow: { flexDirection: 'row', gap: spacing.md },
  confirmButton: { flex: 1 },
});
