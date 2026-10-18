import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedMoney } from '@/components/ui/AnimatedMoney';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CaretLeftIcon, ShareNetworkIcon, XIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { StackScreen } from '@/components/ui/StackScreen';
import { findDestination } from '@/data/destinations';
import { formatDayMonth, formatDayRange, weekdayShort } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { summarizeRefunds } from '@/domain/taxRefund';
import { categoryLabels } from '@/domain/types';
import { wrapTrip, type TripWrap } from '@/domain/wrapped';
import { useAppData } from '@/state/AppDataProvider';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });

interface Slide {
  key: string;
  eyebrow: string;
  /** The big line: text, or an amount that counts up. */
  big: { text: string } | { sen: number; template?: (amount: string) => string };
  sub?: string;
  extra?: ReactNode;
  /** Gradient colours behind the card. */
  colors: readonly [string, string, ...string[]];
}

const backgrounds = {
  deep: [colors.navy, '#0A4F69'] as const,
  ocean: [colors.navy, colors.teal, colors.aquaDeep] as const,
  teal: ['#0D5C73', colors.teal] as const,
  night: ['#022634', colors.navy] as const,
};

/**
 * Trip Wrapped: the trip's highlights as full-screen cards, like Spotify Wrapped. Tap the right of
 * the screen (or Next) to go on, the left (or Back) to go back. Before the trip is over the cards say
 * "so far". Every figure comes from domain/wrapped.ts.
 */
export default function WrappedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { trip, summary, expenses, expensesToDate } = useAppData();
  const [index, setIndex] = useState(0);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const wrap =
    trip && summary
      ? wrapTrip({
          trip,
          expenses,
          dailySpend: summary.dailySpend,
          phase: summary.phase,
          dayNumber: summary.dayNumber,
          totalDays: summary.totalDays,
          refundMyr: summarizeRefunds(trip, expensesToDate).toCollectMyr,
        })
      : null;

  if (!trip || !wrap) {
    return (
      <StackScreen title="Trip Wrapped">
        <AppText variant="heading">Nothing to wrap yet</AppText>
        <AppText color="muted">Your Trip Wrapped appears once your trip has started. Come back after day 1.</AppText>
      </StackScreen>
    );
  }

  const destination = findDestination(trip.destinationId);
  const slides = buildSlides(wrap, trip.city, trip.country, formatDayRange(trip.startDate, trip.endDate));
  const slide = slides[Math.min(index, slides.length - 1)]!;
  const last = index >= slides.length - 1;
  const next = () => (last ? close() : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));
  // Tapping the left third goes back, the rest goes on, as in story viewers.
  const onTap = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent;
    if (locationX < 120) back();
    else if (!last) next();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={slide.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {index === 0 && destination?.photo ? (
        <Animated.View entering={FadeIn.duration(500).reduceMotion(ReduceMotion.System)} style={StyleSheet.absoluteFill}>
          <Image source={destination.photo} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={destination.photoAlt} />
          <LinearGradient colors={['rgba(5,59,80,0.45)', 'rgba(5,59,80,0.62)', 'rgba(5,59,80,0.95)']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.progress} accessible aria-label={`Card ${index + 1} of ${slides.length}`}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.segment, i <= index && styles.segmentDone]} />
          ))}
        </View>
        <PressableScale onPress={close} role="button" aria-label="Close Trip Wrapped" style={styles.close}>
          <XIcon size={22} color={colors.white} weight="bold" />
        </PressableScale>
      </View>

      <Pressable style={styles.tapArea} onPress={onTap} accessible={false}>
        <Animated.View key={slide.key} style={styles.content} entering={FadeInDown.springify().damping(18).stiffness(160).reduceMotion(ReduceMotion.System)}>
          <AppText variant="label" style={styles.eyebrow}>
            {slide.eyebrow.toUpperCase()}
          </AppText>
          {'text' in slide.big ? (
            <AppText variant="display" color="inverse" style={styles.big}>
              {slide.big.text}
            </AppText>
          ) : (
            <AnimatedMoney sen={slide.big.sen} template={slide.big.template} fromZero variant="display" color="inverse" style={styles.big} />
          )}
          {slide.sub ? (
            <AppText color="inverse" style={styles.sub}>
              {slide.sub}
            </AppText>
          ) : null}
          {slide.extra}
        </Animated.View>
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}>
        {index > 0 ? (
          <PressableScale onPress={back} role="button" aria-label="Previous card" style={styles.backButton}>
            <CaretLeftIcon size={22} color={colors.white} weight="bold" />
          </PressableScale>
        ) : null}
        <View style={styles.flex}>
          {last ? (
            <Button label="Share to Community" icon={ShareNetworkIcon} variant="accent" onPress={() => router.replace('/community/share')} />
          ) : (
            <Button label={index === 0 ? 'Start' : 'Next'} variant="accent" onPress={next} />
          )}
        </View>
      </View>
    </View>
  );
}

