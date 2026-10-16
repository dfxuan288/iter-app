import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { MenuCapture } from '@/components/scan/MenuCapture';
import { ReceiptCapture } from '@/components/scan/ReceiptCapture';
import { ScanQueueList } from '@/components/scan/ScanQueueList';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Screen } from '@/components/ui/Screen';
import { useAppData } from '@/state/AppDataProvider';
import { useSavedToast } from '@/state/SavedToastProvider';

type Mode = 'receipt' | 'menu' | 'type';

export default function ScanScreen() {
  const router = useRouter();
  const { trip, today, addExpense } = useAppData();
  const { showSaved } = useSavedToast();
  // Opening Scan with ?mode=type (e.g. "Type it in instead" after a failed scan) starts on the form.
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'type' ? 'type' : 'receipt');
  // Changing this number gives a fresh, empty form after an expense is saved.
  const [formVersion, setFormVersion] = useState(0);

  return (
    <Screen title="Scan" subtitle="Snap it, we log it.">
      <ChoiceChips
        label="How to add"
        value={mode}
        onChange={setMode}
        choices={[
          { value: 'receipt', label: 'Receipt' },
          { value: 'menu', label: 'Menu' },
          { value: 'type', label: 'Type it' },
        ]}
      />

      {mode === 'receipt' && trip ? (
        <>
          <ScanQueueList tripId={trip.id} />
          <ReceiptCapture />
        </>
      ) : null}

      {mode === 'menu' && trip ? <MenuCapture tripId={trip.id} /> : null}

      {mode === 'type' && trip ? (
        <ExpenseForm
          key={formVersion}
          trip={trip}
          today={today}
          quickEntry
          submitLabel="Save expense"
          onSubmit={(draft, rate) => {
            const result = addExpense(draft, rate);
            if (result.ok) {
              showSaved('Expense saved');
              setFormVersion(formVersion + 1);
              router.navigate('/');
            }
            return result;
          }}
        />
      ) : null}

      {!trip ? (
        <Card>
          <AppText variant="heading">Plan a trip first</AppText>
          <AppText color="muted">Expenses belong to a trip, so ITER can work out what is safe to spend.</AppText>
          <Button label="Plan a trip" onPress={() => router.push('/trip/new')} />
        </Card>
      ) : null}
    </Screen>
  );
}
