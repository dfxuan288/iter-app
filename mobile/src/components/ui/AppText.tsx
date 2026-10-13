import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme/tokens';

export type TextColor = 'primary' | 'muted' | 'inverse' | 'inverseMuted' | 'link' | 'chip' | 'danger';

const textColors: Record<TextColor, string> = {
  primary: colors.navy,
  muted: colors.textMuted,
  inverse: colors.white,
  inverseMuted: 'rgba(255,255,255,0.85)',
  link: colors.teal,
  chip: colors.chipText,
  danger: colors.danger,
};

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

/** The one text component used across the app, so type sizes and colours stay consistent. */
export function AppText({ variant = 'body', color = 'primary', align, style, ...rest }: AppTextProps) {
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      // Respect the user's text-size setting, but stop very large sizes breaking layouts.
      maxFontSizeMultiplier={isHeading ? 1.4 : 1.8}
      {...rest}
      style={[typography[variant], { color: textColors[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
