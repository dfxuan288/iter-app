import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger';

const tones: Record<ChipTone, { background: string; text: string }> = {
  neutral: { background: colors.chip, text: colors.chipText },
  success: { background: colors.chip, text: colors.success },
  warning: { background: colors.warningSurface, text: colors.warning },
  danger: { background: colors.dangerSurface, text: colors.danger },
};

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const { background, text } = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <AppText variant="label" style={{ color: text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
