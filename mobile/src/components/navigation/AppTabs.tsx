import { TabList, Tabs, TabSlot, TabTrigger, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ArrowsLeftRightIcon, HouseIcon, ScanIcon, UserIcon, UsersThreeIcon, type Icon } from '@/components/ui/icons';
import { colors, MIN_TOUCH_TARGET, radius, shadow, spacing } from '@/theme/tokens';

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  icon: Icon;
}

function TabButton({ label, icon: IconGlyph, isFocused, style: _style, ...props }: TabButtonProps) {
  const tint = isFocused ? colors.navy : colors.textMuted;
  return (
    <Pressable
      {...props}
      role="tab"
      aria-label={label}
      aria-selected={Boolean(isFocused)}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <IconGlyph size={24} color={tint} weight={isFocused ? 'fill' : 'regular'} />
      <AppText variant="caption" style={[styles.tabLabel, { color: tint }, isFocused && styles.tabLabelActive]}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** The Scan tab is the large accent button in the centre of the bar. */
function ScanButton({ isFocused, style: _style, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      role="tab"
      aria-label="Scan a receipt or menu"
      aria-selected={Boolean(isFocused)}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View style={[styles.scanCircle, isFocused && styles.scanCircleActive]}>
        <ScanIcon size={28} color={isFocused ? colors.white : colors.navy} weight="bold" />
      </View>
    </Pressable>
  );
}

/** The bar floats over the page as a white pill. TabList must stay a direct child of Tabs, so the positioning lives here. */
function Dock({ children, style: _style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  return (
    <View {...props} style={[styles.dock, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.bar}>{children}</View>
    </View>
  );
}

export function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <Dock>
          <TabTrigger name="home" href="/" asChild>
            <TabButton label="Home" icon={HouseIcon} />
          </TabTrigger>
          <TabTrigger name="currency" href="/currency" asChild>
            <TabButton label="Currency" icon={ArrowsLeftRightIcon} />
          </TabTrigger>
          <TabTrigger name="scan" href="/scan" asChild>
            <ScanButton />
          </TabTrigger>
          <TabTrigger name="community" href="/community" asChild>
            <TabButton label="Community" icon={UsersThreeIcon} />
          </TabTrigger>
          <TabTrigger name="me" href="/me" asChild>
            <TabButton label="Me" icon={UserIcon} />
          </TabTrigger>
        </Dock>
      </TabList>
    </Tabs>
  );
}

const SCAN_SIZE = 58;

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
  dock: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    ...shadow.raised,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  tabLabel: { fontSize: 12, lineHeight: 16 },
  tabLabelActive: { fontWeight: '700' },
  pressed: { opacity: 0.6 },
  scanCircle: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    borderRadius: SCAN_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Lets the button rise slightly out of the bar.
    marginVertical: -spacing.md,
    borderWidth: 4,
    borderColor: colors.card,
  },
  scanCircleActive: { backgroundColor: colors.navy },
});
