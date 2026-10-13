import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { rateLabel } from '@/components/expense/rateLabel';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { MoneyField } from '@/components/ui/MoneyField';
import { TextField } from '@/components/ui/TextField';
import { eachDay, formatDayMonth, isWithin, weekdayShort, type IsoDate } from '@/domain/dates';
import { convertToMyr, currencies, formatMoney, parseMoneyInput, type CurrencyCode } from '@/domain/money';
import { parseQuickEntry } from '@/domain/quickEntry';
import { CATEGORIES, categoryLabels, type Category, type Expense, type Trip } from '@/domain/types';
import { expenseProblemMessages, MAX_TEXT_LENGTH, type ExpenseDraft, type ExpenseProblem, type RateQuote } from '@/services/expenseService';
import { rateQuoteFor } from '@/services/fxService';
import { useFx } from '@/state/FxProvider';
import { spacing } from '@/theme/tokens';

export interface ExpenseFormProps {
  trip: Trip;
  today: IsoDate;
  /** When editing: the expense to start from. */
  existing?: Expense;
  /** Show the "1200 yen ramen" box above the form. */
  quickEntry?: boolean;
  submitLabel: string;
  onSubmit: (draft: ExpenseDraft, rate: RateQuote | null) => { ok: true } | { ok: false; problems: ExpenseProblem[] };
}

const amountAsText = (minor: number, currency: CurrencyCode) =>
  formatMoney(minor, currency, { trimZeros: true }).replace(currencies[currency].symbol, '').replace(/[,\s]/g, '');

const ALL_CURRENCIES = Object.keys(currencies) as CurrencyCode[];

