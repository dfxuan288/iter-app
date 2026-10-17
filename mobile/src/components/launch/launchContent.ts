import { Asset } from 'expo-asset';

import { findDestination } from '@/data/destinations';
import { useAppData } from '@/state/AppDataProvider';

/** Home's safe-to-spend card carries this id; the launch animation's photo lands on it. */
export const LAUNCH_CARD_ID = 'iter-home-photo-card';

export interface LaunchContent {
  /** The trip's destination photo, shown inside the ITER mark. `null`: the ocean colours instead. */
  photoUri: string | null;
  /** What a screen reader hears, once. */
  label: string;
}

export const symbolUri = (): string => Asset.fromModule(require('@/assets/images/iter-symbol.png')).uri;

/** What the launch animation shows: the traveller's own city. */
export function useLaunchContent(): LaunchContent {
  const { trip } = useAppData();
  const photo = trip ? findDestination(trip.destinationId)?.photo : undefined;
  return {
    photoUri: photo ? Asset.fromModule(photo).uri : null,
    label: trip ? `ITER, opening your ${trip.city} trip.` : 'ITER. Smarter journeys. Safer spends.',
  };
}
