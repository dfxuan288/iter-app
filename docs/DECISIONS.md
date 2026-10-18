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

## Today's allowance is set once a day (14 Oct 2026)

Changes how brief §9.1 is shown. Before, spending during the day lowered the safe-to-spend number itself, because
today's spending was taken off before dividing by days left (which include today). Raised by the team.

- **Today's allowance** = day-to-day money left at the start of today ÷ days left including today. Fixed all day.
  It is the brief's formula, `(remaining − essentialsLeft − reserve) / daysLeft`, taken before today's spending.
- **Left today** = today's allowance − day-to-day spending dated today. This is the big number on Home; it can go
  below zero, and the card then says by how much.
- Tomorrow it rebalances: underspending raises the allowance, overspending lowers it.
- "Day-to-day" means the same as in the forecast: everything except stay and transport, plus any amount those go
  over their plan. Paying planned stay or transport today does not touch today's number.
- The "spending fast" check compares today's allowance with the planned one, as before.
- **Demo data:** the Don Quijote and Sushiro purchases moved from 15 Nov to 14 Nov (the brief dates Don Quijote
  15 Nov), so the demo opens on the morning of day 7 with RM 200 left of today's RM 200, and RM 2,700 spent.

## Exchange rates per currency (14 Oct 2026)

- Frankfurter's sources publish at different times, so the newest day can hold some currencies only. Each currency now
  gets its own latest rate and date (`dates` in `/api/rates`), and its daily change is against its own previous day.
- The backend refreshes from Frankfurter when its stored copy is more than 3 hours old (it was once per UTC day, so a
  copy taken just after midnight missed currencies published later that day).

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

## Phase 4 notes (14 Oct 2026)

- Scan tab opens on **Receipt**: take a photo, choose one from the phone's photos, or try one of two sample receipts
  (for demos). In a phone browser, "Take a photo" opens the camera.
- Photos are shrunk on the phone first: a 1,500 px copy is sent to the AI and deleted once the expense is saved or
  discarded; a 900 px copy is kept with the expense (about 30 to 60 KB). On the web, photos live in the browser's
  IndexedDB, which holds far more than ordinary web storage.
