import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { StoredImage } from '@/components/ui/StoredImage';
import { colors, radius } from '@/theme/tokens';

const BAND = 120;

/**
 * The receipt photo, with a soft band of light sweeping down it while the AI reads (brief §10:
 * "a scanning shimmer over the receipt"). With reduced motion on, the photo is simply dimmed.
 */
export function ScanningPhoto({ imageId, scanning, height = 320 }: { imageId: string | null; scanning: boolean; height?: number }) {
  const reduceMotion = useReducedMotion();
  const [boxHeight, setBoxHeight] = useState(height);
  const offset = useSharedValue(-BAND);

  useEffect(() => {
    if (!scanning || reduceMotion) {
      cancelAnimation(offset);
      return;
    }
    offset.set(-BAND);
    offset.set(withRepeat(withTiming(boxHeight, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(offset);
  }, [scanning, reduceMotion, boxHeight, offset]);

  const band = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return (
    <View style={[styles.box, { height }]} onLayout={(event: LayoutChangeEvent) => setBoxHeight(event.nativeEvent.layout.height)}>
      <StoredImage id={imageId} alt="Your receipt photo" style={StyleSheet.absoluteFill} contentFit="contain" />
      {scanning ? (
        <View style={[StyleSheet.absoluteFill, styles.dim]} pointerEvents="none">
          {reduceMotion ? null : (
            <Animated.View style={[styles.band, band]}>
              <LinearGradient colors={['rgba(0,184,148,0)', 'rgba(0,184,148,0.45)', 'rgba(0,184,148,0)']} style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.tile, overflow: 'hidden', backgroundColor: colors.surfaceSunken },
  dim: { backgroundColor: 'rgba(5,59,80,0.18)' },
  band: { position: 'absolute', left: 0, right: 0, height: BAND },
});
