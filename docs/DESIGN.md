# ITER design direction

Agreed with the founding team on 13 Oct 2026. It replaces the look described in brief §10 where
the two differ. All values live in `mobile/src/theme/tokens.ts`.

**In one line:** a soft, rounded, friendly travel-money app: light and calm, with one deep-ocean
moment for the number that matters.

Inspired by two reference designs the team supplied (an olive/lime travel booking concept and a
lavender/mint transport concept). ITER borrows their shapes and rhythm, not their colours or assets.

## Rules

| Area | Rule |
|---|---|
| Background | Soft aqua tint (`surface`), never plain grey or white |
| Space | Generous: 24 between sections and inside cards. When in doubt, add space rather than content |
| Shape | Anything you tap is a pill. Containers use the `card` radius. Blocks inside a container use `tile` |
| Colour | Navy for text and the main button. **One** bright accent: the logo's green, used as a fill with navy text on it |
| Photos | Destination photos carry the travel feeling: behind the safe-to-spend card on Home and on destination cards. A navy scrim keeps text readable, and the ocean gradient shows if a photo cannot load |
| Gradient | The ocean gradient is the fallback behind photos and the background of the Scan screen |
| Glass | Frosted panels and chips sit only on a photo or the ocean gradient, where there is something behind them to blur |
| Type | Outfit for headings and numbers; the phone's own font for reading text |
| Receipts | Shown as ticket cards: body, perforated tear line, and a stub for the tax refund result |
| Icons | Phosphor only, imported through `mobile/src/components/ui/icons.ts` |
| Shadows | Soft and navy-tinted, never black |
| Copy | Plain words. No long dashes |

## Motion

Built with Reanimated so it works in the browser and in future native apps. Every animation has a job:

- **Press feedback:** buttons shrink slightly under the finger, so a tap feels acknowledged.
- **Arrival:** sections rise in one after another, top to bottom, leading the eye from the main number down.
- **Numbers (Phase 1 onwards):** totals count to their new value after an expense is confirmed, so the user sees what changed.

All motion switches off when the phone is set to reduce motion.

## Accessibility

- Text contrast is tested automatically (`mobile/src/theme/__tests__/contrast.test.ts`), at WCAG AA.
- The accent green fails as text and with white text on it; the tests enforce both.
- Touch targets are at least 44 points. Icon-only buttons must have a screen-reader label.

## Photos

Listed in `mobile/src/data/destinations.ts`, each with its source link. All are from Unsplash under the
free Unsplash Licence. The image files are stored in `mobile/assets/images/destinations`, so the app does not depend on Unsplash.
