import { useRouter } from 'expo-router';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StackScreen } from '@/components/ui/StackScreen';
import { useAppData } from '@/state/AppDataProvider';

export default function NewExpenseScreen() {
  const router = useRouter();
  const { trip, today, addExpense } = useAppData();

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
    <StackScreen title="Add an expense">
      <ExpenseForm
        trip={trip}
        today={today}
        quickEntry
        submitLabel="Save expense"
        onSubmit={(draft, rate) => {
          const result = addExpense(draft, rate);
          if (result.ok) router.replace('/');
          return result;
        }}
      />
    </StackScreen>
  );
}
