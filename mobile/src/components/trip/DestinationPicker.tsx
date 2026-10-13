import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CheckIcon } from '@/components/ui/icons';
import { PhotoCard } from '@/components/ui/PhotoCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { destinations, type Destination } from '@/data/destinations';
import { currencies } from '@/domain/money';
import { colors, radius, spacing } from '@/theme/tokens';

function Option({ destination, selected, onPress }: { destination: Destination; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      role="radio"
      aria-checked={selected}
      aria-label={`${destination.city}, ${destination.country}. Currency: ${currencies[destination.currency].name}`}
      style={[styles.option, selected && styles.optionSelected]}>
      <PhotoCard
        photoUrl={destination.photoUrl}
        photoAlt=""
        scrim="bottom"
        style={styles.photo}
        contentStyle={styles.photoContent}>
        {selected ? (
          <View style={styles.check}>
            <CheckIcon size={18} color={colors.navy} weight="bold" />
          </View>
        ) : (
          <View />
        )}
        <View>
          <AppText variant="bodyStrong" color="inverse" numberOfLines={1}>
            {destination.city}
          </AppText>
          <AppText variant="caption" color="inverseMuted" numberOfLines={1}>
            {`${destination.country}, ${destination.currency}`}
          </AppText>
        </View>
      </PhotoCard>
    </PressableScale>
  );
}

/** A two-column grid of places to choose from. Choosing one also sets the trip's currency. */
export function DestinationPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const rows: Destination[][] = [];
  for (let i = 0; i < destinations.length; i += 2) rows.push(destinations.slice(i, i + 2));
  return (
    <View role="radiogroup" aria-label="Destination" style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((d) => d.id).join('-')} style={styles.row}>
          {row.map((destination) => (
            <Option
              key={destination.id}
              destination={destination}
              selected={value === destination.id}
              onPress={() => onChange(destination.id)}
            />
          ))}
          {row.length === 1 ? <View style={styles.option} /> : null}
        </View>
      ))}
    </View>
  );
}

const RING = 3;

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  // The ring is always present but transparent, so selecting never shifts the layout.
  option: { flex: 1, borderRadius: radius.card + RING, borderWidth: RING, borderColor: 'transparent' },
  optionSelected: { borderColor: colors.accent },
  photo: { height: 132 },
  photoContent: { justifyContent: 'space-between', padding: spacing.md },
  check: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
