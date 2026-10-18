import { Image } from 'expo-image';
import { useRef, useState, type ComponentType } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { planConfig } from '@/config/plans';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

import { ART_HEIGHT, CommunityArt, SafeToSpendArt, ScanArt } from './WelcomeArt';

interface Page {
  key: string;
  title: string;
  body: string;
  Art: ComponentType;
}

const pages: Page[] = [
  {
    key: 'safe',
    title: 'Know what’s safe to spend, every day',
    body: 'Set your trip budget once. ITER tells you what you can spend today, and warns you before you run short.',
    Art: SafeToSpendArt,
  },
  {
    key: 'scan',
    title: 'Snap it, we log it.',
    body: 'Point your camera at a receipt or a menu. AI reads it, turns it into Ringgit and checks for a tax refund.',
    Art: ScanArt,
  },
  {
    key: 'community',
    title: 'See what trips really cost',
    body: `Real trips shared by Malaysian travellers. Your free trial covers the first ${planConfig.trial.days} days of your trip.`,
    Art: CommunityArt,
  },
];

/**
 * The welcome screens on first open (after the team's onboarding reference): swipe, or use the
 * button, through three pages, then "Get started". Skip ends it at any time.
 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  // A page's cards float in the first time it is reached.
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const last = index === pages.length - 1;

  const goTo = (next: number) => {
    scroller.current?.scrollTo({ x: next * width, animated: true });
    show(next);
  };
  const show = (next: number) => {
    setIndex(next);
    setSeen((current) => (current.has(next) ? current : new Set(current).add(next)));
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < pages.length) show(next);
  };

  return (
    <Animated.View
      style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}
      exiting={FadeOut.duration(250).reduceMotion(ReduceMotion.System)}
      entering={FadeIn.duration(250).reduceMotion(ReduceMotion.System)}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.top}>
        <View style={styles.logoRow}>
          <Image source={require('@/assets/images/iter-symbol.png')} style={styles.logo} contentFit="contain" accessibilityLabel="" />
          <AppText variant="heading">ITER</AppText>
        </View>
        {last ? null : (
          <PressableScale onPress={onDone} role="button" aria-label="Skip the welcome screens" style={styles.skip}>
            <AppText variant="label" color="muted">
              Skip
            </AppText>
          </PressableScale>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={styles.pager}>
        {pages.map(({ key, title, body, Art }, i) => (
          <View key={key} style={[styles.page, { width: width || undefined }]} aria-hidden={i !== index}>
            <View style={styles.art}>{seen.has(i) ? <Art /> : null}</View>
            <View style={styles.text}>
              <AppText variant="title" style={styles.center} role="heading">
                {title}
              </AppText>
              <AppText color="muted" style={[styles.center, styles.body]}>
                {body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessible aria-label={`Page ${index + 1} of ${pages.length}`}>
        {pages.map((page, i) => (
          <View key={page.key} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
      <View style={styles.cta}>
        <Button label={last ? 'Get started' : 'Next'} variant="accent" onPress={() => (last ? onDone() : goTo(index + 1))} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 40, backgroundColor: colors.card },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: MIN_TOUCH_TARGET },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 22, height: 28 },
  skip: { position: 'absolute', right: spacing.lg, minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl },
  art: { height: ART_HEIGHT, justifyContent: 'center' },
  text: { gap: spacing.sm, maxWidth: 360, alignSelf: 'center' },
  center: { textAlign: 'center' },
  body: { lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken },
  dotOn: { width: 22, backgroundColor: colors.navy },
  cta: { paddingHorizontal: spacing.xl, maxWidth: 420, width: '100%', alignSelf: 'center' },
});
