import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/community/Avatar';
import { PostCard } from '@/components/community/PostCard';
import { SplitBars } from '@/components/community/SplitBars';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { MapPinIcon, PlusIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { Reveal } from '@/components/ui/Reveal';
import { destinations } from '@/data/destinations';
import { destinationStats, feedFor, sortFeed, type FeedOrder } from '@/domain/community';
import { formatMoney } from '@/domain/money';
import { useAppData } from '@/state/AppDataProvider';
import { useCommunity } from '@/state/CommunityProvider';
import { colors, gradients, MAX_APP_WIDTH, radius, shadow, spacing, TAB_BAR_CLEARANCE } from '@/theme/tokens';

const HERO_HEIGHT = 340;
const rm = (sen: number) => formatMoney(sen, 'MYR', { trimZeros: true });

/**
 * Community (brief §7.9): pick a destination, see what a typical trip there costs (worked out from
 * trips people shared), then read and share trip summaries and tips. Layout: the destination's
 * photo across the top, a panel overlapping it with the typical trip, then the feed.
 */
export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trip } = useAppData();
  const { activity, samples, userById, unblock } = useCommunity();
  const [destinationId, setDestinationId] = useState(trip?.destinationId ?? 'tokyo');
  const [order, setOrder] = useState<FeedOrder>('latest');

  const destination = destinations.find((d) => d.id === destinationId) ?? destinations[0];
  const feed = feedFor(destinationId, samples, activity);
  const stats = destinationStats(feed);
  const posts = sortFeed(feed, order);
  const blocked = activity.blocked.map((id) => userById(id)).filter((u) => u !== undefined);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <LinearGradient colors={gradients.ocean} style={StyleSheet.absoluteFill} />
        {destination?.photo ? (
          <Image source={destination.photo} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={destination.photoAlt} transition={200} />
        ) : null}
        <LinearGradient colors={['rgba(5,59,80,0.55)', 'rgba(5,59,80,0.05)', 'rgba(5,59,80,0.75)']} style={StyleSheet.absoluteFill} />

        <AppText variant="heading" color="inverse" style={styles.onPhoto}>
          Community
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pickerScroll}
          contentContainerStyle={styles.picker}
          role="radiogroup"
          aria-label="Destination">
          {destinations.map((d) => {
            const selected = d.id === destinationId;
            return (
              <PressableScale
                key={d.id}
                onPress={() => setDestinationId(d.id)}
                role="radio"
                aria-checked={selected}
                style={[styles.pickerChip, selected ? styles.pickerChipOn : null]}>
                <AppText variant="label" color={selected ? 'primary' : 'inverse'}>
                  {d.city}
                </AppText>
              </PressableScale>
            );
          })}
        </ScrollView>

        <View style={styles.heroTitle}>
          <AppText variant="display" color="inverse" style={styles.onPhoto}>
            {destination?.city}
          </AppText>
          <View style={styles.place}>
            <MapPinIcon size={18} color={colors.white} weight="fill" />
            <AppText variant="bodyStrong" color="inverse" style={styles.onPhoto}>
              {`${destination?.country} · what trips really cost`}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.sheet}>
        <PressableScale onPress={() => router.push({ pathname: '/community/share', params: { destinationId } })} role="button" aria-label="Share your trip or a tip" style={styles.fab}>
          <PlusIcon size={26} color={colors.navy} weight="bold" />
        </PressableScale>

        <Reveal index={0}>
          {stats ? (
            <View style={styles.typical}>
              <AppText variant="heading">{`Typical ${stats.typicalDays}-day ${destination?.city} trip`}</AppText>
              <AppText color="muted">{`Worked out from ${stats.tripCount} trips shared by ITER travellers.`}</AppText>
              <View style={styles.facts}>
                <AppText variant="bodyStrong" color="accent">{`Budget: ${rm(stats.typicalTotalMyr)}`}</AppText>
                <AppText variant="bodyStrong" color="accent">{`${stats.typicalDays} days`}</AppText>
                <AppText variant="bodyStrong" color="accent">{`${rm(Math.round(stats.perDayMyr / 100) * 100)} a day`}</AppText>
              </View>
              <SplitBars split={stats.split} />
            </View>
          ) : (
            <View style={styles.typical}>
              <AppText variant="heading">{`No typical ${destination?.city} trip yet`}</AppText>
              <AppText color="muted">ITER shows what a trip usually costs once at least three travellers have shared theirs. Be one of the first.</AppText>
            </View>
          )}
        </Reveal>

        {stats ? (
          <Reveal index={1} style={styles.numbers}>
            <Card style={styles.number}>
              <AppText variant="title">{String(stats.tripCount)}</AppText>
              <AppText variant="label" color="muted">
                Trips shared
              </AppText>
            </Card>
            <Card style={styles.number}>
              <AppText variant="title">{String(stats.tipCount)}</AppText>
              <AppText variant="label" color="muted">
                Tips and questions
              </AppText>
            </Card>
          </Reveal>
        ) : null}

        <View style={styles.feedHeader}>
          <AppText variant="heading">From travellers</AppText>
          <ChoiceChips
            label="Order"
            value={order}
            onChange={setOrder}
            choices={[
              { value: 'latest', label: 'Latest' },
              { value: 'top', label: 'Top' },
            ]}
          />
        </View>

        {posts.length === 0 ? (
          <Card style={styles.card}>
            <AppText variant="heading">{`Nothing about ${destination?.city} yet`}</AppText>
            <AppText color="muted">Share your trip or a tip and you will be the first.</AppText>
            <Button label="Share something" icon={PlusIcon} onPress={() => router.push({ pathname: '/community/share', params: { destinationId } })} />
          </Card>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}

        {blocked.length > 0 ? (
          <Card style={styles.card}>
            <AppText variant="bodyStrong">{`You have blocked ${blocked.length} ${blocked.length === 1 ? 'person' : 'people'}`}</AppText>
            {blocked.map((user) => (
              <View key={user.id} style={styles.blockedRow}>
                <Avatar id={user.id} name={user.displayName} size={32} />
                <AppText style={styles.flex}>{user.displayName}</AppText>
                <Button label="Unblock" variant="quiet" onPress={() => unblock(user.id)} />
              </View>
            ))}
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: TAB_BAR_CLEARANCE, maxWidth: MAX_APP_WIDTH, width: '100%', alignSelf: 'center' },
  hero: { height: HERO_HEIGHT, paddingHorizontal: spacing.lg + 4, gap: spacing.md, overflow: 'hidden' },
  onPhoto: { textShadowColor: 'rgba(5,59,80,0.55)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  // Without this the row stretches to fill the photo's height.
  pickerScroll: { flexGrow: 0 },
  picker: { gap: spacing.sm, paddingRight: spacing.lg, alignItems: 'center' },
  pickerChip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    justifyContent: 'center',
    backgroundColor: colors.photoChip,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pickerChipOn: { backgroundColor: colors.white, borderColor: colors.white },
  heroTitle: { marginTop: 'auto', paddingBottom: spacing.xxxl + spacing.lg, gap: spacing.xs },
  place: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sheet: {
    marginTop: -spacing.xxxl,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg + 4,
    gap: spacing.xl,
    borderTopLeftRadius: radius.card + 8,
    borderTopRightRadius: radius.card + 8,
    backgroundColor: colors.surface,
  },
  fab: {
    position: 'absolute',
    top: -30,
    right: spacing.xl,
    zIndex: 2,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    ...shadow,
  },
  typical: { gap: spacing.md },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  numbers: { flexDirection: 'row', gap: spacing.md },
  number: { flex: 1, gap: spacing.xxs },
  feedHeader: { gap: spacing.md },
  card: { gap: spacing.md },
  blockedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
