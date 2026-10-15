import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StackScreen } from '@/components/ui/StackScreen';
import { isIsoDate } from '@/domain/dates';
import { currencies, type CurrencyCode } from '@/domain/money';
import type { ExpenseDraft } from '@/services/expenseService';
import { useAppData } from '@/state/AppDataProvider';

/** Values passed in from a menu's "Log this as an expense". Anything malformed is ignored. */
function menuOrder(params: Record<string, string | string[] | undefined>, today: string): ExpenseDraft | undefined {
  const value = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : '');
  const amount = Number(value('amount'));
  const currency = value('currency');
  if (value('from') !== 'menu' || !Number.isSafeInteger(amount) || amount <= 0 || !(currency in currencies)) return undefined;
  return { amountOriginal: amount, currency: currency as CurrencyCode, category: 'food', merchantName: value('merchant'), note: value('note'), purchaseDate: today };
}

export default function NewExpenseScreen() {
  const router = useRouter();
  const { trip, today, addExpense } = useAppData();
  const params = useLocalSearchParams();
  const fromMenu = useMemo(() => menuOrder(params, today), [params, today]);
  // "Forgot something?" on Home opens this screen on the day that was missed.
  const day = typeof params.date === 'string' && isIsoDate(params.date) ? params.date : undefined;

  if (!trip) {
    return (
      <StackScreen title="Add an expense">
        <Card>
          <AppText variant="heading">Plan a trip first</AppText>
          <AppText color="muted">Expenses belong to a trip, so ITER can work out what is safe to spend.</AppText>
          <Button label="Plan a trip" onPress={() => router.replace('/trip/new')} />
        </Card>
      </StackScreen>
    );
  }

  return (
    <StackScreen title={fromMenu ? 'Log your meal' : 'Add an expense'}>
      <ExpenseForm
        trip={trip}
        today={today}
        initial={fromMenu}
        initialDate={day}
        quickEntry={!fromMenu}
        submitLabel="Save expense"
        onSubmit={(draft, rate) => {
          const result = addExpense(draft, rate, { source: fromMenu ? 'menu' : 'manual' });
          if (result.ok) router.replace('/');
          return result;
        }}
      />
    </StackScreen>
  );
}
