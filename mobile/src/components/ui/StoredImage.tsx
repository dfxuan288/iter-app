import { Image, type ImageStyle } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { ReceiptIcon } from '@/components/ui/icons';
import { imageStore } from '@/services/imageStore';
import { colors } from '@/theme/tokens';

/** Loads a photo kept on the phone. `undefined` while loading, `null` when it is not there. */
export function useStoredImage(id: string | null | undefined): string | null | undefined {
  const [loaded, setLoaded] = useState<{ id: string; uri: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void imageStore.load(id).then((uri) => {
      if (active) setLoaded({ id, uri });
    });
    return () => {
      active = false;
    };
  }, [id]);
  if (!id) return null;
  return loaded?.id === id ? loaded.uri : undefined;
}

export interface StoredImageProps {
  id: string | null | undefined;
  /** Describes the photo for screen readers. */
  alt: string;
  style: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}

/** A grey tile that gently breathes while something loads, so the screen does not look stuck. Still when motion is reduced. */
export function LoadingTile({ style, alt }: { style: StyleProp<ViewStyle>; alt: string }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.55, { duration: 700 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.placeholder, style, animatedStyle]} aria-label={`${alt} (loading)`} role="img" />;
}

/** A receipt photo kept on the phone, with a placeholder while it loads or if it is missing. */
export function StoredImage({ id, alt, style, contentFit = 'cover' }: StoredImageProps) {
  const uri = useStoredImage(id);
  if (uri === undefined) return <LoadingTile style={style} alt={alt} />;
  if (uri === null) {
    return (
      <View style={[styles.placeholder, style]} aria-label={`${alt} (photo not available)`} role="img">
        <ReceiptIcon size={20} color={colors.textMuted} />
      </View>
    );
  }
  return <Image source={{ uri }} style={style as StyleProp<ImageStyle>} contentFit={contentFit} accessibilityLabel={alt} transition={150} />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
});
