import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/ui/Screen';

export default function CurrencyScreen() {
  return (
    <Screen title="Currency" subtitle="Live rates against the Ringgit.">
      <ComingSoon
        phase="Phase 2"
        features={[
          'Converter between MYR and nine travel currencies',
          'Live rates with the daily change',
          'Rate history for 7 or 30 days',
          'Last saved rate when you are offline',
        ]}
      />
    </Screen>
  );
}
