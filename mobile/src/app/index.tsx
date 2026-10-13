import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { CheckCircleIcon, MapPinIcon, ReceiptIcon, TagIcon } from '@/components/ui/icons';
import { GlassPanel } from '@/components/ui/OceanCard';
import { PhotoCard } from '@/components/ui/PhotoCard';
import { Reveal } from '@/components/ui/Reveal';
import { Screen } from '@/components/ui/Screen';
import { TicketCard } from '@/components/ui/TicketCard';
import { destinations } from '@/data/destinations';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * DESIGN PREVIEW. These figures are the agreed demo numbers (docs/DECISIONS.md), typed in by
 * hand so the visual style can be reviewed. Phase 1 replaces them with values calculated from
 * the seeded trip, and nothing here should be read as working logic.
 */
const preview = {
  trip: 'Tokyo',
  day: 'Day 7 of 10',
  safePerDay: 'RM 200',
  daysLeft: 'a day for the next 4 days',
  spent: 'RM 2,700',
  remaining: 'RM 1,500',
  refundTotal: 'RM 60.66',
  receipt: { shop: 'UNIQLO Ginza', date: '14 Nov', category: 'Shopping', yen: '¥9,570', myr: 'RM 247.13', refund: '¥869' },
};

export default function HomeScreen() {
  const tripPhoto = destinations[0];
  return (
    <Screen
      title="Safe to spend"
      subtitle="Smarter journeys. Safer spends."
      top={
        <View style={styles.brandRow}>
          <View style={styles.logoTile}>
            <Image
              source={require('@/assets/images/iter-symbol.png')}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="ITER logo"
            />
          </View>
          <AppText variant="heading">ITER</AppText>
        </View>
      }>
      <Reveal index={0}>
        <PhotoCard photoUrl={tripPhoto?.photoUrl ?? ''} photoAlt={tripPhoto?.photoAlt ?? ''}>
          <View style={styles.chipRow}>
            <Chip tone="photo" icon={MapPinIcon} label={preview.trip} />
            <Chip tone="photo" label={preview.day} />
          </View>
          {/* Leaves the top of the photo clear, so the destination is recognisable. */}
          <View style={styles.photoWindow} />
          <View>
            <AppText variant="display" color="inverse">
              {preview.safePerDay}
            </AppText>
            <AppText color="inverseMuted">{preview.daysLeft}</AppText>
          </View>
          <GlassPanel style={styles.statRow}>
            <View style={styles.stat}>
              <AppText variant="caption" color="inverseMuted">
                Spent so far
              </AppText>
              <AppText variant="number" color="inverse">
                {preview.spent}
              </AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <AppText variant="caption" color="inverseMuted">
                Remaining
              </AppText>
              <AppText variant="number" color="inverse">
                {preview.remaining}
              </AppText>
            </View>
          </GlassPanel>
          <Chip tone="glass" icon={CheckCircleIcon} label="On track" />
        </PhotoCard>
      </Reveal>

      <Reveal index={1}>
        <Card style={styles.refundCard}>
          <View style={styles.iconTile}>
            <TagIcon size={24} color={colors.navy} weight="fill" />
          </View>
          <View style={styles.refundText}>
            <AppText color="muted">Tax refund to collect</AppText>
            <AppText variant="number">{`up to ${preview.refundTotal}`}</AppText>
          </View>
        </Card>
      </Reveal>

      <Reveal index={2} style={styles.section}>
        <AppText variant="heading">Latest receipt</AppText>
        <TicketCard
          stub={
            <View style={styles.stubRow}>
              <CheckCircleIcon size={20} color={colors.accentText} weight="fill" />
              <AppText variant="label" color="accent" style={styles.stubText}>
                {`Tax refund eligible. Collect up to ${preview.receipt.refund}`}
              </AppText>
            </View>
          }>
          <View style={styles.receiptHeader}>
            <View style={[styles.iconTile, styles.iconTileSunken]}>
              <ReceiptIcon size={24} color={colors.navy} />
            </View>
            <View style={styles.refundText}>
              <AppText variant="bodyStrong">{preview.receipt.shop}</AppText>
              <AppText variant="caption" color="muted">
                {`${preview.receipt.date}, ${preview.receipt.category}`}
              </AppText>
            </View>
            <View style={styles.amount}>
              <AppText variant="number">{preview.receipt.myr}</AppText>
              <AppText variant="caption" color="muted">
                {preview.receipt.yen}
              </AppText>
            </View>
          </View>
        </TicketCard>
      </Reveal>

      <Reveal index={3}>
        <AppText variant="caption" color="muted" align="center">
          Design preview with sample numbers. Your real trip arrives in Phase 1.
        </AppText>
      </Reveal>
    </Screen>
  );
}

const TILE = 48;

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 26, height: 32 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoWindow: { height: 96 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: spacing.xxs },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.glassBorder, marginHorizontal: spacing.lg },
  refundCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.tile,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSunken: { backgroundColor: colors.surfaceSunken },
  refundText: { flex: 1 },
  section: { gap: spacing.lg, marginTop: spacing.sm },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { alignItems: 'flex-end' },
  stubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stubText: { flex: 1 },
});
