import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, gradients, radius, spacing } from '@/theme/tokens';

export interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Extra content shown inside the gradient header, under the title. */
  header?: ReactNode;
  children: ReactNode;
}

/** Standard page layout: ocean-gradient header, then scrolling content on the grey surface. */
export function Screen({ title, subtitle, header, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={gradients.ocean}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <AppText variant="title" color="inverse">
          {title}
        </AppText>
        {subtitle ? <AppText color="inverseMuted">{subtitle}</AppText> : null}
        {header}
      </LinearGradient>
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  body: { padding: spacing.lg, gap: spacing.lg },
});
