# ITER — Project Brief (v2 prototype)

> Hand this file to the developer (Claude Code). **Decided** items come from the founding team. **Recommendation** items are the developer's proposal and can be overruled. Everything in **§13 Open questions** must be confirmed, or its suggested default accepted, before it is built.
>
> **v2 changes the core idea.** v1 was a budgeting app with an emergency advance. v2 is built on five pillars (§1), with **AI receipt scanning** as the main way money gets into the app.

---

## 1. The product

ITER is a travel money app for Malaysian travellers. It does five things:

1. **Safe to spend — the core.** ITER tells you **how much you can safely spend for the rest of your trip**, per day, and **how much you have already spent**.
2. **Receipt scanning — how spending is tracked.** Whenever you buy something, you take a photo of the receipt in ITER. AI reads it and logs the expense automatically: amount, currency, shop, items and category. Safe-to-spend updates straight away.
3. **Tax refund.** When a scanned purchase qualifies for a tourist tax refund, ITER shows **that it's refundable and how much you can collect**. It keeps a running total and reminds you to claim before you fly home.
4. **Currency exchange.** Live exchange rates (Frankfurter API) and a converter, available as its own tab and built into every amount in the app.
5. **Community forum.** A social feed where travellers share what their trips really cost. Browse by destination before you go.

Plus two supporting features:
- **Quick manual entry** for spending with no receipt, such as street food, transit and online bookings.
- **Menu translate:** photograph a menu to see each dish translated, with its price in Ringgit.

Tagline: **Know what's safe to spend.**

## 2. The problem

- Travellers track what they have already spent, not what they can still spend. The useful number looks forward.
- Logging expenses by hand is tedious, so people stop doing it, and their budget goes blind halfway through the trip.
- Spending happens in foreign currencies, so the running total in Ringgit is hard to know.
- Tourists miss tax refunds they're entitled to: they don't know which purchases qualify, or forget to claim at departure.
- Before a trip, people can't easily find out what a trip to a given place really costs.

## 3. Target users

- **Decided:** Malaysian travellers on leisure trips abroad. Home currency is MYR.
- **Destinations:**
  - Main focus: Japan, Thailand, Singapore, Indonesia, Vietnam and South Korea.
  - Also supported: the US and Europe.
- **User research** (Monash University FinTech group project questionnaire): adults 18+, students and working people. Points that matter for adoption:
  - People want to try a free version first, and test it on a short trip.
  - Tracking across currencies must feel simple.

## 4. Prototype goals and constraints

- **Decided:** v1 is a **prototype** for user testing and investors. It uses **fake data** and moves **no real money**, but must feel **as real as possible**.
  - **Recommendation:** make receipt scanning, menu translation and exchange rates **actually work** (real AI, real rates). These are the "wow" moments, and they cost almost nothing to run (§5.3).
  - Accounts, forum users and posts, purchases and past trips are seeded fake data.
- **Decided:** ships on **both the Apple App Store and Google Play**.
- **Decided:** backend on **AWS**.
- **Decided:** **no bank or card partnerships.** Everything must work without one.

## 5. Technical approach (Recommendation)

### 5.1 App
- **React Native with Expo, in TypeScript.** One codebase gives iOS and Android.
  - EAS Build and Submit handle store builds.
  - TestFlight and Play internal testing for demos.
  - A web build can be shared as a link.
- **Camera:** `expo-camera` or `expo-image-picker`. Allow both taking a photo and choosing one from the gallery.
- **Services layer:** all data access goes through `services/`:
  - `tripService`, `expenseService`, `scanService`, `taxRefundService`, `fxService`, `forumService`, `billingService`.
  - Seeded and on-device for the prototype.
  - The same interfaces call AWS later, so screens don't change.
- **Offline-first:**
  - Logging must work with no signal.
  - Receipts photographed offline are **queued** and scanned automatically when back online. Show them as "Waiting to scan".
  - Manual entries and cached rates work fully offline.

### 5.2 Minimal backend, needed from day one
The AI key **must never be inside the app**, so even the prototype needs a small backend:
- **AWS API Gateway + Lambda (TypeScript)**:
  - `POST /scan/receipt` — image in, structured JSON out.
  - `POST /scan/menu` — image in, translated dishes out.
