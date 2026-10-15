import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius } from '@/theme/tokens';

/** Initials in a circle. Posts show names only, never photos of people (brief §7.9 safety). */
const tones = [
  { background: colors.accentSoft, text: 'accent' },
  { background: colors.surfaceSunken, text: 'primary' },
  { background: colors.navy, text: 'inverse' },
] as const;

export function Avatar({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tone = tones[hash % tones.length] ?? tones[0];
  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: tone.background }]} aria-hidden>
      <AppText variant="label" color={tone.text}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
