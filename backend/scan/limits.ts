/**
 * Server-side scan limits that protect the Anthropic bill. They are separate from the plan limits
 * the app shows (Free: 5 receipts and 3 menus per trip, in mobile/src/config/plans.ts): these
 * only stop one phone, or everyone together, from running up a large bill in a day.
 * Days are counted in UTC. Scans answered from the cache or the demo samples are free and not counted.
 */
export const scanLimits = {
  perDevicePerDay: { receipt: 30, menu: 15 },
  /** Across every device. At roughly US$0.001 per scan this caps a bad day at about US$1 to US$2. */
  allDevicesPerDay: 1000,
} as const;
