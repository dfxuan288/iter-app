import { COUNTRIES } from '@/data/countries';
import type { CurrencyCode } from '@/domain/money';

/**
 * Places a trip can be planned for (brief §3). Choosing one sets the trip's local currency.
 *
 * Photos are stored in assets/images/destinations, so the app does not depend on any photo site.
 * Bangkok and Singapore are from Unsplash under the free Unsplash Licence
 * (https://unsplash.com/license); `creditUrl` records where each came from. The others were
 * supplied by the team: their source and licence should be noted here before any public launch.
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
    photoAlt: 'A busy Tokyo street at night, lined with neon signs',
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
    photoAlt: 'Visitors in hanbok beside a pavilion at Gyeongbokgung Palace in Seoul',
  },
  {
    id: 'bali',
    city: 'Bali',
    country: 'Indonesia',
    currency: 'IDR',
    photo: require('@/assets/images/destinations/bali.jpg'),
    photoAlt: 'Kelingking Beach from the clifftop, with turquoise sea below',
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
    photoAlt: 'Ho Chi Minh City Hall with the statue in front',
  },
  {
    id: 'new-york',
    city: 'New York',
    country: 'United States',
    currency: 'USD',
    photo: require('@/assets/images/destinations/new-york.jpg'),
    photoAlt: 'The Manhattan skyline at sunset, with the Empire State Building in the centre',
  },
  {
    id: 'paris',
    city: 'Paris',
    country: 'France',
    currency: 'EUR',
    photo: require('@/assets/images/destinations/paris.jpg'),
    photoAlt: 'The Eiffel Tower lit up at night',
  },
];

/** "Somewhere else?" destinations are whole countries, with ids like "country:GB". */
const COUNTRY_PREFIX = 'country:';
export const countryDestinationId = (countryCode: string) => `${COUNTRY_PREFIX}${countryCode}`;
export const isCountryDestination = (id: string) => id.startsWith(COUNTRY_PREFIX);

/**
 * A featured destination, or a country from the "Somewhere else?" list. A country has no photo (it
 * shows the ocean gradient); its "city" is the country's name unless the traveller typed a city.
 */
export function findDestination(id: string): Destination | undefined {
  const featured = destinations.find((destination) => destination.id === id);
  if (featured || !isCountryDestination(id)) return featured;
  const country = COUNTRIES.find((c) => c.code === id.slice(COUNTRY_PREFIX.length));
  return country ? { id, city: country.name, country: country.name, currency: country.currency } : undefined;
}

/** The featured destinations, with the trip's own country first when it is a "Somewhere else?" trip (for pickers). */
export function destinationsWith(tripDestinationId: string | undefined): Destination[] {
  const own = tripDestinationId && isCountryDestination(tripDestinationId) ? findDestination(tripDestinationId) : undefined;
  return own ? [own, ...destinations] : destinations;
}

/** Destinations that have a photo, for photo-led layouts. */
export const photoDestinations = destinations.filter((destination) => destination.photo !== undefined);
