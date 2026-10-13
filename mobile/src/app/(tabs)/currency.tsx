import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RateChart } from '@/components/currency/RateChart';
import { rateLabel } from '@/components/expense/rateLabel';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ArrowsClockwiseIcon, ArrowsLeftRightIcon } from '@/components/ui/icons';
import { MoneyField } from '@/components/ui/MoneyField';
import { PressableScale } from '@/components/ui/PressableScale';
import { Reveal } from '@/components/ui/Reveal';
import { Screen } from '@/components/ui/Screen';
import { convertFromMyr, convertToMyr, currencies, formatMoney, parseMoneyInput, toMinor } from '@/domain/money';
import { dailyChangePercent, FOREIGN_CURRENCIES, fxService, type ForeignCurrency, type RatePoint } from '@/services/fxService';
import { useAppData } from '@/state/AppDataProvider';
import { useFx } from '@/state/FxProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

/** What one "round" amount of a currency costs in Ringgit, e.g. ¥100 or US$1. Easier to read than tiny decimals. */
const displayUnit: Record<ForeignCurrency, number> = { JPY: 100, THB: 10, SGD: 1, IDR: 10000, VND: 10000, USD: 1, EUR: 1, KRW: 1000 };

function unitPriceMyr(currency: ForeignCurrency, ratePerMyr: number): number {
  return convertToMyr(toMinor(displayUnit[currency], currency), currency, ratePerMyr);
}

/**
 * The same price without rounding to the sen, for the history chart only: daily moves are often
 * smaller than one sen, and rounding would flatten the line. Never used for money that is saved.
 */
const unitPriceExact = (currency: ForeignCurrency, ratePerMyr: number) => displayUnit[currency] / ratePerMyr;
const formatExact = (ringgit: number) => `RM ${ringgit.toFixed(4)}`;

const unitLabel = (currency: ForeignCurrency) => formatMoney(toMinor(displayUnit[currency], currency), currency, { trimZeros: true });

function describeChange(percent: number | null): { text: string; tone: 'muted' | 'accent' | 'danger' } {
  if (percent === null) return { text: 'No change data', tone: 'muted' };
  if (Math.abs(percent) < 0.005) return { text: 'No change', tone: 'muted' };
  // Cheaper foreign currency is good news for a traveller from Malaysia.
  return percent < 0
    ? { text: `Cheaper by ${Math.abs(percent).toFixed(2)}%`, tone: 'accent' }
    : { text: `Dearer by ${percent.toFixed(2)}%`, tone: 'danger' };
}