- Every photo goes into a waiting list saved on the phone before it is sent: waiting, reading, ready to check, or
  could not be read. Without a connection it waits and is sent automatically when the connection returns (checked on
  the browser's "online" signal and every 30 seconds). Unsaved receipts are listed on Home and the Scan tab.
- The review screen shows the photo, the shop, every item with its original name, subtotal, tax lines and total, then
  the usual form already filled in. Fields the AI was unsure of, or that failed a check, are outlined in amber with a
  short note. Nothing is saved until "Save expense" is tapped.
- Items are shown but not edited one by one; the amount, currency, shop, category, day and note can all be changed.
- What the receipt showed (items, tax lines, tax-included flag, tax-free shop) is kept with the expense, ready for the
  tax refund check in Phase 5, and stays with it when the expense is edited. Deleting the expense deletes its photo.
- The four seeded "scanned" expenses have no photos yet; sample photos for them are planned for Phase 9 (polish).
- Free-plan scan limits (5 receipts per trip) arrive with Plans in Phase 8.

## Phase 5 notes (15 Oct 2026)

- Rules live in `mobile/src/config/taxRules.ts`. Japan only, verified 15 Oct 2026 against the National Tax Agency's English
  guide (refund system from 1 Nov 2026; ¥5,000 before tax, same shop, same day; goods out within 90 days; a missing item
  voids the whole purchase; refunds paid by the shop or its refund company). Other countries get added once verified.
- **Handling fee: 0% placeholder, amounts shown as "up to"** (confirmed by the team, 15 Oct 2026). One number in config.
- The check runs on every scanned receipt, in code: purchases before 1 Nov 2026, stays, transport and tickets are not
  refundable; food only from a registered tax-free shop (restaurant meals are not); the shop's receipts that day must
  reach the minimum before tax; then "possibly" when the receipt does not show a tax-free shop, with a yes/no question.
- When a receipt prints no tax, the tax is estimated at the standard 10% and labelled "tax estimated".
- Refunds in Ringgit use the rate saved with the expense, so they do not drift with today's rates.
- The "to collect" total is separate from the budget and never raises safe-to-spend (brief §9.6).
- Statuses: To claim, Claimed, Received, Not claimed. "To collect" counts To claim and Claimed.
- The departure reminder is an in-app card on Home (and on the tracker) on the last two days of the trip while refunds
  are still to claim.
- Demo: the four seeded scanned receipts now carry their printed lines from brief §11, giving "Up to RM 60.66".
- Screens now wait for the phone's saved data before showing anything, so a tap can never save the demo data over it.

## Phase 6 notes (15 Oct 2026)

- Scan tab → **Menu**: take a photo, choose one, or try a sample (the ramen menu with 税抜 prices, the Thai menu with "++").
- Each dish shows its English name, the original, a one-line description, the printed price and the Ringgit price with
  tax and service added. "Contains pork" and "Alcohol" appear only when the menu makes it clear, with a note to ask the
  staff if it matters.
- Prices are worked out in code (`mobile/src/domain/menuPricing.ts`): Japan 税抜 adds 10%; Thai "++" adds a 10% service
  charge, then 7% VAT on the price and service together (฿180 becomes ฿211.86). If a menu says tax is extra but not how
  much, prices stay as printed and the menu says so.
- Tap + on dishes to build the order; the bill adds the charges once on the whole order, like a real bill. "Log this as an
  expense" opens the usual form already filled in (amount, restaurant, dishes as the note, Food); it is saved as a
  "From a menu" expense.
- Menus are read straight away rather than waiting in the background: a menu is needed at the table. Without a
  connection the app says so and offers Try again. The last 10 menus are kept on the phone to reopen.
- The sample Thai menu tells the backend to expect baht, so it reads correctly on the Tokyo demo trip.
- Free-plan menu scan limits (3 per trip) arrive with Plans in Phase 8.

## Phase 7 notes (15 Oct 2026)

- Layout follows the team's reference: the destination photo across the top with the city name and a row of
  destination pills, a green "+" (share) button on its edge, and a panel overlapping the photo with the typical trip.
- **Typical trip** is worked out in code from shared trip summaries (`mobile/src/domain/community.ts`): the usual
  length (median days), the usual spend per day (median), and the overall split weighted by spend. The total is rounded
  to RM 100. It needs at least three finished trips; with fewer, the app says so rather than show a misleading figure.
  Tokyo's sample gives the brief's "5 days, RM 2,900, Food 34%, Stay 31%".
- The split is shown as one labelled bar per category in a single colour, so it never relies on telling colours apart.
- Sample community (`mobile/src/data/communitySeed.ts`): 30 fictional Malaysian travellers, six trip summaries and three
  posts each for Tokyo, Bangkok, Seoul, Bali and Singapore, and 25 comments. Tips are kept general so the demo makes no
  claims about real businesses. Ho Chi Minh City, New York and Paris start empty.
- This user's posts, comments, likes, reports and blocks are saved on the phone (no shared server, as the tutor allowed).
  Reporting hides the post at once; blocking hides that person's posts and comments, with Unblock at the bottom of the
  feed. People show as initials and a display name only.
- **Share my trip**: one tap, choosing whether to show the amount and the split, plus an optional tip, with a preview.
  A trip still under way is shared as "Day 7 of 10, so far" and is not counted in the typical trip until it ends.
  **A tip or question**: text with an optional photo, for any destination.
- New posts and comments are dated on the demo clock (15 Nov 2026), like everything else.
- "Reset the demo" on the Me tab now also clears community activity.

## Hotels and flights removed; one simple rule (15 Oct 2026)

Team decision. Replaces brief §9.1 to §9.3 and the "essentials" notes above.

- ITER tracks **everyday spending only**. The trip budget leaves out hotel and flights, and neither is tracked. The
  "Stay" category is gone everywhere (app, AI scanning, tax rules, quick entry, sample data).
- "Transport" is now **"Daily transport"** (metro, ride-hailing, travel-card top-ups): everyday spending like food.
  The stored key stays `transport`.
- No category is held back any more.
- **Safe to spend per day = (trip budget − reserve − spent so far) ÷ days left** (days left includes today).
  The Home card still works the same way: the amount is set each morning from what was left then, and today's
  purchases count against it.
- **Running short** = what remains is less than the reserve. **Spending fast** is unchanged (below 70% of the planned
  daily amount, which is now (budget − reserve) ÷ trip days).
- **Forecast pace** includes daily transport: all spending dated on trip days so far ÷ days so far. Spending dated
  outside the trip days comes out once and is not projected forward.
- Old saved data: expenses and plans in "stay" are moved to a separate backup on the phone when the app loads (kept,
  not deleted) and are never counted. Old community splits that mention it are simply ignored.
- **Home card wording** (chosen by the team): big "RM 200", then "a day across your 4 days left", then a smaller line
  "RM 200 left today" (or "RM 12 over today's amount, so tomorrow gets a little less"). On the last day it says
  "to spend today, your last day".
- **Demo** (replaces the brief's RM 4,200 / RM 2,700 figures): the two hotel bookings and the Narita Express ticket are
  deleted; the metro ticket moved to 14 Nov so the demo opens with nothing spent today; the teamLab ticket is RM 76.41.
  Budget **RM 2,550**, reserve **RM 300**, spent **RM 1,450**, remaining **RM 1,100**:
  (2,550 − 300 − 1,450) ÷ 4 = **RM 200 a day**. Planned: Food 700, Daily transport 350, Activities 400, Shopping 800.
- The suggested split for new trips is Food 40%, Daily transport 15%, Activities 20%, Shopping 25%.
- Sample community trips had their hotel share taken out of each total and their split rescaled, so the typical
  Tokyo trip is now "5 days, RM 2,000, Food 49%". Two hotel tips were replaced.

## App date control, forgotten days, chart labels (15 Oct 2026)

- **App date** (Me tab): the demo opens on 15 Nov 2026 (day 7). Previous day / Next day move it, "Back to 15 Nov"
  returns, and "Use the phone's real date" makes trips planned with real dates behave as on a real trip. It is saved
  with the app's data, so "Reset the demo" puts it back. Next day from day 7 shows day 8 at
  (2,550 − 300 − 1,450) ÷ 3 = RM 266.66 a day.
- **Forgotten expenses**: any expense can be logged for an earlier day with the Day row on the form (a scanned receipt
  uses its printed date). From day 2, if nothing was logged for yesterday, Home asks "Nothing logged for … Forgot
  something?" with "Add for …" (opens the form on that day) and "I spent nothing". Money logged for an earlier day lowers
  today's daily amount straight away, because it has already gone.
- **Each day chart**: tap a bar (phone) or point at it (laptop) to see its date and amount; each bar is a button with
  the same words for screen readers.

## Install as an app, full screen, motion (16 Oct 2026)

- **Download ITER**: a "Get the ITER app" card (Home, can be hidden; always on Me) puts ITER on the phone's home
  screen. Android Chrome, Edge and Samsung Internet show their install prompt from the button. iPhones have no prompt,
  so the card shows the two steps (Share, then Add to Home Screen, in Safari). The card disappears once ITER is opened
  from the home screen. Files: `mobile/public/manifest.json`, `mobile/public/icons/`, `mobile/public/index.html`.
- **Full screen**: opened from the home screen, ITER has no browser bars and draws behind the notch
  (`viewport-fit=cover`); the status bar takes the app's background colour, and content stays clear of the notch.
  In a normal browser tab the browser's own bars stay; that cannot be changed by a website.
- **Trip calendar**: the teal band now runs unbroken from the first day's circle to the last day's.
- **Motion** (all switched off when the phone is set to reduce motion): amounts on Home and the tax refund total
  count to their new value after a save; a newly saved expense slides into the Recent list; the daily bars grow on
  first show; the heart pops on a like; photos breathe while loading; pages opened on top slide in from the right; the
  Community photo scrolls slower than the page.
- Saving or closing a screen now returns to the screen underneath instead of opening a fresh copy of it.

## Lottie animations (16 Oct 2026)

- **Saved tick**: after saving an expense, a scanned receipt, a menu order, edits or a new trip, a small message with
  a tick that draws itself appears at the top for two seconds ("Receipt saved", "Trip ready"...). Screen readers
  announce it.
- **No trip yet**: Home shows a paper plane with drifting clouds.
- Both animations were drawn for ITER (in `mobile/assets/lottie/`), so there is no licence to check. To use one from
  LottieFiles instead, replace the JSON file (check its licence first, and record it here).
- Phones use `lottie-react-native`. The web app uses Airbnb's small `lottie-web` light player instead, because
  lottie-react-native's web player downloads a 1.9 MB engine from another site on first use (slow on roaming data,
  fails offline). The player loads only when an animation first shows.
- With reduced motion on, the finished picture shows without movement.

## Plans: pay only for the days you travel (17 Oct 2026)

Replaces the brief's Free / Trip Pass (RM 9.90 per trip) / Premium (RM 12.90 a month), §9.9.
Prices live in `mobile/src/config/plans.ts`; the rules are pure functions in `mobile/src/domain/plan.ts`, with tests.

- **Free trial**, RM 0, 3 days: everything, up to 10 scans a day. It starts by itself on the first trip day ITER is
  used (day 1 if opened that day) and is used once.
- **Day Pass**, RM 2.90, 1 day. **7-Day Pass**, RM 12.90, 7 days in a row ("Best value", about RM 1.84 a day).
  Everything, no daily scan limit. Every button is active; buying asks "Buy 7-Day Pass for RM 12.90?", then shows the
  saved tick "7-Day Pass added". Purchases are simulated: no money moves.
- **A pass starts by itself** on the next trip day not already covered (the trial first, then the oldest pass). Extra
  passes wait as "Saved for later" and expire 12 months after purchase if never started.
- **Free version** (a trip day with no trial or pass): Community, planning trips and the person's own records (typing
  expenses in, the lists, spent and remaining). Locked, each with a "See plans" button: safe to spend and warnings,
  receipt and menu scanning, the tax refund tracker, the Currency tab. Nothing saved is ever lost or hidden for good.