- Lambda calls the AI model with the key from **AWS Secrets Manager**.
- Rate-limit per device/user to control cost.
- **Demo mode fallback:** if the network or AI fails during a pitch, return a canned result for the seeded demo receipts, so the demo never breaks.

Later, the full backend:
- **Auth:** Cognito.
- **Database:** RDS PostgreSQL.
- **Receipt images:** S3, private, with lifecycle deletion.
- **Infrastructure:** CDK.
- **Region:** Malaysia if every service needed is available there, otherwise Singapore.

### 5.3 AI model and cost (Decided model; estimates to verify)
- **Model:** **Claude Haiku 5.5** for all scans. Escalate to **Claude Sonnet 5.5** only when Haiku reports low confidence (blurry, handwritten, chalkboard).
- **API price:**

  | Model | Input | Output |
  |---|---|---|
  | Haiku 5.5 | US$0.10 per million tokens | US$0.50 per million tokens |
  | Sonnet 5.5 | US$2 per million tokens | US$10 per million tokens |

- **Estimated cost per scan:** receipt ≈ RM 0.002, menu ≈ RM 0.005. A heavy user (105 scans on a 7-day trip) costs ≈ RM 0.40. Verify with real images.
- **Keep it cheap:**
  - Resize images to about 1,500 px on the long edge before upload.
  - Cache menu results per restaurant.
  - Use the Batch API (50% off) for any non-urgent background jobs.
- **Rule: AI reads, code calculates.** The AI only extracts data. All money maths (safe-to-spend, refund amounts, conversions) is plain code, never AI.

### 5.4 Flag now, don't build now
- **In-app purchases:** Apple and Google require their own billing for Trip Pass and Premium, and take a 15–30% commission. RevenueCat handles both stores. Simulated in the prototype.
- **Privacy:** receipt photos and forum posts are personal data under Malaysia's **PDPA 2010**. Receipt images are sent to an AI provider, which must be disclosed in the privacy policy. Get legal advice before launch; this brief is not legal advice.
- **Forum moderation:** user-generated content needs reporting, blocking and moderation. Both app stores require this for social features.

## 6. Features for v1

| # | Feature | Pillar | Tier |
|---|---|---|---|
| F1 | Create a trip: destination, dates, total budget in MYR, reserve | Safe to spend | Free |
| F2 | Category budgets: Food, Transport, Stay, Activities, Shopping (+ Reserve) | Safe to spend | Free |
| F3 | **Safe to spend per day** for the rest of the trip | Safe to spend | Trip Pass (Decided) |
| F3b | **Total spent** and **remaining** | Safe to spend | Free |
| F4 | Overspending warning: "at this pace, money runs out on day 8" | Safe to spend | Trip Pass |
| F5 | **Scan a receipt → AI logs the expense** (review screen, one tap to confirm) | Receipt scanning | Free: limited / Trip Pass: unlimited |
| F6 | Quick manual entry, including natural text like "1200 yen ramen" | Supporting | Free |
| F7 | **Tax refund check** on every scanned receipt: eligible or not, amount collectible | Tax refund | Trip Pass |
| F8 | Tax refund tracker: running total, what's needed to claim, departure reminder | Tax refund | Trip Pass |
| F9 | **Currency tab:** live rates, converter, rate history | Currency | Free |
| F10 | **Forum:** destination feed, auto trip summaries, posts and photos, comments and likes | Forum | Free (posting may need an account) |
| F11 | **Menu translate:** dishes translated with RM prices | Supporting | Free: limited / Trip Pass: unlimited |
| F12 | Trip history across trips | Safe to spend | Premium |
| F13 | Plans screen (purchases simulated) | All | All |

**Website:** the landing site (claude.ai artifact, v13) now matches this brief: interactive receipt scan demo, tax refund tracker, community preview and the pricing above. Its demo figures (RM 4,200 budget, RM 2,700 spent, RM 200/day, RM 38 tax to collect) can be reused as seed data.

**Moved out of v1 (see §12):** fair-price check, bank and email import.

