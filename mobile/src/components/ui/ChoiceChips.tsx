import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** Shown before the label, e.g. a category picture. */
  leading?: ReactNode;
  /** Read by screen readers in place of the label, when the label is an abbreviation. */
  accessibilityLabel?: string;
}

export interface ChoiceChipsProps<T extends string> {
  /** Names the group for screen readers. */
  label: string;
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** `wrap` flows onto more lines; `scroll` stays on one line and scrolls sideways. */
  layout?: 'wrap' | 'scroll';
}

/** A set of pill buttons where exactly one is selected. */
export function ChoiceChips<T extends string>({ label, choices, value, onChange, layout = 'wrap' }: ChoiceChipsProps<T>) {
  const chips = choices.map((choice) => {
    const selected = choice.value === value;
    return (
      <PressableScale
        key={choice.value}
        onPress={() => onChange(choice.value)}
        role="radio"
        aria-checked={selected}
        aria-label={choice.accessibilityLabel ?? choice.label}
        style={[styles.chip, selected && styles.chipSelected, choice.leading ? styles.chipWithLeading : null]}>
        {choice.leading}
        <AppText variant="label" color={selected ? 'inverse' : 'primary'}>
          {choice.label}
        </AppText>
      </PressableScale>
    );
  });

  if (layout === 'scroll') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} role="radiogroup" aria-label={label} contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return (
    <View role="radiogroup" aria-label={label} style={[styles.row, styles.wrap]}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexWrap: 'wrap' },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
  },
  chipWithLeading: { paddingLeft: spacing.xs + 2 },
  chipSelected: { backgroundColor: colors.navy },
});