- **Before a trip starts** (and with no trip), everything is open, so people can plan.
- **Me tab "My plan" card**: what covers today ("7-Day Pass: Active until 18 Nov"), "Free trial used 9–11 Nov", one
  line per kind of saved pass ("Saved for later: 1 × 7-Day Pass · Expires 15 Nov 2027") and "See plans". Plans is a
  screen opened from there and from every lock, not a sixth tab.
- **Demo**: Amanda's trial ran 9–11 Nov; she bought a 7-Day Pass on 10 Nov, which started on 12 Nov and runs to 18 Nov.
  Data saved on a phone before this change gets the same plan.
- The 10-a-day trial limit is counted on the phone. The server's own daily limits (`backend/scan/limits.ts`) still
  protect the AI bill. With real purchases (RevenueCat, brief §5), the plan would be checked on the server.
- Trip history (Premium in the brief) has no plan now; it stays on the "Later" list.

## Launch animation (18 Oct 2026)

Chosen from four directions (inspired by Dribbble launch shots), "like the Netflix intro":
the ITER mark appears on navy with the trip's city photo inside it (Tokyo for the demo) and the
wordmark below; a light sweeps across; the camera dives into the mark until the photo fills the
screen; then the photo shrinks into Home's safe-to-spend card, which shows the same photo, so launch
and app read as one continuous shot. About 2.9 seconds. (A first version ended with a ring and the
amount counting up; the team preferred landing on the card, so the amount is shown once, on Home.)