**Decided:** the Emergency Travel Advance is **removed completely**. No screen, card or mention in the app or on the website.

## 7. Screens and user flow

Bottom tab bar with five tabs: **Home · Scan · Currency · Community · Me**. The Scan tab is a large centre button.

The demo account is **Amanda T., Tokyo, day 6 of 10**.

1. **Launch.** Journey-line animation resolving into the ITER mark, as on the website. Under 2.5 s, skippable.
2. **Onboarding.**
   - Three panels: *One honest number* · *Snap it, we log it* · *Get your tax back*.
   - Then **Sign in** (simulated) or **Continue as demo traveller**.
3. **Plan a trip** (multi-step):
   - Destination country, which sets the local currency.
   - Dates.
   - Total budget in MYR.
   - Reserve.
   - Category split.
   - Review → **Start trip**.
4. **Home — Safe to spend:**
   - **Big number:** "RM 200 / day for the next 4 days" (Trip Pass; Free users see a locked preview).
   - **Two clear figures underneath:** **Spent so far RM X** and **Remaining RM Y**.
   - **Status chip:** On track / Ahead of plan / Running short.
   - **Tax refund pill:** "RM 86 tax refund to collect" → opens the tracker.
   - **Daily spend bars,** today highlighted.
   - **Recent expenses list,** with a receipt thumbnail on scanned entries.
   - **Warning card** when the pace won't last.
5. **Scan** (centre tab), with three modes along the bottom of the camera: **Receipt · Menu · Type it**.
   - **Receipt:**
     1. Camera with an edge-detection frame, or choose from the gallery.
     2. "Reading receipt…" (2–5 s).
     3. **Review screen:**
        - Shop name and date.
        - Line items.
        - Total in the original currency and in RM, with the rate and its date.
        - Suggested category.
        - **Tax refund badge:** "✓ Tax refund eligible · collect ≈ RM 14.20" or "Not eligible: below ¥5,000 minimum".
        - Every field is editable.
     4. **Confirm** → the Home numbers animate to their new values.
   - **Menu:**
     - Camera → list of dishes with translation, original price, RM price, and taxes or service charges noted.
     - Optional "I ordered this" → becomes a pre-filled expense.
   - **Type it:** one text field ("1200 yen ramen" → parsed), or the classic amount + currency + category form.
   - **Offline:** photos are queued as "Waiting to scan · will process when online".
6. **Expense detail:**
   - Receipt image, items, conversion, category, tax refund status.
   - Edit and delete.
7. **Tax refund tracker:**
   - Total collectible on this trip.
   - Each eligible purchase, with shop, date, tax amount and status: *To claim* / *Claimed* / *Not claimed*.
   - Country rules in plain language (§9.6) and what to bring (passport, the items, unused).
   - **Departure checklist** and a reminder notification on the last day.
   - The user can mark refunds as received.
8. **Currency tab:**
   - **Converter:** amount + currency ↔ MYR, live.
   - **Rates list** for supported currencies against MYR, with daily change.
   - **Rate history chart** (7 or 30 days) per currency.
   - **Labels:** shows "Indicative rate · {date}" when offline.
9. **Community tab (forum):**
   - **Destination picker** at the top (Tokyo, Bangkok, Seoul…).
   - **Destination stats header,** computed from posted trip summaries: "Typical 5-day Tokyo trip: RM 2,900 · Food 34% · Stay 31%".
   - **Feed** mixing two kinds of post:
     - **Trip summary posts:** auto-generated from a finished trip, with destination, days, total, category split chart, top tip. Posted in one tap; the user chooses what to show.
     - **Free posts:** text + photos, such as tips or questions.
   - **Interactions:** likes and comments, sorted by Latest or Top.
   - **Safety:** report post, block user. Posts show the display name only.
   - **Prototype:** seeded with about 30 realistic fake users and posts across 5 destinations.
10. **Trip summary / end of trip:**
    - Totals vs budget, category breakdown, tax refunds collected.
    - **Share to Community** button.
11. **Me:**
    - Profile, plan, trip history (Premium), settings: notifications, scan quality, privacy, delete my data.
12. **Plans:** Free / Trip Pass / Premium comparison and a simulated purchase.

