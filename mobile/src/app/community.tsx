import { ComingSoon } from '@/components/ComingSoon';
import { Screen } from '@/components/ui/Screen';

export default function CommunityScreen() {
  return (
    <Screen title="Community" subtitle="What trips really cost.">
      <ComingSoon
        phase="Phase 7"
        features={[
          'Browse by destination: Tokyo, Bangkok, Seoul, Bali, Singapore',
          'Typical trip cost and category split',
          'Trip summaries, tips, comments and likes',
          'Report a post or block a user',
        ]}
      />
    </Screen>
  );
}
