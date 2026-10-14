import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CheckCircleIcon, QuestionIcon, XCircleIcon } from '@/components/ui/icons';
import { formatMoney } from '@/domain/money';
import type { RefundCheck } from '@/domain/taxRefund';
import { colors, radius, spacing } from '@/theme/tokens';

/** "collect up to ¥869 (≈ RM 22.44)". Always "up to": the handling fee is not known yet. */
export function collectText(check: RefundCheck): string {
  const estimated = check.taxEstimated ? ', tax estimated' : '';
  return `collect up to ${formatMoney(check.estRefund, check.currency)} (≈ ${formatMoney(check.estRefundMyr, 'MYR')}${estimated})`;
}

/**
 * The tax refund answer for one receipt (brief §7.5): eligible and how much, possibly (with a
 * yes/no question about the shop), or not eligible and why. Shows nothing when not checked.
 */
export function RefundBadge({ check, onAnswerShop }: { check: RefundCheck; onAnswerShop?: (isTaxFree: boolean) => void }) {
  if (check.eligibility === 'not_checked') return null;

  if (check.eligibility === 'eligible') {
    return (
      <View style={[styles.badge, styles.eligible]}>
        <CheckCircleIcon size={22} color={colors.accentText} weight="fill" />
        <View style={styles.text}>
          <AppText variant="bodyStrong" color="accent">
            Tax refund eligible
          </AppText>
          <AppText color="accent">{`You can ${collectText(check)} when you leave.`}</AppText>
        </View>
      </View>
    );
  }

  if (check.eligibility === 'possible') {
    return (
      <View style={[styles.badge, styles.possible]}>
        <QuestionIcon size={22} color={colors.warning} weight="fill" />
        <View style={styles.text}>
          <AppText variant="bodyStrong" color="warning">
            Possibly refundable
          </AppText>
          <AppText color="warning">{`If this is a registered tax-free shop, you can ${collectText(check)}. Look for a Tax-Free sign or ask at the till.`}</AppText>
          {onAnswerShop ? (
            <View style={styles.answers}>
              <View style={styles.answer}>
                <Button label="Yes, tax-free" variant="quiet" onPress={() => onAnswerShop(true)} />
              </View>
              <View style={styles.answer}>
                <Button label="No" variant="quiet" onPress={() => onAnswerShop(false)} />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.notEligible]}>
      <XCircleIcon size={22} color={colors.textMuted} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" color="muted">
          No tax refund
        </AppText>
        <AppText color="muted">{check.reason}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.tile, padding: spacing.lg },
  eligible: { backgroundColor: colors.accentSoft },
  possible: { backgroundColor: colors.warningSurface },
  notEligible: { backgroundColor: colors.surfaceSunken },
  text: { flex: 1, gap: spacing.xs },
  answers: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  answer: { flex: 1 },
});
