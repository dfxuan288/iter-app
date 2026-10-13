import { ExpenseList } from '@/components/home/ExpenseList';
import { AppText } from '@/components/ui/AppText';
import { StackScreen } from '@/components/ui/StackScreen';
import { formatMoney } from '@/domain/money';
import { useAppData } from '@/state/AppDataProvider';

export default function AllExpensesScreen() {
  const { trip, summary, expenses } = useAppData();
  return (
    <StackScreen title={trip ? `${trip.city} expenses` : 'Expenses'}>
      {summary ? (
        <AppText color="muted">
          {`${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}, ${formatMoney(summary.spentMyr, 'MYR')} in total`}
        </AppText>
      ) : null}
      <ExpenseList expenses={expenses} title="All expenses" limit={null} />
    </StackScreen>
  );
}
