import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { RefundBadge } from '@/components/tax/RefundBadge';
import { RefundStatusPicker } from '@/components/tax/RefundStatusPicker';
import { LockedFeature } from '@/components/plan/LockedFeature';
import { AnimatedMoney } from '@/components/ui/AnimatedMoney';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AirplaneTakeoffIcon, ArrowSquareOutIcon, CaretRightIcon, CheckSquareIcon, SquareIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StackScreen } from '@/components/ui/StackScreen';
import { formatDayMonth, formatFullDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { shouldRemindToClaim, summarizeRefunds, type RefundLine } from '@/domain/taxRefund';
import { useAppData } from '@/state/AppDataProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

const rm = (sen: number) => formatMoney(sen, 'MYR');

/** The tax refund tracker (brief §7.7): what to collect, from which purchases, and how to claim it. */
export default function TaxRefundScreen() {
  const router = useRouter();
  const { data, trip, today, updateRefund, toggleRefundChecklist, access } = useAppData();

  if (!trip) {
    return (
      <StackScreen title="Tax refund">
        <Card style={styles.card}>
          <AppText variant="heading">Plan a trip first</AppText>
          <Button label="Plan a trip" onPress={() => router.push('/trip/new')} />
        </Card>
      </StackScreen>
    );
  }

  if (access.level === 'free') {
    return (
      <StackScreen title="Tax refund">
        <LockedFeature
          title="The tax refund tracker needs a pass"
          body="See what you can claim back, what to bring and when to claim, with a Day Pass or a 7-Day Pass. Your receipts are kept."
        />
      </StackScreen>
    );
  }

  const summary = summarizeRefunds(trip, data.expenses);
  const { rule } = summary;
  if (!rule) {
    return (
      <StackScreen title="Tax refund">
        <Card style={styles.card}>
          <AppText variant="heading">{`Not available for ${trip.country} yet`}</AppText>
          <AppText color="muted">ITER adds a country once its tourist tax refund rules have been checked. Japan is supported now.</AppText>
        </Card>
      </StackScreen>
    );
  }

  const ticked = trip.refundChecklist ?? [];
  const openExpense = (line: RefundLine) => router.push({ pathname: '/expense/[id]', params: { id: line.expense.id } });

  return (
    <StackScreen title="Tax refund">
      <Card style={[styles.card, styles.hero]}>
        <AppText variant="label" color="accent">
          To collect when you leave
        </AppText>
        <AnimatedMoney sen={summary.toCollectMyr} template={(amount) => `Up to ${amount}`} trimZeros={false} variant="display" style={styles.total} />
        <AppText color="muted">
          {summary.eligible.length === 0
            ? 'Nothing yet. Scan receipts from tax-free shops and ITER checks each one.'
            : `From ${summary.eligible.length} ${summary.eligible.length === 1 ? 'purchase' : 'purchases'}. Not counted in safe-to-spend, because the money arrives after you leave.`}
        </AppText>
        {summary.receivedMyr > 0 ? <AppText variant="bodyStrong" color="accent">{`${rm(summary.receivedMyr)} received so far`}</AppText> : null}
        <AppText variant="caption" color="muted">{`Estimated · rules verified ${formatFullDate(rule.lastVerified)}`}</AppText>
      </Card>

      {shouldRemindToClaim(summary, today, trip) ? (
        <View style={styles.reminder} role="alert">
          <AirplaneTakeoffIcon size={24} color={colors.warning} weight="fill" />
          <AppText variant="bodyStrong" color="warning" style={styles.flex}>
            {`You fly home on ${formatDayMonth(trip.endDate)}. Claim at the airport before you check in your bags.`}
          </AppText>
        </View>
      ) : null}

      {summary.eligible.length > 0 ? (
        <Card style={styles.card}>
          <AppText variant="heading">Refundable purchases</AppText>
          {summary.eligible.map((line) => (
            <View key={line.expense.id} style={styles.line}>
              <PressableScale onPress={() => openExpense(line)} role="button" aria-label={`${line.expense.merchantName}, open the expense`} style={styles.lineHeader}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{line.expense.merchantName}</AppText>
                  <AppText variant="caption" color="muted">
                    {`${formatDayMonth(line.expense.purchaseDate)} · tax ${formatMoney(line.check.tax, line.check.currency)}`}
                  </AppText>
                </View>
                <View style={styles.amount}>
                  <AppText variant="bodyStrong" color="accent">{`Up to ${rm(line.check.estRefundMyr)}`}</AppText>
                  <AppText variant="caption" color="muted">
                    {formatMoney(line.check.estRefund, line.check.currency)}
                  </AppText>
                </View>
                <CaretRightIcon size={16} color={colors.textMuted} />
              </PressableScale>
              <RefundStatusPicker shop={line.expense.merchantName} value={line.status} onChange={(status) => updateRefund(line.expense.id, { status })} />
            </View>
          ))}
        </Card>
      ) : null}

      {summary.possible.length > 0 ? (
        <Card style={styles.card}>
          <AppText variant="heading">Check these shops</AppText>
          {summary.possible.map((line) => (
            <View key={line.expense.id} style={styles.line}>
              <AppText variant="bodyStrong">{`${line.expense.merchantName}, ${formatDayMonth(line.expense.purchaseDate)}`}</AppText>
              <RefundBadge check={line.check} onAnswerShop={(shopIsTaxFree) => updateRefund(line.expense.id, { shopIsTaxFree })} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <AppText variant="heading">{`Before you fly home on ${formatDayMonth(trip.endDate)}`}</AppText>
        {rule.departureChecklist.map((item) => {
          const done = ticked.includes(item.id);
          const Icon = done ? CheckSquareIcon : SquareIcon;
          return (
            <PressableScale
              key={item.id}
              onPress={() => toggleRefundChecklist(trip.id, item.id)}
              role="checkbox"
              aria-checked={done}
              aria-label={item.label}
              style={styles.check}>
              <Icon size={26} color={done ? colors.accentText : colors.textMuted} weight={done ? 'fill' : 'regular'} />
              <AppText color={done ? 'muted' : 'primary'} style={[styles.flex, done ? styles.done : null]}>
                {item.label}
              </AppText>
            </PressableScale>
          );
        })}
        <AppText variant="bodyStrong">Bring</AppText>
        {rule.whatToBring.map((thing) => (
          <AppText key={thing}>{`•  ${thing}`}</AppText>
        ))}
      </Card>

      <Card style={styles.card}>
        <AppText variant="heading">{`How it works in ${rule.country}`}</AppText>
        {rule.rulesInPlainLanguage.map((sentence) => (
          <AppText key={sentence}>{`•  ${sentence}`}</AppText>
        ))}
        <AppText color="muted">{rule.refundMethodNote}</AppText>
        <AppText variant="caption" color="muted">
          {`Refund amounts are shown as "up to": a refund company may take a handling fee. Rules verified ${formatFullDate(rule.lastVerified)} against the ${rule.sourceName}.`}
        </AppText>
        <Button label="Read the official guide" icon={ArrowSquareOutIcon} variant="quiet" onPress={() => void Linking.openURL(rule.sourceUrl)} />
      </Card>

      {summary.notEligible.length > 0 ? (
        <Card style={styles.card}>
          <AppText variant="heading">Not refundable</AppText>
          {summary.notEligible.map((line) => (
            <View key={line.expense.id}>
              <AppText variant="bodyStrong">{`${line.expense.merchantName}, ${formatDayMonth(line.expense.purchaseDate)}`}</AppText>
              <AppText color="muted">{line.check.reason}</AppText>
            </View>
          ))}
        </Card>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  hero: { backgroundColor: colors.accentSoft },
  total: { fontSize: 44, lineHeight: 50 },
  reminder: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', borderRadius: radius.card, padding: spacing.xl, backgroundColor: colors.warningSurface },
  line: { gap: spacing.sm, paddingVertical: spacing.sm },
  lineHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET },
  amount: { alignItems: 'flex-end' },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH_TARGET },
  done: { textDecorationLine: 'line-through' },
  flex: { flex: 1 },
});
