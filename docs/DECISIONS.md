# ITER — decisions that change or clarify the brief

`PROJECT_BRIEF.md` is the source of truth. Where this file disagrees with it, **this file wins**,
because these decisions were made later by the founding team.

## Deployment (13 Oct 2026)

- v1 is deployed on the lecturer's **private server**, not the App Store or Play Store.
- The app is built with Expo + React Native + TypeScript and shipped as a **web app (PWA)** opened in
  a phone browser. Native iOS/Android builds must stay possible later without a rewrite.
- The AWS Lambda plan is replaced by a small **Node.js + TypeScript backend in Docker**
  (docker-compose), so it runs on any Linux server.
- Exchange rates: Frankfurter (no key). The backend fetches once a day and caches; the app reads
  from the backend.
- AI: Anthropic API, Haiku 5.5, escalating to Sonnet 5.5 for low-confidence scans. The key lives
  only in the server's `.env`.

## Hosting changed to Vercel + Supabase (13 Oct 2026)

The lecturer's recommended setup replaces the private-server plan above.

- **Vercel (free plan)** hosts the web app and runs the backend as functions (files in `/api`),
  on one `https://….vercel.app` address. This gives HTTPS, which the phone camera needs, with no setup.
- **Supabase (free plan)** is used only for what functions cannot remember between requests:
  the per-device scan counter and the daily exchange-rate cache. Trips and expenses stay on the
  phone (works offline; the tutor confirmed real multi-user features are not required).
- Docker and the Fastify server were removed. The backend is plain request handlers in `/backend`,
  run locally by `npm run dev:api`.
- The Anthropic key lives in Vercel's environment variables (and a local `.env`), never in the app.
- Vercel's free plan is for non-commercial use: fine for the course, not for a real launch.

## Contradictions in the brief, resolved (13 Oct 2026)

| # | Issue | Decision |
|---|---|---|
| 1 | "Day 6 of 10" with "next 4 days", but days left includes today (5 days) | Demo is **day 7 of 10**: RM 200/day for 4 days |
| 2 | Seeded category totals add up to RM 1,680, but the formula needs RM 2,700 spent | **RM 2,700 spent**; seeded expenses are written to match |
| 3 | Tax refund total shown as RM 86, RM 38, and ≈ RM 61 from the receipts | Show the **calculated** figure, labelled "up to"; handling fee 0% as a placeholder |
| 4 | "Ahead of plan" fires when the user has overspent | That state is renamed **"Spending fast"** |

## Defaults accepted

- Brief §13: every suggested default is accepted. No dark mode, English only, name is ITER everywhere.
- **Demo clock:** the demo trip runs in mid-November 2026 so Japan's refund-at-departure rules
  apply. New scans use today's live rates.
- **Departure reminder:** an in-app banner (push notifications are unreliable in a phone browser).
- **Cost protection:** the server limits scans per device and per day. No login code.
- **Data:** stored on each phone. Everyone who opens the link gets their own copy of the demo.
- **Sample receipt and menu images:** generated; real photos can be swapped in later.
- **Scope note from the tutor:** features such as sign-in and multi-user interaction only need to
  be shown as available in the app; they do not need a real multi-user backend.

## Design (13 Oct 2026)

- Tagline: **"Smarter journeys. Safer spends."** (replaces "Know what's safe to spend.").
- Look: see `DESIGN.md`. Light aqua-tinted style from the team's two references; ITER navy and
  teal kept, with the logo's green as the single accent. Ocean gradient and glass only on the
  safe-to-spend card and Scan screen. Outfit for headings and numbers.
- Animation: Reanimated inside the app (works on web and native). GSAP is for the landing website only.
- Icons: Phosphor.

## Phase 1 notes (13 Oct 2026)

- Demo trip: Tokyo, 9 to 18 Nov 2026, with the demo clock on 15 Nov (day 7). Planned: Food 900, Transport 440,
  Stay 1,470, Activities 400, Shopping 690. The 24 seeded expenses total exactly RM 2,700; a test enforces it.
- Hotel and two tickets are seeded as online bookings paid in Ringgit; everything else is in yen.
- "Planned daily amount" (used for the spending-fast check) is the safe-to-spend figure on day 1, before any spending.
- The forecast averages spending over the days elapsed including today.
- Starting a new trip moves the current one to history. "Reset the demo" on the Me tab restores Tokyo.
- The tax refund card is off Home until Phase 5, when it can be calculated rather than typed in.
- Mobbin's connector needs a paid Mobbin plan, so it is not used.

