import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme/tokens';

const NOTCH = 20;

export interface TicketCardProps {
  children: ReactNode;
  /** Shown under the tear line, e.g. the tax refund result. */
  stub: ReactNode;
  /** Background of the stub. */
  stubColor?: string;
}

/** A card shaped like a paper receipt: a body, a perforated tear line with notches, and a stub. */
export function TicketCard({ children, stub, stubColor = colors.accentSoft }: TicketCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.body}>{children}</View>
      <View style={[styles.tear, { backgroundColor: stubColor }]}>
        <View style={styles.bodyCap} />
        <View style={styles.perforation} />
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>
      <View style={[styles.stub, { backgroundColor: stubColor }]}>{stub}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, backgroundColor: colors.card, ...shadow.card },
  body: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  tear: { height: NOTCH, justifyContent: 'center' },
  // White upper half of the tear row, so the colour change happens exactly on the dashed line.
  bodyCap: { position: 'absolute', top: 0, left: 0, right: 0, height: NOTCH / 2, backgroundColor: colors.card },
  perforation: {
    marginHorizontal: NOTCH,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  // Half-circles in the page colour, so the card looks punched at both edges.
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.surface,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  stub: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl - 4,
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
});
