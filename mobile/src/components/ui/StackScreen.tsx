import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { colors, spacing } from '@/theme/tokens';

export interface StackScreenProps {
  title: string;
  children: ReactNode;
  /** Buttons shown at the right of the header. */
  actions?: ReactNode;
}

/** Layout for screens opened on top of the tabs: a back button, a title, then scrolling content. */
export function StackScreen({ title, children, actions }: StackScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <IconButton icon={ArrowLeftIcon} accessibilityLabel="Go back" onPress={goBack} />
        <AppText variant="heading" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        {actions}
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.md },
  title: { flex: 1 },
  content: { paddingHorizontal: spacing.lg + 4, paddingTop: spacing.md, gap: spacing.xl },
});
