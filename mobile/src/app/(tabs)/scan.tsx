import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ComingSoon } from '@/components/ComingSoon';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Screen } from '@/components/ui/Screen';
import { useAppData } from '@/state/AppDataProvider';

type Mode = 'receipt' | 'menu' | 'type';

export default function ScanScreen() {
  const router = useRouter();
  const { trip, today, addExpense } = useAppData();
  // "Type it" is the mode that works today; Receipt and Menu arrive with the scanning phases.
  const [mode, setMode] = useState<Mode>('type');
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

      {mode === 'receipt' ? (
        <ComingSoon
          phase="Phase 4"
          features={[
            'Photograph a receipt and let AI log the expense',
            'Review and edit every field before saving',
            'Photos taken offline wait and scan when you are back online',
          ]}
        />
      ) : null}

      {mode === 'menu' ? (
        <ComingSoon
          phase="Phase 6"
          features={['Photograph a menu to see each dish translated', 'Prices shown in Ringgit, with tax and service added', 'Tap a dish to log it as an expense']}
        />
      ) : null}

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
              setFormVersion(formVersion + 1);
              router.navigate('/');
            }
            return result;
          }}
        />
      ) : null}

      {mode === 'type' && !trip ? (
        <Card>
          <AppText variant="heading">Plan a trip first</AppText>
          <AppText color="muted">Expenses belong to a trip, so ITER can work out what is safe to spend.</AppText>
          <Button label="Plan a trip" onPress={() => router.push('/trip/new')} />
        </Card>
      ) : null}
    </Screen>
  );
}
