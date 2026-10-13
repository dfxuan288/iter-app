import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { Icon } from '@/components/ui/icons';
import { colors, radius, spacing } from '@/theme/tokens';

export type ChipTone = 'neutral' | 'plain' | 'success' | 'warning' | 'danger' | 'glass' | 'photo';

const tones: Record<ChipTone, { background: string; text: string; border?: string }> = {
  /** On a white card. */
  neutral: { background: colors.surfaceSunken, text: colors.navy },
  /** On the page background. */
  plain: { background: colors.card, text: colors.navy },
  success: { background: colors.accentSoft, text: colors.accentText },
  warning: { background: colors.warningSurface, text: colors.warning },
  danger: { background: colors.dangerSurface, text: colors.danger },
  /** On the ocean gradient only. */
  glass: { background: colors.glass, text: colors.white, border: colors.glassBorder },
  /** On a photo: darker than glass, so white text stays readable over bright pictures. */
  photo: { background: colors.photoChip, text: colors.white, border: colors.glassBorder },
};

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  icon?: Icon;
}

export function Chip({ label, tone = 'neutral', icon: IconGlyph }: ChipProps) {
  const { background, text, border } = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: background }, border ? { borderWidth: 1, borderColor: border } : null]}>
      {IconGlyph ? <IconGlyph size={16} color={text} weight="bold" /> : null}
      <AppText variant="label" style={{ color: text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
});
