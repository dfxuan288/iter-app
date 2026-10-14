import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { formatMoney } from '@/domain/money';
import type { ReceiptDetails } from '@/domain/types';
import { colors, spacing } from '@/theme/tokens';

/** The lines of a receipt, as printed: items, then subtotal, tax, service charge and total. */
export function ReceiptItems({ receipt }: { receipt: Pick<ReceiptDetails, 'currency' | 'items' | 'subtotal' | 'taxLines' | 'serviceCharge' | 'total' | 'taxIncluded'> }) {
  const money = (minor: number) => formatMoney(minor, receipt.currency);
  return (
    <View style={styles.list}>
      {receipt.items.length === 0 ? <AppText color="muted">No separate items could be read; the total is still saved.</AppText> : null}
      {receipt.items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.row}>
          <View style={styles.name}>
            <AppText>{item.quantity && item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name}</AppText>
            {item.nameOriginal ? (
              <AppText variant="caption" color="muted">
                {item.nameOriginal}
              </AppText>
            ) : null}
          </View>
          <AppText variant="bodyStrong">{money(item.lineTotal)}</AppText>
        </View>
      ))}
      <View style={styles.rule} />
      {receipt.subtotal !== null ? <Line label="Subtotal" value={money(receipt.subtotal)} /> : null}
      {receipt.taxLines.map((line, index) => (
        <Line
          key={`tax-${index}`}
          label={`Tax${line.ratePercent !== null ? ` ${line.ratePercent}%` : ''}${receipt.taxIncluded ? ' (included in prices)' : ''}`}
          value={money(line.amount)}
          muted={receipt.taxIncluded}
        />
      ))}
      {receipt.serviceCharge !== null ? <Line label="Service charge" value={money(receipt.serviceCharge)} /> : null}
      <Line label="Total" value={money(receipt.total)} strong />
    </View>
  );
}

function Line({ label, value, strong = false, muted = false }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant={strong ? 'bodyStrong' : 'body'} color={muted ? 'muted' : 'primary'} style={styles.name}>
        {label}
      </AppText>
      <AppText variant={strong ? 'bodyStrong' : 'body'} color={muted ? 'muted' : 'primary'}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  name: { flex: 1 },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
