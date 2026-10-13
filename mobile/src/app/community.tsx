import { StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/ComingSoon';
import { DestinationCard } from '@/components/DestinationCard';
import { AppText } from '@/components/ui/AppText';
import { Reveal } from '@/components/ui/Reveal';
import { Screen } from '@/components/ui/Screen';
import { destinations } from '@/data/destinations';
import { spacing } from '@/theme/tokens';

export default function CommunityScreen() {
  // One wide card, then the rest two to a row.
  const [featured, ...rest] = destinations;
  const rows: (typeof rest)[] = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));

  return (
    <Screen title="Community" subtitle="What trips really cost.">
      <View style={styles.section}>
        <AppText variant="heading">Where are you going?</AppText>
        {featured ? (
          <Reveal index={0}>
            <DestinationCard destination={featured} height={210} />
          </Reveal>
        ) : null}
        {rows.map((row, rowIndex) => (
          <Reveal key={row.map((d) => d.id).join('-')} index={rowIndex + 1} style={styles.row}>
            {row.map((destination) => (
              <DestinationCard key={destination.id} destination={destination} style={styles.cell} />
            ))}
          </Reveal>
        ))}
      </View>
      <ComingSoon
        phase="Phase 7"
        features={[
          'Typical trip cost and category split for each destination',
          'Trip summaries, tips, comments and likes',
          'Share your own trip in one tap',
          'Report a post or block a user',
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.lg },
  cell: { flex: 1 },
});
