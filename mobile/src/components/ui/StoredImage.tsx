import { Image, type ImageStyle } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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

/** A receipt photo kept on the phone, with a plain placeholder while it loads or if it is missing. */
export function StoredImage({ id, alt, style, contentFit = 'cover' }: StoredImageProps) {
  const uri = useStoredImage(id);
  if (!uri) {
    return (
      <View style={[styles.placeholder, style]} aria-label={uri === null ? `${alt} (photo not available)` : alt} role="img">
        <ReceiptIcon size={20} color={colors.textMuted} />
      </View>
    );
  }
  return <Image source={{ uri }} style={style as StyleProp<ImageStyle>} contentFit={contentFit} accessibilityLabel={alt} />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
});
