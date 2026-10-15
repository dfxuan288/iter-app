import { useId } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string;
  /** Asks the user to double-check this field (e.g. something the AI found hard to read). */
  highlight?: string;
  maxLength?: number;
  /** Several lines, for longer text such as a post. */
  multiline?: boolean;
  /** Called when the user presses Enter / Done on the keyboard. */
  onSubmit?: () => void;
}

/** A labelled text input: label above, the field, then helper or error text below. */
export function TextField({ label, value, onChangeText, placeholder, helper, error, highlight, maxLength, multiline = false, onSubmit }: TextFieldProps) {
  const id = useId();
  return (
    <View style={styles.field}>
      <AppText variant="label" nativeID={`${id}-label`}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        maxLength={maxLength}
        multiline={multiline}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? 'done' : undefined}
        aria-labelledby={`${id}-label`}
        aria-invalid={Boolean(error)}
        style={[styles.input, multiline ? styles.multiline : null, highlight ? styles.inputHighlight : null, error ? styles.inputError : null]}
      />
      {error ? (
        <AppText variant="caption" color="danger" role="alert">
          {error}
        </AppText>
      ) : highlight ? (
        <AppText variant="caption" color="warning">
          {highlight}
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
  input: {
    minHeight: MIN_TOUCH_TARGET + spacing.md,
    borderRadius: radius.tile,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.navy,
    // Removes the browser's own focus ring; the border is the visible focus state.
    outlineWidth: 0,
  },
  inputError: { borderColor: colors.danger },
  multiline: { minHeight: 120, paddingVertical: spacing.md, textAlignVertical: 'top' },
  inputHighlight: { borderColor: colors.warning, backgroundColor: colors.warningSurface },
});
