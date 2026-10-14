import { ChoiceChips } from '@/components/ui/ChoiceChips';
import type { RefundStatus } from '@/domain/types';

export const refundStatusLabels: Record<RefundStatus, string> = {
  to_claim: 'To claim',
  claimed: 'Claimed',
  received: 'Received',
  missed: 'Not claimed',
};

/** Where a refund is up to: to claim at the airport, claimed and waiting for the money, received, or missed. */
export function RefundStatusPicker({ value, onChange, shop }: { value: RefundStatus; onChange: (status: RefundStatus) => void; shop: string }) {
  return (
    <ChoiceChips
      label={`Tax refund status for ${shop}`}
      value={value}
      onChange={onChange}
      layout="scroll"
      choices={(Object.keys(refundStatusLabels) as RefundStatus[]).map((status) => ({ value: status, label: refundStatusLabels[status] }))}
    />
  );
}
