import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, shadow, spacing } from '@/theme/tokens';

export interface PhotoCardProps {
  /** Leave out to show the ocean gradient alone. */
  photo?: number;
  photoAlt?: string;
  children: ReactNode;
  /**
   * `full` darkens the whole photo, for cards with a lot of text on top.
   * `bottom` darkens only the lower part, for a caption under a mostly clear photo.
   */
  scrim?: 'full' | 'bottom';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** An id other code can find the card by (the launch animation lands on Home's card). */
  nativeID?: string;
}

const scrims = {
  full: ['rgba(5,59,80,0)', 'rgba(5,59,80,0.42)', 'rgba(5,59,80,0.9)'] as const,
  bottom: ['rgba(5,59,80,0)', 'rgba(5,59,80,0.30)', 'rgba(5,59,80,0.92)'] as const,
};

/**
 * A rounded card with a destination photo behind its content. The ocean gradient sits under the
 * photo, so the card still looks right while the photo loads or if it cannot be fetched (offline).
 * A navy scrim over the photo keeps white text readable whatever the picture is.
 */
export function PhotoCard({ photo, photoAlt, children, scrim = 'full', style, contentStyle, nativeID }: PhotoCardProps) {
  return (
    <View style={[styles.shadow, style]} nativeID={nativeID}>
      <View style={styles.clip}>
        <LinearGradient colors={gradients.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {photo !== undefined ? (
          <Image
            source={photo}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
            accessibilityLabel={photoAlt}
          />
        ) : null}
        <LinearGradient colors={scrims[scrim]} locations={scrim === 'full' ? [0.12, 0.52, 1] : [0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radius.card, backgroundColor: colors.navy, ...shadow.raised },
  clip: { flex: 1, borderRadius: radius.card, overflow: 'hidden' },
  content: { flex: 1, padding: spacing.xl - 4, gap: spacing.lg },
});
