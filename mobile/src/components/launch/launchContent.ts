import { Asset } from 'expo-asset';

import { findDestination } from '@/data/destinations';
import { formatMoney } from '@/domain/money';
import { useAppData } from '@/state/AppDataProvider';

export interface LaunchContent {
  /** The trip's destination photo, shown inside the ITER mark. `null`: the ocean colours instead. */
  photoUri: string | null;
  /** Today's safe-to-spend amount in sen, counted up at the end. `null` when there is none to show. */
  amountSen: number | null;
  /** Under the amount, or under the wordmark when there is no amount. */
  caption: string;
  /** What a screen reader hears, once. */
  label: string;
}

export const symbolUri = (): string => Asset.fromModule(require('@/assets/images/iter-symbol.png')).uri;

/** What the launch animation shows: the traveller's own city, and today's amount if their plan includes it. */
export function useLaunchContent(): LaunchContent {
  const { trip, summary, access } = useAppData();
  const photo = trip ? findDestination(trip.destinationId)?.photo : undefined;
  const photoUri = photo ? Asset.fromModule(photo).uri : null;
  const showAmount = trip !== undefined && summary !== undefined && access.level === 'full' && summary.phase !== 'ended';
  if (!showAmount) {
    return { photoUri, amountSen: null, caption: 'Smarter journeys. Safer spends.', label: 'ITER. Smarter journeys. Safer spends.' };
  }
  const caption = summary.phase === 'active' ? `safe to spend today in ${trip.city}` : `a day for your ${trip.city} trip`;
  return {
    photoUri,
    amountSen: summary.safePerDayMyr,
    caption,
    label: `ITER. ${formatMoney(summary.safePerDayMyr, 'MYR', { trimZeros: true })} ${caption}.`,
  };
}
