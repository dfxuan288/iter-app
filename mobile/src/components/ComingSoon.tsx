import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { spacing } from '@/theme/tokens';

export interface ComingSoonProps {
  /** Build phase that delivers this screen, e.g. "Phase 2". */
  phase: string;
  features: string[];
}

/** Placeholder card shown on screens whose features arrive in a later build phase. */
export function ComingSoon({ phase, features }: ComingSoonProps) {
  return (
    <Card>
      <Chip label={`Coming in ${phase}`} />
      <AppText variant="heading">What will be here</AppText>
      <View style={{ gap: spacing.xs }}>
        {features.map((feature) => (
          <AppText key={feature} color="muted">
            {`•  ${feature}`}
          </AppText>
        ))}
      </View>
    </Card>
  );
}
