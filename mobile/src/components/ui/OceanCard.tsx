import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, shadow, spacing } from '@/theme/tokens';

/**
 * The deep-ocean gradient surface, with soft aqua light behind it for the glass panels to blur.
 * Reserved for the safe-to-spend card and the Scan screen, so it stays special.
 */
export function OceanCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.shadow, style]}>
      <LinearGradient colors={gradients.ocean} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <View style={[styles.glow, styles.glowTop]} />
        <View style={[styles.glow, styles.glowBottom]} />
        {children}
      </LinearGradient>
    </View>
  );
}

/**
 * Frosted-glass panel. This is a blur-based approximation of glass, and must only be placed
 * on an OceanCard: on a plain background there is nothing behind it to blur.
 */
export function GlassPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <BlurView intensity={28} tint="light" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: radius.card, ...shadow.raised },
  gradient: { borderRadius: radius.card, padding: spacing.xl - 4, gap: spacing.md, overflow: 'hidden' },
  // Blurred so the light reads as a soft glow, not a hard circle.
  glow: { position: 'absolute', borderRadius: radius.pill, backgroundColor: colors.aqua, filter: 'blur(44px)' },
  glowTop: { width: 220, height: 220, top: -90, right: -70, opacity: 0.5 },
  glowBottom: { width: 180, height: 180, bottom: -80, left: -50, opacity: 0.32 },
  glass: {
    borderRadius: radius.tile,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
  },
});
