import type { PlanTier } from '@/domain/types';

/**
 * Plans, prices and limits (brief §9.9). EVERY NUMBER HERE IS A PLACEHOLDER agreed for the
 * prototype. This is the only file to edit when pricing changes; no screen hard-codes a price.
 * Prices are in sen. Purchases are simulated: no real money moves.
 */
export interface Plan {
  tier: PlanTier;
  name: string;
  priceSen: number;
  billing: 'free' | 'per_trip' | 'per_month';
  /** `null` means unlimited. */
  receiptScansPerTrip: number | null;
  menuScansPerTrip: number | null;
  safeToSpend: boolean;
  forecastAndWarnings: boolean;
  taxRefund: boolean;
  tripHistory: boolean;
}

export const plans: Record<PlanTier, Plan> = {
  free: {
    tier: 'free',
    name: 'Free',
    priceSen: 0,
    billing: 'free',
    receiptScansPerTrip: 5,
    menuScansPerTrip: 3,
    safeToSpend: false,
    forecastAndWarnings: false,
    taxRefund: false,
    tripHistory: false,
  },
  trip_pass: {
    tier: 'trip_pass',
    name: 'Trip Pass',
    priceSen: 990,
    billing: 'per_trip',
    receiptScansPerTrip: null,
    menuScansPerTrip: null,
    safeToSpend: true,
    forecastAndWarnings: true,
    taxRefund: true,
    tripHistory: false,
  },
  premium: {
    tier: 'premium',
    name: 'Premium',
    priceSen: 1290,
    billing: 'per_month',
    receiptScansPerTrip: null,
    menuScansPerTrip: null,
    safeToSpend: true,
    forecastAndWarnings: true,
    taxRefund: true,
    tripHistory: true,
  },
};

export function planFor(tier: PlanTier): Plan {
  return plans[tier];
}
