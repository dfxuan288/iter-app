import { useId } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { currencies, type CurrencyCode } from '@/domain/money';
import { colors, fonts, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

export interface MoneyFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  currency?: CurrencyCode;
  helper?: string;
  /** Shown under the field in place of the helper when the value is not acceptable. */
  error?: string;
  placeholder?: string;
}

/** A labelled amount input: label above, the field, then helper or error text below. */
export function MoneyField({ label, value, onChangeText, currency = 'MYR', helper, error, placeholder = '0' }: MoneyFieldProps) {
  const id = useId();
  const { symbol, minorDigits } = currencies[currency];
  return (
    <View style={styles.field}>
      <AppText variant="label" nativeID={`${id}-label`}>
        {label}
      </AppText>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <AppText variant="number" color="muted">
          {symbol}
        </AppText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          inputMode={minorDigits > 0 ? 'decimal' : 'numeric'}
          aria-labelledby={`${id}-label`}
          aria-invalid={Boolean(error)}
          style={styles.input}
        />
      </View>
      {error ? (
        <AppText variant="caption" color="danger" role="alert">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" color="muted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET + spacing.md,
    borderRadius: radius.tile,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  inputRowError: { borderColor: colors.danger },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displaySemiBold,
    fontSize: 22,
    color: colors.navy,
    paddingVertical: spacing.sm,
    // Removes the browser's own focus ring; the row border is the visible focus state.
    outlineWidth: 0,
  },
});