export default function CurrencyScreen() {
  const { trip } = useAppData();
  const { rates, refreshing, refresh } = useFx();
  const tripCurrency = trip && trip.localCurrency !== 'MYR' ? (trip.localCurrency as ForeignCurrency) : 'JPY';

  const [currency, setCurrency] = useState<ForeignCurrency>(tripCurrency);
  const [fromForeign, setFromForeign] = useState(true);
  const [amountText, setAmountText] = useState('1000');
  const [days, setDays] = useState<'7' | '30'>('30');
  const [history, setHistory] = useState<{ currency: ForeignCurrency; days: '7' | '30'; points: RatePoint[]; fresh: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    void fxService.loadHistory(currency, days === '7' ? 7 : 30).then((result) => {
      if (active) setHistory({ currency, days, ...result });
    });
    return () => {
      active = false;
    };
  }, [currency, days]);

  const rate = rates.rates[currency];
  const inputCurrency = fromForeign ? currency : 'MYR';
  const outputCurrency = fromForeign ? 'MYR' : currency;
  const amount = parseMoneyInput(amountText, inputCurrency);
  const converted = amount === null || !rate ? null : fromForeign ? convertToMyr(amount, currency, rate) : convertFromMyr(amount, currency, rate);

  const historyReady = history !== null && history.currency === currency && history.days === days;
  // Plotted as a price in Ringgit, so the line rises when the currency gets dearer for the traveller.
  const chartPoints = historyReady ? history.points.map((point) => ({ date: point.date, rate: unitPriceExact(currency, point.rate) })) : [];
  const first = chartPoints[0];
  const last = chartPoints[chartPoints.length - 1];
  const chartSummary =
    first && last
      ? `${unitLabel(currency)} in Ringgit over the last ${days} days: from ${formatExact(first.rate)} to ${formatExact(last.rate)}.`
      : 'Rate history is not available.';

  return (
    <Screen title="Currency" subtitle="Live rates against the Ringgit.">
      <Reveal index={0}>
        <Card style={styles.card}>
          <ChoiceChips
            label="Currency to convert"
            layout="scroll"
            value={currency}
            onChange={setCurrency}
            choices={FOREIGN_CURRENCIES.map((code) => ({ value: code, label: code, accessibilityLabel: currencies[code].name }))}
          />
          <MoneyField label={`Amount in ${currencies[inputCurrency].name}`} value={amountText} onChangeText={setAmountText} currency={inputCurrency} />
          <View style={styles.result} aria-live="polite">
            <AppText color="muted">{`In ${currencies[outputCurrency].name}`}</AppText>
            <AppText variant="title">{converted !== null ? formatMoney(converted, outputCurrency) : rate ? 'Enter an amount' : 'No rate yet'}</AppText>
          </View>
          <Button
            variant="quiet"
            icon={ArrowsLeftRightIcon}
            label={fromForeign ? `Switch to Ringgit to ${currency}` : `Switch to ${currency} to Ringgit`}
            onPress={() => setFromForeign(!fromForeign)}
          />
          <View style={styles.rateRow}>
            <Chip tone={rates.origin === 'live' ? 'success' : 'warning'} label={rateLabel(rates)} />
          </View>
          {rates.origin !== 'live' ? (
            <AppText variant="caption" color="muted">
              {rates.origin === 'saved'
                ? 'You are offline, so this is the last rate your phone received.'
                : 'Your phone has not been online yet, so this is the rate that came with the app.'}
            </AppText>
          ) : null}
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="heading" style={styles.flex}>{`${unitLabel(currency)} in Ringgit`}</AppText>
            <ChoiceChips
              label="History length"
              value={days}
              onChange={setDays}
              choices={[
                { value: '7', label: '7 days' },
                { value: '30', label: '30 days' },
              ]}
            />
          </View>
          {historyReady ? (
            <RateChart points={chartPoints} summary={chartSummary} formatValue={formatExact} />
          ) : (
            <View style={styles.chartLoading} accessible aria-label="Loading rate history" />
          )}
          {historyReady && !history.fresh && chartPoints.length > 0 ? (
            <AppText variant="caption" color="muted">
              Showing the history saved on your phone.
            </AppText>
          ) : null}
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <AppText variant="heading" style={styles.flex}>
              All rates
            </AppText>
            <Button variant="quiet" icon={ArrowsClockwiseIcon} label={refreshing ? 'Updating' : 'Update'} disabled={refreshing} onPress={() => void refresh()} />
          </View>
          {FOREIGN_CURRENCIES.map((code) => {
            const value = rates.rates[code];
            const change = describeChange(dailyChangePercent(rates, code));
            const price = value ? formatMoney(unitPriceMyr(code, value), 'MYR') : 'No rate';
            return (
              <PressableScale
                key={code}
                onPress={() => setCurrency(code)}
                role="button"
                aria-label={`${currencies[code].name}: ${unitLabel(code)} is ${price}. ${change.text} since the previous day. Show in the converter.`}
                style={[styles.rateItem, code === currency && styles.rateItemSelected]}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{currencies[code].name}</AppText>
                  <AppText variant="caption" color={change.tone}>
                    {change.text}
                  </AppText>
                </View>
                <View style={styles.ratePrice}>
                  <AppText variant="bodyStrong">{price}</AppText>
                  <AppText variant="caption" color="muted">{`for ${unitLabel(code)}`}</AppText>
                </View>
              </PressableScale>
            );
          })}
          <AppText variant="caption" color="muted">
            Mid-market rates from Frankfurter, updated daily. Your bank or money changer will charge a little more.
          </AppText>
        </Card>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  flex: { flex: 1 },
  result: { gap: spacing.xxs },
  rateRow: { flexDirection: 'row' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  chartLoading: { height: 220, borderRadius: radius.tile, backgroundColor: colors.surfaceSunken },
  rateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET + spacing.md,
    borderRadius: radius.tile,
    paddingHorizontal: spacing.md,
    marginHorizontal: -spacing.md,
  },
  rateItemSelected: { backgroundColor: colors.surfaceSunken },
  ratePrice: { alignItems: 'flex-end' },
});