**Recommendation — demo controls.** Add a hidden presenter panel in demo builds. It should:
- Jump to any trip day.
- Add a spending burst.
- Force "running short".
- Inject a sample receipt image (so scanning can be shown without a real receipt).
- Reset the demo.

## 8. Data stored

All money is stored as **integers in minor units**: sen for MYR, yen for JPY, and so on. Store `currency` alongside every amount.

- **User:** id, displayName, email, homeCurrency `MYR`, planTier, createdAt.
- **Trip:** id, userId, destinationCountry, city, localCurrency, startDate, endDate, totalBudgetMYR, reserveMYR, status.
- **CategoryBudget:** tripId, category, plannedMYR.
- **Expense:**
  - id, tripId, createdAt, note
  - **Amount:** amountOriginal, currency, rateUsed, rateDate, amountMYR
  - **Classification:** category, source (`scan` | `manual` | `menu`), merchantName, purchaseDate
  - **Receipt:** receiptId (nullable), items[] (name, qty, price)
  - **Tax:** taxIncluded (bool), taxAmountOriginal
  - Save the rate used, so past entries never change.
- **Receipt:**
  - id, expenseId, imageUri (local; S3 later)
  - status (`queued` | `scanning` | `needs_review` | `confirmed` | `failed`)
  - rawAiJson, confidence, modelUsed
- **TaxRefundItem:**
  - id, expenseId, tripId, country
  - eligible (bool), reason (e.g. "below minimum")
  - taxAmountOriginal, estRefundOriginal, estRefundMYR
  - status (`to_claim` | `claimed` | `received` | `missed`)
- **TaxRule** (config, not code):
  - country, minPurchase, minPurchaseBasis (`pre_tax` | `incl_tax`), taxRate(s)
  - sameStoreSameDay (bool), claimWindowDays, refundMethodNote
  - estHandlingFeePct, sourceUrl, **lastVerified**
- **FxSnapshot:** date, base `MYR`, quote, rate. Cached for offline use.
- **ForumPost:**
  - id, userId, destinationCity, type (`trip_summary` | `post`)
  - body, photos[], tripSummary (json: days, totalMYR, categorySplit, tip)
  - likeCount, commentCount, createdAt, hidden (bool)
- **Comment:** id, postId, userId, body, createdAt.
- **Like:** postId, userId.
- **Report:** id, postId, reporterId, reason, createdAt.
- **MenuScan:** id, tripId, imageUri, dishes[] (original, translation, price, currency, priceMYR, notes).
- **Purchase:** userId, product, tripId, startedAt, simulated true.

## 9. Business rules and calculations

### 9.1 Safe to spend (Decided)

```
spent       = sum of trip expenses in MYR
remaining   = totalBudget − spent
safePerDay  = max(0, (remaining − essentialsLeft − reserve) / daysLeft)
```

Demo: (1,500 − 400 − 300) / 4 = **RM 200 per day**.

- Always show **spent** and **remaining** next to it.
- Recalculate after every confirmed, edited or deleted expense.
- `daysLeft` includes today.

### 9.2 Status
- **Running short:** `remaining < essentialsLeft + reserve`.
- **Ahead of plan:** `safePerDay` is below the threshold in §13.
- **On track:** otherwise.

### 9.3 Forecast
- `burnRate = spent / daysElapsed`.
- **Run-out day:** the first day where projected cumulative spend exceeds `totalBudget − reserve`.
- Warn if that day falls before the trip ends.

### 9.4 Receipt scanning pipeline
1. Photo → resize (~1,500 px) → upload to `/scan/receipt`.
2. AI returns **strict JSON**:
   - merchantName, purchaseDate, currency
   - items[] (name, qty, unitPrice, lineTotal)
   - subtotal, taxLines[] (rate, amount), serviceCharge, total
   - taxIncluded (bool), suggestedCategory, confidence (0–1), language
3. **Validate in code:**
   - Items should sum to the subtotal, and subtotal + tax + service to the total, within rounding.
   - Currency must be supported.
   - Date must be within the trip, otherwise flag it.
