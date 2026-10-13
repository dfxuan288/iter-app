import { StyleSheet } from 'react-native';

import type { Icon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, MIN_TOUCH_TARGET, radius, shadow } from '@/theme/tokens';

export interface IconButtonProps {
  icon: Icon;
  /** Required: an icon-only button has no visible text for screen readers to read. */
  accessibilityLabel: string;
  onPress: () => void;
}

/** Round white button holding a single icon. */
export function IconButton({ icon: IconGlyph, accessibilityLabel, onPress }: IconButtonProps) {
  return (
    <PressableScale onPress={onPress} role="button" aria-label={accessibilityLabel} style={styles.button}>
      <IconGlyph size={22} color={colors.navy} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MIN_TOUCH_TARGET + 4,
    height: MIN_TOUCH_TARGET + 4,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