/** The add and edit form for an expense. All validation lives in expenseService; this only collects input. */
export function ExpenseForm({ trip, today, existing, quickEntry = false, submitLabel, onSubmit }: ExpenseFormProps) {
  const { rates } = useFx();
  const defaultDate = isWithin(today, trip.startDate, trip.endDate) ? today : trip.startDate;

  const [quickText, setQuickText] = useState('');
  const [quickMessage, setQuickMessage] = useState<string | null>(null);
  const [amountText, setAmountText] = useState(existing ? amountAsText(existing.amountOriginal, existing.currency) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(existing?.currency ?? trip.localCurrency);
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [category, setCategory] = useState<Category>(existing?.category ?? 'food');
  const [merchant, setMerchant] = useState(existing?.merchantName ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState<IsoDate>(existing?.purchaseDate ?? defaultDate);
  const [problems, setProblems] = useState<ExpenseProblem[]>([]);

  const amount = parseMoneyInput(amountText, currency);
  // Editing without changing the money keeps the rate the expense was first saved with.
  const keepsOriginalRate = existing !== undefined && amount === existing.amountOriginal && currency === existing.currency;
  const liveQuote = rateQuoteFor(rates, currency);
  const quote: RateQuote | null = keepsOriginalRate ? { ratePerMyr: existing.rateUsed, rateDate: existing.rateDate } : liveQuote;
  const amountMyr = amount !== null && amount > 0 && quote ? convertToMyr(amount, currency, quote.ratePerMyr) : null;

  const quickCurrencies = [...new Set<CurrencyCode>([trip.localCurrency, 'MYR', currency])];
  const currencyChoices = (showAllCurrencies ? ALL_CURRENCIES : quickCurrencies).map((code) => ({
    value: code,
    label: code,
    accessibilityLabel: currencies[code].name,
  }));

  const tripDays = eachDay(trip.startDate, trip.endDate);
  const dayChoices = (tripDays.includes(date) ? tripDays : [...tripDays, date].sort()).map((day) => ({
    value: day,
    label: day === today ? 'Today' : `${weekdayShort(day)} ${formatDayMonth(day)}`,
    accessibilityLabel: formatDayMonth(day),
  }));

  const applyQuickEntry = () => {
    const entry = parseQuickEntry(quickText, trip.localCurrency);
    if (!entry) {
      setQuickMessage('I could not find an amount in that. Try something like "1200 yen ramen".');
      return;
    }
    setAmountText(amountAsText(entry.amountMinor, entry.currency));
    setCurrency(entry.currency);
    if (entry.category) setCategory(entry.category);
    if (entry.description) setMerchant(entry.description.slice(0, MAX_TEXT_LENGTH));
    setQuickMessage(`Filled in below. Check it, then tap ${submitLabel}.`);
  };

  const submit = () => {
    const draft: ExpenseDraft = { amountOriginal: amount ?? 0, currency, category, merchantName: merchant, note, purchaseDate: date };
    const result = onSubmit(draft, liveQuote);
    setProblems(result.ok ? [] : result.problems);
  };

  const has = (problem: ExpenseProblem) => problems.includes(problem);

  return (
    <View style={styles.form}>
      {quickEntry ? (
        <Card>
          <TextField
            label="Type it"
            value={quickText}
            onChangeText={setQuickText}
            placeholder="1200 yen ramen"
            helper={quickMessage ?? 'Write the amount and what it was for, then tap Fill in.'}
            onSubmit={applyQuickEntry}
          />
          <Button label="Fill in" variant="quiet" onPress={applyQuickEntry} />
        </Card>
      ) : null}

      <MoneyField
        label="Amount"
        value={amountText}
        onChangeText={setAmountText}
        currency={currency}
        error={has('amount_missing') ? expenseProblemMessages.amount_missing : undefined}
      />

      <View style={styles.group}>
        <AppText variant="label">Currency</AppText>
        <ChoiceChips label="Currency" choices={currencyChoices} value={currency} onChange={setCurrency} />
        {showAllCurrencies ? null : <Button label="Other currencies" variant="quiet" onPress={() => setShowAllCurrencies(true)} />}
      </View>

      {currency !== 'MYR' ? (
        <Card>
          <AppText color="muted">In Ringgit</AppText>
          <AppText variant="title">{amountMyr !== null ? formatMoney(amountMyr, 'MYR') : 'RM 0.00'}</AppText>
          {quote ? (
            <AppText variant="caption" color="muted">
              {keepsOriginalRate
                ? `Keeps the rate it was saved with: 1 MYR = ${quote.ratePerMyr} ${currency}`
                : `1 MYR = ${quote.ratePerMyr} ${currency}. ${rateLabel(rates)}`}
            </AppText>
          ) : (
            <AppText variant="caption" color="danger" role="alert">
              {expenseProblemMessages.rate_missing}
            </AppText>
          )}
        </Card>
      ) : null}

      <View style={styles.group}>
        <AppText variant="label">Category</AppText>
        <ChoiceChips
          label="Category"
          value={category}
          onChange={setCategory}
          choices={CATEGORIES.map((value) => ({ value, label: categoryLabels[value], leading: <CategoryIcon category={value} size={32} /> }))}
        />
      </View>

      <TextField
        label="Where or what"
        value={merchant}
        onChangeText={setMerchant}
        placeholder="Ichiran Shibuya"
        maxLength={MAX_TEXT_LENGTH}
        error={has('text_too_long') ? expenseProblemMessages.text_too_long : undefined}
      />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Extra noodles" maxLength={MAX_TEXT_LENGTH} />

      <View style={styles.group}>
        <AppText variant="label">Day</AppText>
        <ChoiceChips label="Day" layout="scroll" choices={dayChoices} value={date} onChange={setDate} />
      </View>

      {problems
        .filter((problem) => problem !== 'amount_missing' && problem !== 'text_too_long')
        .map((problem) => (
          <AppText key={problem} color="danger" role="alert">
            {expenseProblemMessages[problem]}
          </AppText>
        ))}

      <Button label={submitLabel} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  group: { gap: spacing.sm },
});
