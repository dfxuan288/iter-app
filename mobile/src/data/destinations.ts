import type { CurrencyCode } from '@/domain/money';

/**
 * Places a trip can be planned for (brief §3). Choosing one sets the trip's local currency.
 *
 * Photos are from Unsplash under the free Unsplash Licence (https://unsplash.com/license):
 * free for commercial use, no attribution required. They are stored in assets/images/destinations,
 * so the app does not depend on Unsplash. `creditUrl` records where each came from.
 * A destination without a photo shows the ocean gradient.
 */
export interface Destination {
  id: string;
  city: string;
  country: string;
  currency: CurrencyCode;
  /** A bundled image, from require(). */
  photo?: number;
  /** Describes the picture for screen readers. */
  photoAlt?: string;
  creditUrl?: string;
}

export const destinations: Destination[] = [
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    currency: 'JPY',
    photo: require('@/assets/images/destinations/tokyo.jpg'),
    photoAlt: 'A Shinjuku street in Tokyo lit by neon signs',
    creditUrl: 'https://unsplash.com/photos/shinjuku-street-with-neon-signs-4HG5hlhmZg8',
  },
  {
    id: 'bangkok',
    city: 'Bangkok',
    country: 'Thailand',
    currency: 'THB',
    photo: require('@/assets/images/destinations/bangkok.jpg'),
    photoAlt: 'Ornate stupas at Wat Pho in Bangkok',
    creditUrl: 'https://unsplash.com/photos/ornate-stupas-at-wat-pho-bangkok-qeibBI7w4fQ',
  },
  {
    id: 'seoul',
    city: 'Seoul',
    country: 'South Korea',
    currency: 'KRW',
    photo: require('@/assets/images/destinations/seoul.jpg'),
    photoAlt: 'Namsan Tower above the old stone city wall in Seoul',
    creditUrl: 'https://unsplash.com/photos/namsan-tower-above-stone-wall-seoul-ku9Ftte6Ymo',
  },
  {
    id: 'bali',
    city: 'Bali',
    country: 'Indonesia',
    currency: 'IDR',
    photo: require('@/assets/images/destinations/bali.jpg'),
    photoAlt: 'A temple reflected in a lake in Bali',
    creditUrl: 'https://unsplash.com/photos/temple-reflecting-in-bali-lake-1kdIG_258bU',
  },
  {
    id: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    currency: 'SGD',
    photo: require('@/assets/images/destinations/singapore.jpg'),
    photoAlt: 'Marina Bay Sands in Singapore',
    creditUrl: 'https://unsplash.com/photos/marina-bay-sands-in-singapore-hGgM1F_Mq6g',
  },
  {
    id: 'ho-chi-minh',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    currency: 'VND',
    photo: require('@/assets/images/destinations/ho-chi-minh.jpg'),
    photoAlt: 'Ho Chi Minh City from above, with the Landmark 81 tower',
    creditUrl: 'https://unsplash.com/photos/aerial-view-of-city-buildings-during-daytime-6p2AkWAIC8E',
  },
  { id: 'new-york', city: 'New York', country: 'United States', currency: 'USD' },
  { id: 'paris', city: 'Paris', country: 'France', currency: 'EUR' },
];

export function findDestination(id: string): Destination | undefined {
  return destinations.find((destination) => destination.id === id);
}

/** Destinations that have a photo, for photo-led layouts. */
export const photoDestinations = destinations.filter((destination) => destination.photo !== undefined);