4. **If confidence < 0.7 or validation fails:** retry once with Sonnet, then show the review screen with the uncertain fields highlighted.
5. The user **always confirms** before the expense is saved. Nothing is logged silently.
6. Convert with §9.7, then run the tax refund check (§9.6).

### 9.5 Menu translate
- AI returns dishes[]: original name, translation, short description, price, currency.
- Also notes, e.g.:
  - Japan prices shown "before tax (税抜)": add 10%.
  - Thailand "++": add 10% service + 7% VAT.
  - Pork or alcohol flagged where identifiable, useful for Muslim travellers.
- RM prices are calculated **in code**, including the added tax or service, never by the AI.

### 9.6 Tax refund (Decided feature; rules are config)

**Principle:** ITER answers two questions on every scanned receipt: **is it refundable**, and **how much can be collected**.

**The rules engine:**
- Rules live in `TaxRule` config per country, never hard-coded.
- Every rule carries a `sourceUrl` and `lastVerified` date.
- Rules change. Japan changed on 1 Nov 2026.
- Show "Estimated · rules verified {date}" in the UI.

**The check:**
```
eligible = store is a registered tax-free shop (user confirms if unknown)
           AND purchase total meets the country minimum (same store, same day)
           AND purchase date within claim window
estRefund = taxAmount × (1 − estHandlingFeePct)
```

**Japan, the demo country.** From 1 Nov 2026, Japan moved to a **refund system**:
- Tourists pay the tax-inclusive price in store, then claim the refund when leaving Japan after the customs departure procedure.
- The minimum stays **¥5,000 before tax, same store, same day**.
- Consumables and general goods are now treated the same.
- Goods must be bought within **90 days** of departure, and items must be carried out unused. If one item from a transaction is missing, the whole transaction becomes ineligible.
- The refund is paid via the store's chosen method, possibly minus a handling fee.
- Consumption tax is 10% standard, 8% reduced rate for food items. **Verify the rates and the fee assumption before launch.**

**Other countries** (Thailand, South Korea, Singapore and others) have their own schemes. Add them as config once each is verified.

**When eligibility is unknown,** for example when the receipt doesn't show whether the shop is registered: show "Possibly refundable · check for a Tax-Free sign" with a yes/no toggle. Never claim certainty the receipt can't support.

**Effect on the budget:** shown as a **separate "to collect" total**. It does **not** raise safe-to-spend, because the money is only received at or after departure.

### 9.7 Currency (Decided)
- **Supported:** MYR, JPY, THB, SGD, IDR, VND, USD, EUR, KRW.
- **Source:** Frankfurter v2 — `GET https://api.frankfurter.dev/v2/rates?base=MYR&quotes=JPY,THB,SGD,IDR,VND,USD,EUR,KRW`.
  - The response is a **flat array** of `{date, base, quote, rate}`.
  - `rate` is the number of foreign units per 1 MYR.
- `amountMYR = amountForeign / rate`. Example: ¥100 = RM 2.58 at 38.725.
- **Caching:** cache daily. When offline, use the cache and label it **"Indicative rate · {date}"**.
- **History** for the chart: use Frankfurter's time-series endpoint, or store daily snapshots.
- **Seed rates (8 Oct 2026):**

  | Currency | Rate per 1 MYR |
  |---|---|
  | JPY | 38.725 |
  | THB | 8.2354 |
  | SGD | 0.31301 |
  | IDR | 4,375.35 |
  | VND | 6,351 |
  | USD | 0.24474 |
  | EUR | 0.21792 |
  | KRW | ~292.4 |

### 9.8 Forum rules
- **Trip summaries are opt-in:**
  - The user previews exactly what is shared.
  - Exact dates and receipt images are never shared by default.
- **Destination stats** use trip summaries only, as the median per day. Show them only when at least 5 summaries exist for that destination; otherwise "Not enough trips yet".
- **Moderation:**
  - Report and block on every post and comment.
  - Hide a post automatically after 3 reports, pending review.
  - Basic profanity filter.
- **Prototype:** all forum data is seeded and stored locally. New posts appear in the user's own feed only.