- Plays once each time the app opens; Me → "Replay the launch animation" goes to Home and plays it again.
- A tap skips it. Not played when the phone is set to reduce motion. It never stays more than 6 seconds.
- When Home's photo card is not on screen (the app opened on another page, or safe to spend is locked),
  the scene fades into the app instead of shrinking.
- Web: `mobile/src/components/launch/LaunchSplash.web.tsx` (browser animations and CSS masks). The phone
  apps get a simple wordmark fade (`LaunchSplash.tsx`) until a masking library is added.

## Trip Wrapped, raised scan button (18 Oct 2026)

- **Trip Wrapped** (`/wrapped`): the trip's highlights as full-screen cards, like Spotify Wrapped: intro on the
  city photo, total spent (and budget left), biggest day, where the money went, biggest buy, expenses logged and how
  many were scanned, tax refund to collect, then "Share to Community". Tap the right of the screen or Next to go on,
  the left or Back to go back. Figures come from `mobile/src/domain/wrapped.ts` (tested).
- Where to find it: on Home once the trip is over ("Your Tokyo trip, wrapped"), and on Me during the trip ("Your
  Tokyo trip so far"), so it can be shown in a demo on any day.
- **Scan button**: larger and raised above the tab bar, with a new icon: a receipt inside scanning corners.
- **Scan button icon** (later the same day): replaced with the team's own design (scan_icon.svg): four rounded
  scanner corners and a scan line, drawn as a vector in ITER's colours: mint corners and a green line on a navy
  button; green button with navy corners and a white line when Scan is open.

## "Somewhere else?": any country (18 Oct 2026)

- The trip planner keeps the 8 featured cities (with photos) and adds **Somewhere else?**: search 110 countries
  ("uk" finds the United Kingdom, "kor" South Korea), pick one, and optionally type the city or place ("Edinburgh").
  The country sets the currency. Such a trip shows the ocean gradient instead of a photo.
- **Rates**: Frankfurter publishes all 87 currencies on the list. The app asks the server for the featured eight
  plus the trip's own currency (`/api/rates?extra=GBP`); the server fetches and stores that currency on its own, so
  the featured rates are unaffected. If it cannot be fetched, the phone keeps the last rate it had for it.
- **Money**: every currency has its correct decimal places (yen and won 0, dinars 3), from the ISO standard, with
  ITER's earlier choice kept that rupiah and dong are whole units. Typing "12.50 pounds" or "£8" works.
- **Receipt scanning** accepts all these currencies (the AI instruction now gives examples instead of a fixed list).
- **Tax refund**: Japan only for now (a trip to Japan picked from the list also gets it). Other countries say
  "not available yet". **Community**: the trip's country appears first in the picker, with "be the first" messages.
- The lists are generated: `npx tsx scripts/make-currencies.ts` writes `mobile/src/domain/currencyList.ts`,
  `mobile/src/data/countries.ts` and `backend/currencyList.ts`. Add a country there, then run it.

## Onboarding, trip history, demo date fix (18 Oct 2026)

- **Bug (found by the team)**: with the app date moved back to day 1, Home showed RM 102.78 spent that day but
  RM 1,450 "spent so far", because expenses dated later still counted. The app now shows a trip as of the app
  date: later-dated expenses are left out of every figure (totals, lists, tax refund, Trip Wrapped) until the date
  reaches them, and Home says how many are waiting. Nothing is deleted. (`expensesAsOf` in domain/budget.ts, tested.)
- **Welcome screens** (after the team's onboarding reference): on first open, three pages over a dotted map with
  floating ITER cards: safe to spend, scanning, and what trips cost (with the free-trial line). Skip, swipe or Next;
  "Get started" ends it and it is remembered on the phone. Me → "Show the welcome screens" shows them again. The launch
  animation fades (instead of landing on Home's card) when the welcome screens come next.
- **Your trips** (Me): every trip, newest first, with what was spent; tap one to make it the current trip. **Remove this
  trip** asks first, then deletes the trip, its expenses and receipt photos; the newest other trip becomes current, or
  Home shows "No trip yet" (with the paper plane).

## Phase 9: polish (18 Oct 2026)

Scope agreed with the team: finish what exists, no new features (the under-budget celebration is on hold).
- **Demo receipt photos**: the four scanned demo receipts (UNIQLO, Bic Camera, Ichiran, Don Quijote) now have photos,
  drawn by `scripts/make-samples.ts` from the exact items, tax lines and totals in the demo data and bundled with the
  app (`mobile/assets/demo-receipts`, ids starting "demo:"), so they show offline. Saved demo data gets them too.
- **Menu notes**: when ITER's own line explains the tax and service charge, the AI's notes that repeat it are hidden;
  others (cover charge, minimum order) still show.
- **Leftovers**: the "Coming later" card is gone (trip history is built; settings are not planned).
- **Accessibility pass**: a scripted check of every screen for tap targets under 44 × 44, controls without a
  screen-reader name, images without a description and text below WCAG AA contrast. Fixed: like and comment buttons
  were 40–42 px wide; category pictures were not marked decorative on the web; "1 comments" / "1 likes". The only
  remaining flags are white text on the Community photo header, which the script measures against the page instead of
  the photo (on screen it is white on dark navy).

## Phase 10: final checks (18 Oct 2026)

- **Checks**: 284 app tests and 59 server tests pass; typecheck, lint and the production build are clean.
- **Live smoke test** on https://iter-app-alpha.vercel.app: welcome screens, every tab, live rates, plans.
- **Real AI scan on the live server** of a receipt it had never seen (the UNIQLO demo receipt): read in 3.6 s by Haiku,
  every field correct (shop in English and Japanese, date, both items, ¥9,570 tax-included, 10% tax ¥869, tax-free shop).
- **Security**: no secret keys anywhere in the live app's code (2.6 MB checked) and no key files in the repository.
  Supabase's security advisor reports only that the three tables have row-level security with no access rules: that is
  deliberate (only ITER's server, with its secret key, can read or write them). Performance advisor: no issues.
- **Offline**: with the connection cut while ITER is open, the converter uses the last saved rate and says so, and new
  expenses are saved on the phone; scans wait and send themselves later. **Opening** ITER with no connection at all is
  not possible yet: that needs a service worker (an offline copy of the app itself). Decision pending with the team.
- **Demo script**: `docs/DEMO.md`.

## Still open

- Offline start (service worker): build it, or leave it for after the prototype? See Phase 10 above.

- Six destination photos were supplied by the team (Tokyo, Seoul, Bali, Ho Chi Minh City, New York, Paris). Record where each came from and its licence.
