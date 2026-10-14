import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { AirplaneTakeoffIcon, CaretRightIcon, CoinsIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { formatDayMonth, type IsoDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { shouldRemindToClaim, type RefundSummary } from '@/domain/taxRefund';
import type { Trip } from '@/domain/types';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

/**
 * "Up to RM 60.66 tax refund to collect" on Home (brief §7.1), opening the tracker. On the last
 * days of the trip it becomes the departure reminder. Hidden when there is nothing to collect.
 */
export function RefundCard({ summary, trip, today }: { summary: RefundSummary; trip: Trip; today: IsoDate }) {
  const router = useRouter();
  const pending = summary.eligible.length + summary.possible.length;
  if (!summary.rule || (summary.toCollectMyr === 0 && pending === 0)) return null;

  const remind = shouldRemindToClaim(summary, today, trip);
  const amount = formatMoney(summary.toCollectMyr, 'MYR');
  const title = remind ? `Claim your tax refund before you fly on ${formatDayMonth(trip.endDate)}` : `Up to ${amount} tax refund to collect`;
  const detail = remind
    ? `Up to ${amount}. Do it at the airport before you check in your bags.`
    : summary.possible.length > 0
      ? `${summary.possible.length} more ${summary.possible.length === 1 ? 'purchase needs' : 'purchases need'} a quick check`
      : 'Collected when you leave Japan. See what to bring.';
  const Icon = remind ? AirplaneTakeoffIcon : CoinsIcon;

  return (
    <PressableScale
      onPress={() => router.push('/tax-refund')}
      role="button"
      aria-label={`${title}. ${detail} Open the tax refund tracker.`}
      style={[styles.card, remind ? styles.remind : styles.normal]}>
      <View style={[styles.icon, remind ? styles.iconRemind : styles.iconNormal]}>
        <Icon size={22} color={remind ? colors.warning : colors.accentText} weight="fill" />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={remind ? 'warning' : 'primary'}>
          {title}
        </AppText>
        <AppText variant="caption" color={remind ? 'warning' : 'muted'}>
          {detail}
        </AppText>
      </View>
      <CaretRightIcon size={16} color={remind ? colors.warning : colors.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.card, padding: spacing.lg, minHeight: MIN_TOUCH_TARGET + spacing.xl },
  normal: { backgroundColor: colors.card },
  remind: { backgroundColor: colors.warningSurface },
  icon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconNormal: { backgroundColor: colors.accentSoft },
  iconRemind: { backgroundColor: colors.card },
  text: { flex: 1, gap: spacing.xxs },
});