### 9.9 Plans (Decided)
- **Free, RM 0:**
  - Trips, category budgets, manual entry, currency tab, forum.
  - **Spent and remaining** (but not safe-to-spend: the lecturer advised the core number should be paid).
  - **5 receipt scans and 3 menu scans per trip.**
  - On Home, the safe-to-spend card shows as a locked preview with "Unlock with Trip Pass".
- **Trip Pass, RM 9.90 per trip:**
  - **Safe to spend per day.**
  - Unlimited scans.
  - Safe-to-spend forecast and warnings.
  - Tax refund check and tracker.
- **Premium, RM 12.90 per month:**
  - Everything in Trip Pass for all trips.
  - Trip history.

## 10. Brand and design system

> **Decided update:** the team no longer wants a strictly minimalist look ("too generic"). The website now uses a slow deep-ocean gradient hero and soft gradient washes. The app should carry the same feel: calm and clean, but with depth.

- **Colours:**

  | Colour | Use |
  |---|---|
  | `#053B50` navy | Primary text, primary buttons, gradient base |
  | `#176B87` teal | Interactive elements, charts |
  | `#64CCC5` aqua | Glows and highlights only. **Never text on white (1.91:1)** |
  | `#3F9FB0` | Deeper aqua used inside gradients |
  | `#EEEEEE` light grey | Section background |
  | `#FFFFFF` white | Cards |
  | `#4E6B78` muted text | Contrast 5.68:1 on white |
  | `#E6F5F4` pale aqua | Chips, with `#0E5265` text |

- **Gradients:**
  - Home header and the Scan screen use a soft navy → teal gradient, optionally animated slowly with light grain.
  - Content sits on white cards.
- **Type:** system font (SF Pro / Roboto). Large tight headings, calm body text.
- **Shapes:** rounded corners 16–20, squircle icon tiles, soft shadows, frosted-glass chips over gradients.
- **Logo:** ITER mark (ribbon + four-point sparkle) and wordmark. Reuse the website SVG.
- **Motion:**
  - Journey-line launch.
  - Numbers easing after each confirmed scan.
  - A scanning shimmer over the receipt while AI reads it.
  - Refund total ticking up.
  - Respect reduce-motion.
- **Accessibility:**
  - WCAG AA contrast.
  - Touch targets at least 44×44.
  - Screen-reader labels, including on the camera shutter and scan results.
  - Dynamic text size.

## 11. Seed data

- **User:** Amanda T., Kuala Lumpur, Trip Pass active.
- **Active trip:** Tokyo, 10 days, day 6, budget RM 4,200, reserve RM 300.
  - Category totals: Food 520, Transport 310, Stay 670, Activities 180, Shopping 0.
  - Derive all figures from seeded expenses so everything reconciles.
- **Seeded expenses:** about 25 realistic JPY entries. Mix:
  - **Scanned**, with fake receipt images: convenience store, ramen shop, Don Quijote, Uniqlo.
  - **Manual:** Suica top-up, street food.
- **Tax refund demo:**
  - **Date the demo trip after 1 Nov 2026**, so Japan's refund-at-departure system applies. Before that date, shops removed the tax at the till instead.
  - Receipts (prices from team research, Oct 2026; same ones as the website demo):

    | Receipt | Items | Total | Tax | Refund? |
    |---|---|---|---|---|
    | UNIQLO Ginza, 14 Nov | HEATTECH crew neck ×2 ¥2,580; Ultra Light Down jacket ¥6,990 | ¥9,570 incl. tax (¥8,701 before tax) | ¥869 | Eligible: collect up to ¥869 |
    | Bic Camera Shinjuku, 12 Nov | Electronics, ¥14,800 before tax | ¥16,280 | ¥1,480 | Eligible |
    | Ichiran Shibuya, 14 Nov | Classic tonkotsu ramen ¥1,480; extra noodles ¥210 | ¥1,690 incl. tax | ¥153 | No: restaurant meals aren't tax-free |
    | Don Quijote Shibuya, 15 Nov | Umaibo snack assortment ¥450; LuLuLun face masks 7-pack ¥660 (before tax) | ¥1,212 | ¥102 (8% food, 10% cosmetics) | No: under the ¥5,000 minimum |

  - Total "to collect" shown on Home.
