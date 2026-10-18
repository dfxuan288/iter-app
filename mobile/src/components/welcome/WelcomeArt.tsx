import { Image } from 'expo-image';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Avatar } from '@/components/community/Avatar';
import { AppText } from '@/components/ui/AppText';
import { CheckCircleIcon, CoinsIcon, MapPinIcon } from '@/components/ui/icons';
import { ScanMarkIcon } from '@/components/ui/ScanMarkIcon';
import { findDestination } from '@/data/destinations';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

/**
 * The collages on the welcome screens: real ITER cards floating over a dotted map with dashed travel
 * routes (after the team's onboarding reference). Purely decorative, so screen readers skip them;
 * each screen's title says what it shows.
 */

export const ART_WIDTH = 340;
export const ART_HEIGHT = 300;

const photo = (id: string) => findDestination(id)?.photo;

/** A card that floats in, one after another. */
function Float({ index, style, children }: { index: number; style: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <Animated.View style={[styles.float, style]} entering={FadeInDown.delay(120 + index * 140).springify().damping(16).stiffness(140).reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}

/** Dots that fade out from the middle, like a dotted world map, plus dashed routes between places. */
function Backdrop() {
  const dots = useMemo(() => {
    const list: { x: number; y: number; o: number }[] = [];
    const step = 17;
    for (let x = step / 2; x < ART_WIDTH; x += step) {
      for (let y = step / 2; y < ART_HEIGHT; y += step) {
        // A soft, uneven shape rather than a plain circle, so it reads as land.
        const dx = (x - ART_WIDTH / 2) / (ART_WIDTH * 0.52);
        const dy = (y - ART_HEIGHT / 2) / (ART_HEIGHT * 0.5);
        const wobble = 0.18 * Math.sin(x / 23) * Math.cos(y / 19);
        const o = 1 - Math.sqrt(dx * dx + dy * dy) + wobble;
        if (o > 0.08) list.push({ x, y, o: Math.min(0.5, o * 0.55) });
      }
    }
    return list;
  }, []);
  return (
    <Svg width={ART_WIDTH} height={ART_HEIGHT} style={StyleSheet.absoluteFill}>
      {dots.map((d) => (
        <Circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={1.7} fill={colors.teal} opacity={d.o} />
      ))}
      <Path d="M 20 210 C 90 120, 180 280, 320 90" stroke={colors.teal} strokeWidth={1.6} strokeDasharray="4 7" fill="none" opacity={0.55} />
      <Path d="M 30 60 C 120 20, 210 70, 300 260" stroke={colors.teal} strokeWidth={1.6} strokeDasharray="4 7" fill="none" opacity={0.35} />
      {[
        [300, 96, colors.accent],
        [306, 103, colors.accent],
        [312, 96, colors.accent],
        [28, 214, colors.teal],
        [36, 220, colors.teal],
        [44, 214, colors.teal],
      ].map(([x, y, c]) => (
        <Circle key={`${x}-${y}`} cx={x as number} cy={y as number} r={3} fill={c as string} />
      ))}
    </Svg>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.frame} aria-hidden importantForAccessibility="no-hide-descendants">
      <Backdrop />
      {children}
    </View>
  );
}

/** 1. Safe to spend: the Tokyo card, a list of trips, and a status chip. */
export function SafeToSpendArt() {
  return (
    <Frame>
      <Float index={0} style={styles.hero}>
        <Image source={photo('tokyo')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.heroShade} />
        <View style={styles.heroTop}>
          <View style={styles.glassChip}>
            <MapPinIcon size={11} color={colors.white} weight="fill" />
            <AppText style={styles.glassText}>Tokyo</AppText>
          </View>
          <View style={styles.glassChip}>
            <AppText style={styles.glassText}>Day 7 of 10</AppText>
          </View>
        </View>
        <View>
          <AppText style={styles.heroAmount}>RM 200</AppText>
          <AppText style={styles.heroCaption}>a day across your 4 days left</AppText>
        </View>
      </Float>
      <Float index={1} style={styles.tripList}>
        {[
          ['tokyo', 'Tokyo', '10 days · Nov'],
          ['bangkok', 'Bangkok', '5 days · Dec'],
          ['seoul', 'Seoul', '7 days · Mar'],
        ].map(([id, city, when]) => (
          <View key={id} style={styles.tripRow}>
            <Image source={photo(id!)} style={styles.thumb} contentFit="cover" />
            <View>
              <AppText style={styles.rowTitle}>{city}</AppText>
              <AppText style={styles.rowSub}>{when}</AppText>
            </View>
          </View>
        ))}
      </Float>
      <Float index={2} style={styles.statusChip}>
        <CheckCircleIcon size={16} color={colors.accentText} weight="fill" />
        <AppText style={styles.rowTitle}>On track</AppText>
      </Float>
      <Float index={3} style={styles.budgetChip}>
        <AppText style={styles.rowSub}>Budget</AppText>
        <AppText style={styles.rowTitle}>RM 2,550</AppText>
      </Float>
    </Frame>
  );
}

/** 2. Scanning: a receipt under the scan mark, the expense it became, and its tax refund. */
export function ScanArt() {
  return (
    <Frame>
      <Float index={0} style={styles.receipt}>
        <AppText style={styles.receiptShop}>DON QUIJOTE</AppText>
        <AppText style={styles.receiptLine}>Shibuya · 14 Nov</AppText>
        {['Matcha KitKat ×2', 'Sunscreen SPF50', 'Face masks ×5'].map((line) => (
          <View key={line} style={styles.receiptRow}>
            <AppText style={styles.receiptLine}>{line}</AppText>
            <View style={styles.receiptDots} />
          </View>
        ))}
        <View style={styles.receiptRule} />
        <View style={styles.receiptRow}>
          <AppText style={styles.receiptShop}>TOTAL</AppText>
          <AppText style={styles.receiptShop}>¥2,960</AppText>
        </View>
      </Float>
      <Animated.View style={styles.scanMark} entering={ZoomIn.delay(260).springify().damping(14).reduceMotion(ReduceMotion.System)}>
        <ScanMarkIcon size={150} frameColor={colors.navy} lineColor={colors.accent} />
      </Animated.View>
      <Float index={2} style={styles.expenseRow}>
        <View style={styles.iconTile}>
          <CheckCircleIcon size={18} color={colors.accentText} weight="fill" />
        </View>
        <View>
          <AppText style={styles.rowTitle}>Don Quijote</AppText>
          <AppText style={styles.rowSub}>Shopping · saved</AppText>
        </View>
        <AppText style={styles.rowAmount}>RM 76.41</AppText>
      </Float>
      <Float index={3} style={styles.refundChip}>
        <CoinsIcon size={16} color={colors.navy} weight="fill" />
        <AppText style={styles.rowTitle}>Tax refund: up to RM 60.66</AppText>
      </Float>
    </Frame>
  );
}

/** 3. Community: destination photos with travellers, and what a typical trip costs. */
export function CommunityArt() {
  return (
    <Frame>
      <Float index={1} style={[styles.place, styles.placeLeft]}>
        <Image source={photo('seoul')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.avatar}>
          <Avatar id="u-sample-2" name="Jia" size={28} />
        </View>
      </Float>
      <Float index={0} style={[styles.place, styles.placeCentre]}>
        <Image source={photo('tokyo')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.avatar}>
          <Avatar id="u-sample-1" name="Hui Min" size={32} />
        </View>
      </Float>
      <Float index={2} style={[styles.place, styles.placeRight]}>
        <Image source={photo('bali')} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.avatar}>
          <Avatar id="u-sample-3" name="Arif" size={28} />
        </View>
      </Float>
      <Float index={3} style={styles.typical}>
        <AppText style={styles.rowSub}>Typical 5-day Tokyo trip</AppText>
        <AppText style={styles.rowAmount}>RM 2,000 · RM 405 a day</AppText>
      </Float>
      <Float index={4} style={styles.nowChip}>
        <MapPinIcon size={14} color={colors.teal} weight="fill" />
        <AppText style={styles.rowSub}>Shared from Kuala Lumpur</AppText>
      </Float>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { width: ART_WIDTH, height: ART_HEIGHT, alignSelf: 'center' },
  float: { position: 'absolute', backgroundColor: colors.card, borderRadius: 16, ...shadow.raised },
  // 1
  hero: { left: 18, top: 34, width: 190, height: 170, overflow: 'hidden', padding: spacing.md, justifyContent: 'space-between', backgroundColor: colors.navy },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,59,80,0.45)' },
  heroTop: { flexDirection: 'row', gap: 6 },
  glassChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.22)' },
  glassText: { color: colors.white, fontSize: 10, fontWeight: '600' },
  heroAmount: { color: colors.white, fontSize: 30, lineHeight: 34, fontWeight: '700' },
  heroCaption: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  tripList: { right: 10, top: 118, width: 168, padding: spacing.sm, gap: 6 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 30, height: 30, borderRadius: 8 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  rowSub: { fontSize: 11, color: colors.textMuted },
  rowAmount: { fontSize: 13, fontWeight: '700', color: colors.navy },
  statusChip: { left: 40, top: 222, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  budgetChip: { right: 24, top: 40, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  // 2
  receipt: { left: 92, top: 30, width: 156, padding: spacing.md, gap: 5, borderRadius: 8 },
  receiptShop: { fontSize: 11, fontWeight: '700', color: colors.navy, letterSpacing: 1 },
  receiptLine: { fontSize: 10, color: colors.textMuted },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  receiptDots: { flex: 1, height: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: colors.border },
  receiptRule: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  scanMark: { position: 'absolute', left: 95, top: 26 },
  expenseRow: { right: 6, top: 196, flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.sm, paddingRight: spacing.md },
  iconTile: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  refundChip: { left: 6, top: 250, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  // 3
  place: { overflow: 'hidden', borderWidth: 3, borderColor: colors.card },
  placeLeft: { left: 30, top: 60, width: 86, height: 120, borderRadius: 14 },
  placeCentre: { left: 116, top: 36, width: 108, height: 150, borderRadius: 16, borderColor: colors.accent },
  placeRight: { left: 226, top: 60, width: 86, height: 120, borderRadius: 14 },
  avatar: { position: 'absolute', bottom: 6, alignSelf: 'center', borderRadius: radius.pill, borderWidth: 2, borderColor: colors.card },
  typical: { left: 40, top: 196, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  nowChip: { right: 10, top: 262, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
});
