import { StyleSheet } from 'react-native';

import { AppText, type TextColor } from '@/components/ui/AppText';
import type { Icon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'accent' | 'quiet';

const variants: Record<ButtonVariant, { background: string; text: TextColor; icon: string }> = {
  primary: { background: colors.navy, text: 'inverse', icon: colors.white },
  // Navy on green: white text on the accent fails contrast.
  accent: { background: colors.accent, text: 'primary', icon: colors.navy },
  quiet: { background: colors.surfaceSunken, text: 'primary', icon: colors.navy },
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: Icon;
  disabled?: boolean;
  /** Read by screen readers when the visible label alone is not clear enough. */
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'primary', icon: IconGlyph, disabled, accessibilityLabel }: ButtonProps) {
  const { background, text, icon } = variants[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      role="button"
      aria-label={accessibilityLabel ?? label}
      aria-disabled={disabled}
      style={[styles.button, { backgroundColor: background }]}>
      {IconGlyph ? <IconGlyph size={20} color={icon} weight="bold" /> : null}
      <AppText variant="label" color={text} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET + spacing.sm,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