function buildSlides(wrap: TripWrap, city: string, country: string, dates: string): Slide[] {
  const soFar = wrap.final ? '' : ' so far';
  const slides: Slide[] = [
    {
      key: 'intro',
      eyebrow: wrap.final ? 'ITER Wrapped' : 'ITER Wrapped · so far',
      big: { text: `Your ${city} trip` },
      sub: wrap.final ? `${wrap.totalDays} days, ${dates}` : `Day ${wrap.daysCounted} of ${wrap.totalDays}, ${dates}`,
      colors: backgrounds.deep,
    },
    {
      key: 'spent',
      eyebrow: `You spent${soFar}`,
      big: { sen: wrap.spentMyr },
      sub: `About ${rm(wrap.averagePerDayMyr)} a day over ${wrap.daysCounted} ${wrap.daysCounted === 1 ? 'day' : 'days'}.`,
      extra: <Pill text={wrap.leftMyr >= 0 ? `${rm(wrap.leftMyr)} of your ${rm(wrap.budgetMyr)} budget ${wrap.final ? 'unspent' : 'left'}` : `${rm(-wrap.leftMyr)} over your ${rm(wrap.budgetMyr)} budget`} />,
      colors: backgrounds.ocean,
    },
  ];
  if (wrap.biggestDay) {
    const day = wrap.biggestDay;
    slides.push({
      key: 'day',
      eyebrow: 'Your biggest day',
      big: { text: `Day ${day.dayNumber}` },
      sub: `${weekdayShort(day.date)} ${formatDayMonth(day.date)}: ${rm(day.spentMyr)}`,
      extra: day.topMerchant ? <Pill text={`Most of it at ${day.topMerchant}`} /> : undefined,
      colors: backgrounds.teal,
    });
  }
  const top = wrap.categories[0];
  if (top) {
    slides.push({
      key: 'categories',
      eyebrow: 'Where it went',
      big: { text: categoryLabels[top.category] },
      sub: `${top.percent}% of your spending${soFar}.`,
      extra: <CategoryBars categories={wrap.categories} />,
      colors: backgrounds.night,
    });
  }
  if (wrap.biggestSpend) {
    const buy = wrap.biggestSpend;
    slides.push({
      key: 'buy',
      eyebrow: 'Your biggest buy',
      big: { text: buy.merchant },
      sub: `${rm(buy.amountMyr)} on ${formatDayMonth(buy.date)}, ${categoryLabels[buy.category].toLowerCase()}.`,
      colors: backgrounds.ocean,
    });
  }
  slides.push({
    key: 'logged',
    eyebrow: 'You kept track',
    big: { text: `${wrap.expenseCount} ${wrap.expenseCount === 1 ? 'expense' : 'expenses'}` },
    sub: wrap.scannedCount > 0 ? `${wrap.scannedCount} of them by scanning a receipt with ITER.` : 'Every one typed in by hand. Next time, try scanning.',
    colors: backgrounds.deep,
  });
  if (wrap.refundMyr > 0) {
    slides.push({
      key: 'refund',
      eyebrow: 'Money coming back',
      big: { sen: wrap.refundMyr, template: (amount) => `Up to ${amount}` },
      sub: `In tax refunds from ${country}, for the tax-free shopping you logged.`,
      colors: backgrounds.teal,
    });
  }
  slides.push({
    key: 'end',
    eyebrow: wrap.final ? "That's a wrap" : 'More to come',
    big: { text: 'Share your trip?' },
    sub: 'Help other travellers plan: post your trip summary to Community. Your expenses stay private.',
    colors: backgrounds.night,
  });
  return slides;
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <AppText variant="bodyStrong" color="inverse">
        {text}
      </AppText>
    </View>
  );
}

function CategoryBars({ categories }: { categories: TripWrap['categories'] }) {
  return (
    <View style={styles.bars}>
      {categories.map((c, i) => (
        <Animated.View key={c.category} entering={FadeInDown.delay(250 + i * 90).reduceMotion(ReduceMotion.System)} style={styles.barRow}>
          <View style={styles.barLabels}>
            <AppText variant="bodyStrong" color="inverse">
              {categoryLabels[c.category]}
            </AppText>
            <AppText color="inverseMuted">{`${rm(c.spentMyr)} · ${c.percent}%`}</AppText>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, c.percent)}%` }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  segmentDone: { backgroundColor: colors.white },
  close: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  tapArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  content: { gap: spacing.md },
  // White: the brand green is too faint on the teal cards (contrast).
  eyebrow: { color: colors.white, letterSpacing: 1.5 },
  big: { textShadowColor: 'rgba(5,59,80,0.5)', textShadowRadius: 14 },
  sub: { fontSize: 18, lineHeight: 26 },
  pill: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bars: { gap: spacing.md, marginTop: spacing.md },
  barRow: { gap: spacing.xs },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: colors.accent },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  backButton: {
    width: MIN_TOUCH_TARGET + 8,
    height: MIN_TOUCH_TARGET + 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  flex: { flex: 1 },
});
