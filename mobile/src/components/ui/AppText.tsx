import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme/tokens';

export type TextColor = 'primary' | 'muted' | 'inverse' | 'inverseMuted' | 'link' | 'accent' | 'danger';

const textColors: Record<TextColor, string> = {
  primary: colors.navy,
  muted: colors.textMuted,
  inverse: colors.white,
  inverseMuted: colors.glassText,
  link: colors.teal,
  accent: colors.accentText,
  danger: colors.danger,
};

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

/** The one text component used across the app, so type sizes and colours stay consistent. */
export function AppText({ variant = 'body', color = 'primary', align, style, ...rest }: AppTextProps) {
  const isHeading = variant === 'title' || variant === 'heading';
  const isLarge = isHeading || variant === 'display' || variant === 'number';
  return (
    <Text
      role={isHeading ? 'heading' : undefined}
      // Respect the user's text-size setting, but stop very large sizes breaking layouts.
      maxFontSizeMultiplier={isLarge ? 1.4 : 1.8}
      {...rest}
      style={[typography[variant], { color: textColors[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