## Phase 2 notes (14 Oct 2026)

- Rates: `/api/rates` and `/api/rate-history`. With Supabase configured, Frankfurter is asked once per UTC day and
  snapshots are kept in the `fx_rates` table; if Frankfurter is down, yesterday's stored rates are served.
  Without Supabase the backend asks Frankfurter directly. Vercel's network also caches replies for 30 minutes.
- The phone keeps the last rates it received. Offline it shows "Indicative rate" with the date; a phone that
  has never been online uses the rates shipped with the app.
- A new expense stores the rate it was converted with. Editing only the details keeps that rate; changing the
  amount or currency re-converts at the current rate.
- Quick entry ("1200 yen ramen") is plain pattern matching in code, not AI, so it works offline.
- Expenses are listed newest day first, then most recently added first.
- The Currency tab shows prices from the traveller's side (what ¥100 costs in Ringgit), not the raw rate.

## Forecast uses day-to-day spending only (14 Oct 2026)

Replaces brief §9.3 (`burnRate = spent / daysElapsed`), which counted the hotel and transport as daily
spending. A RM 2,000 hotel paid on day 1 of a 4-day trip made the app warn "money runs out on day 3",
although that hotel was already set aside in the budget. Raised by the team.

The forecast now works on the same money as safe-to-spend:

- **Day-to-day budget** = total budget − reserve − what was planned for stay and transport.
- **Pace** = food, activities and shopping dated from day 1 up to today, divided by the days so far.
- **One-offs** come out of the day-to-day budget once and are not projected forward: spending above the stay or
  transport plan, and day-to-day things bought before the trip (for example tickets booked from home).
- **Run-out day** = the first day where one-offs + pace × day is more than the day-to-day budget.
- Safe-to-spend (§9.1) and the status (§9.2) were already consistent with this and are unchanged.
- The "Each day" chart still shows everything spent each day, hotel included.

## Phase 3 notes (14 Oct 2026)

- Endpoints: `POST /api/scan-receipt` and `POST /api/scan-menu` (brief §5.2's `/scan/receipt` and `/scan/menu`).
  The app sends the photo as base64 JSON with a random device id in the `X-Device-Id` header.
- Models: Claude Haiku 5.5 reads first (low effort, for speed); Claude Sonnet 5.5 takes a second look when Haiku's
  confidence is below 0.7 or the numbers fail a check. The reading with fewer problems is kept. A confident "this is
  not a receipt" is accepted without asking Sonnet. If Sonnet declines a request, Anthropic's server retries it on
  another model by itself (the API's "fallbacks" option).
- The AI returns amounts exactly as printed; the backend converts them to minor units and checks them. Tax marked
  as included (内税) is not added again. One smallest unit of rounding is allowed per printed figure.
- If no currency is printed, the trip's currency is assumed and flagged. A currency ITER does not support is refused
  rather than guessed. A date outside the trip is flagged, not changed.
- Server limits (`backend/scan/limits.ts`): 30 receipt and 15 menu scans per device per UTC day, 1,000 scans a day in
  total. Cached and demo answers are not counted; a scan the AI could not read is given back. If the counter is
  unreachable the scan still goes ahead: the prepaid Anthropic credit with auto-reload off is the final cap.
  These are separate from the plan limits the app shows (Free: 5 receipts, 3 menus per trip), which arrive in Phase 8.
- Cache: results are stored by a hash of the photo (Supabase `scan_cache`), so the same photo is never paid for twice.
  This also covers brief §5.3's "cache menu results per restaurant" for repeat photos.
- Demo samples: two receipts (a tax-free drugstore receipt over ¥5,000 and a convenience-store receipt) and two menus
  (Japanese ramen with 税抜 prices, Thai with "++"), drawn by `scripts/make-samples.ts` and marked SAMPLE. They are
  read by the real AI; only if it is unavailable or today's limit is reached does the backend use their printed contents.
- Menu prices come back as printed plus the tax and service rates to add; the app calculates Ringgit prices in Phase 6.

## Still open

- Six destination photos were supplied by the team (Tokyo, Seoul, Bali, Ho Chi Minh City, New York, Paris). Record where each came from and its licence.
