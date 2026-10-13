import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/ui/Screen';

export default function ScanScreen() {
  return (
    <Screen title="Scan" subtitle="Snap it, we log it.">
      <ComingSoon
        phase="Phase 4"
        features={[
          'Photograph a receipt and let AI log the expense',
          'Review and edit every field before saving',
          'Photos taken offline wait and scan when you are back online',
          'Type it: "1200 yen ramen" (Phase 2)',
          'Menu translate with prices in Ringgit (Phase 6)',
        ]}
      />
    </Screen>
  );
}