- **Sample receipt images** (bundled for the demo controls): one Japanese, one Thai, one blurry (to show the review/fix flow).
- **Sample menu image:** a Japanese ramen menu, plus a Thai menu with "++" pricing.
- **Forum:**
  - About 30 fake users with Malaysian names.
  - Posts across Tokyo, Bangkok, Seoul, Bali and Singapore.
  - Each destination has at least 5 trip summaries, so stats show.
- **Past trips:** Bangkok and Singapore.
- **Team (About screen):**
  - Amanda Tan Li-Wen (CEO)
  - Geoffrey Tan Hsien Yang (Finance)
  - Aldrich Low (Finance)
  - Abraham (Operations · Legal)
  - Ng Hao Sen (Marketing)
  - Darren Foong Tze Xuan (Technology)
  - Tara Lo (Technology)

## 12. Out of scope for the v1 prototype

- Real money movement, real purchases, real KYC.
- **Emergency Travel Advance**: removed completely (Decided).
- **Fair-price check** ("is this a tourist price?"): later, once enough scan data exists.
- **Automatic bank, email, notification or Apple Pay import:** later options. No partnerships in v1.
- **ITER wallet/card ("Wise-like"):** future vision only. Needs Bank Negara licensing.
- Group/shared trips.
- Home currencies other than MYR.
- Full production backend. Only the scan Lambda from §5.2 is needed now.

## 13. Open questions (decide or accept the default)

1. ~~Is safe-to-spend free?~~ **Decided:** no. Safe-to-spend is in Trip Pass; Free shows spent and remaining (§9.9).
2. ~~Emergency Travel Advance?~~ **Decided:** removed completely.
3. **Free scan limits.** *Suggested:* 5 receipts + 3 menus per trip.
4. **What counts as "essentials" in the formula?** *Suggested:* unspent Stay + Transport budget.
5. **"Ahead of plan" threshold.** *Suggested:* `safePerDay` below 70% of the original daily allowance.
6. **Tax refund countries for v1.** *Suggested:* Japan fully (demo), then Thailand and South Korea once their rules are verified.
7. **Forum identity:** real names or display names? Can users post without a trip summary?
   - *Suggested:* display names.
   - Anyone signed in can post.
8. **Forum moderation at launch:** who reviews reports? *Suggested:* the team, via a simple admin page.
9. **Receipt image retention:** keep images forever, or delete after the trip? *Suggested:* keep on device; delete from the server after 30 days.
10. **Dark mode** in v1?
11. **Languages:** English only, or English + Bahasa Malaysia?
12. **App name:** confirm ITER everywhere. The questionnaire file says "GGT".
13. **App-store commission:** absorb it, or raise store prices?

## 14. Suggested build order

1. **Scaffold:**
   - Expo + TypeScript, tab navigation.
   - Design tokens (§10).
   - Mock services, seed data (§11).
2. **Home + trip setup:** safe-to-spend, spent, remaining, status, bars.
3. **Manual entry + currency:**
   - Frankfurter rates, offline cache.
   - Currency tab with converter, rates and history.
4. **Scan backend:** Lambda + Secrets Manager + Haiku, strict JSON, validation, demo fallback.
5. **Receipt scan flow:** camera → reading → review → confirm, plus the offline queue.
6. **Tax refund:** TaxRule config (Japan), eligibility on review, tracker screen, departure reminder.
7. **Menu translate.**
8. **Community:** seeded feed, destination stats, trip summary sharing, posts, comments, likes, report and block.
9. **Plans + paywall** (simulated), trip history, end-of-trip summary.
10. **Polish:** launch animation, gradients, motion, demo controls, accessibility pass.
11. **Builds:** TestFlight + Play internal testing.
12. **Later:** full AWS backend (Cognito, RDS, S3, CDK), real forum backend, more tax-refund countries.

## 15. Sources to re-check before launch

- **Claude API pricing:** https://platform.claude.com/docs/en/about-claude/pricing
- **Claude vision (image token cost):** https://platform.claude.com/docs/en/build-with-claude/vision
- **Japan tax-free changes from 1 Nov 2026:** https://www.japan-guide.com/news/tax-free-shopping.html
- **Frankfurter API:** https://frankfurter.dev/
