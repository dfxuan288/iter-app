import type { CurrencyCode } from '@/domain/money';

/**
 * Places a trip can be planned for (brief §3). Choosing one sets the trip's local currency.
 *
 * Photos are from Unsplash under the free Unsplash Licence (https://unsplash.com/license):
 * free for commercial use, no attribution required. `creditUrl` records where each came from.
 * They load from Unsplash's servers for now; before the demo they should be copied into the app
 * so it does not depend on Unsplash. A destination without a photo shows the ocean gradient.
 */
export interface Destination {
  id: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  photoUrl?: string;
  /** Describes the picture for screen readers. */
  photoAlt?: string;
  creditUrl?: string;
}

const unsplash = (photoId: string) => `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=72`;

export const destinations: Destination[] = [
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    currency: 'JPY',
    photoUrl: unsplash('photo-1503899036084-c55cdd92da26'),
    photoAlt: 'A Shinjuku street in Tokyo lit by neon signs',
    creditUrl: 'https://unsplash.com/photos/shinjuku-street-with-neon-signs-4HG5hlhmZg8',
  },
  {
    id: 'bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    currency: 'THB',
    photoUrl: unsplash('photo-1562602833-0f4ab2fc46e3'),
    photoAlt: 'Ornate stupas at Wat Pho in Bangkok',
    creditUrl: 'https://unsplash.com/photos/ornate-stupas-at-wat-pho-bangkok-qeibBI7w4fQ',
  },
  {
    id: 'seoul',
    city: 'Seoul',
    country: 'South Korea',
    currency: 'KRW',
    photoUrl: unsplash('photo-1570191913384-7b4ff11716e7'),
    photoAlt: 'Namsan Tower above the old stone city wall in Seoul',
    creditUrl: 'https://unsplash.com/photos/namsan-tower-above-stone-wall-seoul-ku9Ftte6Ymo',
  },
  {
    id: 'bali',
    city: 'Bali',
    country: 'Indonesia',
    currency: 'IDR',
    photoUrl: unsplash('photo-1537996194471-e657df975ab4'),
    photoAlt: 'A temple reflected in a lake in Bali',
    creditUrl: 'https://unsplash.com/photos/temple-reflecting-in-bali-lake-1kdIG_258bU',
  },
  {
    id: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    currency: 'SGD',
    photoUrl: unsplash('photo-1628221680019-f28a2716e727'),
    photoAlt: 'Marina Bay Sands in Singapore',
    creditUrl: 'https://unsplash.com/photos/marina-bay-sands-in-singapore-hGgM1F_Mq6g',
  },
  { id: 'ho-chi-minh', city: 'Ho Chi Minh City', country: 'Vietnam', currency: 'VND' },
  { id: 'new-york', city: 'New York', country: 'United States', currency: 'USD' },
  { id: 'paris', city: 'Paris', country: 'France', currency: 'EUR' },
];

export function findDestination(id: string): Destination | undefined {
  return destinations.find((destination) => destination.id === id);
}

/** Destinations that have a photo, for photo-led layouts. */
export const photoDestinations = destinations.filter((destination) => destination.photoUrl !== undefined);
