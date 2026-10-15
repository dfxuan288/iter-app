import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateRangeCalendar, type DateRange } from '@/components/trip/DateRangeCalendar';
import { DestinationPicker } from '@/components/trip/DestinationPicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { MoneyField } from '@/components/ui/MoneyField';
import { budgetRules } from '@/config/budget';
import { findDestination } from '@/data/destinations';
import { safeToSpendPerDay, splitByPercent } from '@/domain/budget';
import { daysInclusive, formatFullDate } from '@/domain/dates';
import { currencies, formatMoney, parseMoneyInput, sumMinor } from '@/domain/money';
import { CATEGORIES, categoryLabels, type Category } from '@/domain/types';
import { MAX_TRIP_DAYS, tripProblemMessages } from '@/services/tripService';
import { useAppData } from '@/state/AppDataProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const STEPS = ['Where', 'When', 'Budget', 'Categories', 'Review'] as const;

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });
/** Amounts typed into fields are shown without the "RM" and without ".00". */
const asInput = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true }).replace('RM ', '').replace(/,/g, '');

type CategoryText = Record<Category, string>;
const emptyCategories = (): CategoryText => ({ food: '', transport: '', activities: '', shopping: '' });

export default function PlanTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { today, addTrip } = useAppData();

  const [step, setStep] = useState(0);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [dates, setDates] = useState<DateRange>({ start: null, end: null });
  const [budgetText, setBudgetText] = useState('');
  const [reserveText, setReserveText] = useState('');
  const [categoryText, setCategoryText] = useState<CategoryText>(emptyCategories);
  const [categoriesEdited, setCategoriesEdited] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saveProblems, setSaveProblems] = useState<string[]>([]);

  const destination = destinationId ? findDestination(destinationId) : undefined;
  const totalDays = dates.start && dates.end ? daysInclusive(dates.start, dates.end) : null;
  const budget = parseMoneyInput(budgetText, 'MYR');
  const reserve = reserveText.trim() === '' ? 0 : parseMoneyInput(reserveText, 'MYR');
  const spendable = budget !== null && reserve !== null ? budget - reserve : null;
  const categoryAmounts = CATEGORIES.map((c) => (categoryText[c].trim() === '' ? 0 : parseMoneyInput(categoryText[c], 'MYR')));
  const categoriesValid = categoryAmounts.every((amount) => amount !== null);
  const assigned = sumMinor(categoryAmounts.map((amount) => amount ?? 0));
  const unassigned = spendable !== null ? spendable - assigned : null;
  const suggestedReserve = budget ? Math.round((budget * budgetRules.suggestedReservePercent) / 100 / 100) * 100 : null;

  // One message per step; null means the step is complete.
  const stepError: (string | null)[] = [
    destination ? null : tripProblemMessages.unknown_destination,
    totalDays === null ? tripProblemMessages.invalid_dates : totalDays > MAX_TRIP_DAYS ? tripProblemMessages.trip_too_long : null,
    budget === null || budget <= 0
      ? tripProblemMessages.budget_missing
      : reserve === null
        ? 'Enter the reserve as a number, or leave it empty.'
        : reserve >= budget
          ? tripProblemMessages.reserve_too_large
          : null,
    !categoriesValid
      ? 'Enter each category as a number, or leave it empty.'
      : unassigned !== null && unassigned < 0
        ? tripProblemMessages.categories_exceed_budget
        : null,
    null,
  ];
  const currentError = stepError[step] ?? null;

  const fillSuggestedSplit = () => {
    if (spendable === null || spendable <= 0) return;
    const split = splitByPercent(spendable, budgetRules.suggestedSplitPercent);
    setCategoryText(Object.fromEntries(CATEGORIES.map((c) => [c, asInput(split[c])])) as CategoryText);
  };

  const goBack = () => {
    setShowErrors(false);
    if (step === 0) router.back();
    else setStep(step - 1);
  };

  const goNext = () => {
    if (currentError) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    // Arriving at Categories for the first time: start from the suggested split.
    if (step === 2 && !categoriesEdited) fillSuggestedSplit();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!destination || !dates.start || !dates.end || budget === null || reserve === null) return;
    const result = addTrip({
      destinationId: destination.id,
      startDate: dates.start,
      endDate: dates.end,
      totalBudgetMyr: budget,
      reserveMyr: reserve,
      categoryPlanMyr: Object.fromEntries(CATEGORIES.map((c, index) => [c, categoryAmounts[index] ?? 0])) as Record<Category, number>,
    });
    if (result.ok) router.replace('/');
    else setSaveProblems(result.problems.map((problem) => tripProblemMessages[problem]));
  };

  const perDay = budget !== null && reserve !== null && totalDays ? safeToSpendPerDay(budget, reserve, 0, totalDays) : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <IconButton icon={ArrowLeftIcon} accessibilityLabel={step === 0 ? 'Cancel and go back' : 'Previous step'} onPress={goBack} />
        <View style={styles.progress} role="progressbar" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((name, index) => (
            <View key={name} style={[styles.progressSegment, index <= step && styles.progressSegmentDone]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <>
            <AppText variant="title">Where are you going?</AppText>
            <AppText color="muted">This sets the currency for your trip.</AppText>
            <DestinationPicker value={destinationId} onChange={setDestinationId} />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <AppText variant="title">When is your trip?</AppText>
            <AppText color="muted">Tap your first day, then your last day.</AppText>
            <DateRangeCalendar value={dates} onChange={setDates} minDate={today} />
            {dates.start ? (
              <Card>
                <AppText color="muted">{dates.end ? 'Your trip' : 'First day'}</AppText>
                <AppText variant="heading">
                  {dates.end ? `${formatFullDate(dates.start)} to ${formatFullDate(dates.end)}` : formatFullDate(dates.start)}
                </AppText>
                {totalDays ? <AppText color="muted">{totalDays === 1 ? '1 day' : `${totalDays} days`}</AppText> : null}
              </Card>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AppText variant="title">What is your budget?</AppText>
            <AppText color="muted">What you plan to spend day to day, in Ringgit: food, getting around, activities and shopping. Leave out your hotel and flights.</AppText>
            <MoneyField label="Total budget" value={budgetText} onChangeText={setBudgetText} placeholder="2600" />
            <MoneyField
              label="Reserve (optional)"
              value={reserveText}
              onChangeText={setReserveText}
              helper="Money kept aside for emergencies. ITER never counts it as safe to spend."
            />
            {suggestedReserve && reserveText.trim() === '' ? (
              <Button
                variant="quiet"
                label={`Use suggested reserve: ${rm(suggestedReserve)}`}
                onPress={() => setReserveText(asInput(suggestedReserve))}
              />
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <AppText variant="title">Split it by category</AppText>
            <AppText color="muted">
              {spendable !== null ? `You have ${rm(spendable)} to plan after your reserve.` : 'Plan how you expect to spend.'} This
              is a guide for you; your daily amount uses the whole budget.
            </AppText>
            {CATEGORIES.map((category) => (
              <MoneyField
                key={category}
                label={categoryLabels[category]}
                value={categoryText[category]}
                onChangeText={(text) => {
                  setCategoriesEdited(true);
                  setCategoryText({ ...categoryText, [category]: text });
                }}
              />
            ))}
            {unassigned !== null && categoriesValid ? (
              <Card>
                <AppText color="muted">{unassigned >= 0 ? 'Not assigned to a category' : 'Over your budget by'}</AppText>
                <AppText variant="number" color={unassigned >= 0 ? 'primary' : 'danger'}>
                  {rm(Math.abs(unassigned))}
                </AppText>
                {unassigned > 0 ? <AppText color="muted">That is fine. It stays flexible and counts as safe to spend.</AppText> : null}
              </Card>
            ) : null}
            <Button variant="quiet" label="Use the suggested split" onPress={fillSuggestedSplit} />
          </>
        ) : null}

        {step === 4 && destination && dates.start && dates.end && budget !== null && reserve !== null ? (
          <>
            <AppText variant="title">Ready to go?</AppText>
            <Card style={styles.review}>
              <ReviewRow label="Destination" value={`${destination.city}, ${destination.country}`} />
              <ReviewRow label="Currency" value={`${currencies[destination.currency].name} (${destination.currency})`} />
              <ReviewRow label="Dates" value={`${formatFullDate(dates.start)} to ${formatFullDate(dates.end)}`} />
              <ReviewRow label="Length" value={totalDays === 1 ? '1 day' : `${totalDays} days`} />
              <ReviewRow label="Total budget" value={rm(budget)} />
              <ReviewRow label="Reserve" value={rm(reserve)} />
              {CATEGORIES.map((category, index) => (
                <ReviewRow key={category} label={categoryLabels[category]} value={rm(categoryAmounts[index] ?? 0)} />
              ))}
            </Card>
            <Card>
              <AppText color="muted">Safe to spend when you start</AppText>
              <AppText variant="title">{`${rm(perDay)} a day`}</AppText>
              <AppText color="muted">Your budget after the reserve, shared over every day of the trip.</AppText>
            </Card>
            <AppText variant="caption" color="muted">
              Starting this trip moves your current trip to your history.
            </AppText>
          </>
        ) : null}

        {showErrors && currentError ? (
          <AppText color="danger" role="alert">
            {currentError}
          </AppText>
        ) : null}
        {saveProblems.map((problem) => (
          <AppText key={problem} color="danger" role="alert">
            {problem}
          </AppText>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button label={step === STEPS.length - 1 ? 'Start trip' : 'Continue'} onPress={goNext} />
      </View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <AppText color="muted">{label}</AppText>
      <AppText variant="bodyStrong" align="right" style={styles.reviewValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.md },
  progress: { flex: 1, flexDirection: 'row', gap: spacing.xs + 2 },
  progressSegment: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
  progressSegmentDone: { backgroundColor: colors.navy },
  content: { paddingHorizontal: spacing.lg + 4, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  review: { gap: spacing.md },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.lg },
  reviewValue: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg + 4, paddingTop: spacing.md, backgroundColor: colors.surface },
});
