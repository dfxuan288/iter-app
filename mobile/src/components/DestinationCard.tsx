import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PhotoCard } from '@/components/ui/PhotoCard';
import type { Destination } from '@/data/destinations';

export interface DestinationCardProps {
  destination: Destination;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** A destination shown as a photo with the city and country along the bottom. */
export function DestinationCard({ destination, height = 190, style }: DestinationCardProps) {
  return (
    <PhotoCard
      photoUrl={destination.photoUrl}
      photoAlt={destination.photoAlt}
      scrim="bottom"
      style={[{ height }, style]}
      contentStyle={styles.content}>
      <View>
        <AppText variant="heading" color="inverse">
          {destination.city}
        </AppText>
        <AppText variant="caption" color="inverseMuted">
          {destination.country}
        </AppText>
      </View>
    </PhotoCard>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'flex-end' },
});
