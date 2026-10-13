import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing, TAB_BAR_CLEARANCE } from '@/theme/tokens';

export interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Buttons shown to the right of the title. */
  actions?: ReactNode;
  /** Shown above the title, e.g. the logo row on Home. */
  top?: ReactNode;
  children: ReactNode;
}

/** Standard page layout: a large title on the tinted page background, then scrolling content. */
export function Screen({ title, subtitle, actions, top, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
      showsVerticalScrollIndicator={false}>
      {top}
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? <AppText color="muted">{subtitle}</AppText> : null}
        </View>
        {actions}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg + 4,
    paddingBottom: TAB_BAR_CLEARANCE,
    gap: spacing.xl,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleText: { flex: 1, gap: spacing.xxs },
});
