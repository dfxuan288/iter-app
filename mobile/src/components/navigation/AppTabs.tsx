import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors, MIN_TOUCH_TARGET, shadow, spacing } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  icon: IconName;
  activeIcon: IconName;
}

function TabButton({ label, icon, activeIcon, isFocused, style: _style, ...props }: TabButtonProps) {
  const tint = isFocused ? colors.navy : colors.textMuted;
  return (
    <Pressable
      {...props}
      role="tab"
      aria-label={label}
      aria-selected={Boolean(isFocused)}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Ionicons name={isFocused ? activeIcon : icon} size={24} color={tint} />
      <AppText variant="caption" style={[styles.tabLabel, { color: tint }, isFocused && styles.tabLabelActive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** The Scan tab is a large raised centre button (brief §7). */
function ScanButton({ isFocused, style: _style, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      role="tab"
      aria-label="Scan a receipt or menu"
      aria-selected={Boolean(isFocused)}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={[styles.scanCircle, isFocused && styles.scanCircleActive]}>
        <Ionicons name="scan" size={28} color={colors.white} />
      </View>
    </Pressable>
  );
}

export function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        <TabTrigger name="home" href="/" asChild>
          <TabButton label="Home" icon="home-outline" activeIcon="home" />
        </TabTrigger>
        <TabTrigger name="currency" href="/currency" asChild>
          <TabButton label="Currency" icon="swap-horizontal-outline" activeIcon="swap-horizontal" />
        </TabTrigger>
        <TabTrigger name="scan" href="/scan" asChild>
          <ScanButton />
        </TabTrigger>
        <TabTrigger name="community" href="/community" asChild>
          <TabButton label="Community" icon="people-outline" activeIcon="people" />
        </TabTrigger>
        <TabTrigger name="me" href="/me" asChild>
          <TabButton label="Me" icon="person-outline" activeIcon="person" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const SCAN_SIZE = 60;

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  tabLabel: { fontSize: 12, lineHeight: 16 },
  tabLabelActive: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
  scanCircle: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: SCAN_SIZE / 2,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    // Lifts the button above the bar.
    marginTop: -spacing.xl,
    borderWidth: 4,
    borderColor: colors.card,
    ...shadow.raised,
  },
  scanCircleActive: { backgroundColor: colors.navy },
});
