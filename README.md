# ITER

**Smarter journeys. Safer spends.** A travel money app for Malaysian travellers: safe-to-spend per day,
AI receipt scanning, tax refund tracking, live exchange rates and a community feed.

This is a **prototype**. It uses demo data and moves no real money.

| Folder | What it is |
|---|---|
| `mobile/` | **Frontend**: the app (Expo + React Native + TypeScript), shipped as a web app you open in a browser |
| `api/` | **Backend** endpoints. Vercel turns each file here into a web address under `/api/` |
| `backend/` | **Backend** logic and tests. Holds the AI key and fetches exchange rates |
| `supabase/` | The backend database's tables (rate cache, scan limits, scan cache) |
| `website/` | The ITER marketing website |
| `docs/` | The project brief, the decisions made since and the design direction |
| `plan.txt` | System design and logic overview, and the step-by-step build plan |
| `built.txt` | What was built at each step, compared with the plan |
| `requirements.txt` | Every dependency, and what it is for |

It is hosted on **Vercel** (the app and the backend) with **Supabase** for the backend's small
database, as recommended for the course.

## Architecture

- **Frontend (`mobile/`)**: screens in `src/app/` read and change data through `src/state/` and
  `src/services/`. All money maths lives in `src/domain/` as small pure functions with unit tests.
  The traveller's trips, expenses and receipt photos are saved on their own phone.
- **Backend (`api/` + `backend/`)**: five endpoints: `health`, `rates`, `rate-history`,
  `scan-receipt` and `scan-menu`. They call Claude (Anthropic) to read receipts and menus,
  Frankfurter for exchange rates, and Supabase to cache rates and count scans.
- **Main rule: AI reads, code calculates.** The AI only copies what is printed. Every conversion
  and total is worked out by tested code.

See `plan.txt` for the full design, with a diagram.

## Technologies used

| Part | Technology |
|---|---|
| Language | TypeScript (strict), on Node.js |
| Frontend | Expo SDK 57, React Native 0.86, React 19, React Native Web, Expo Router, Reanimated, react-native-svg |
| Backend | Node.js serverless functions on Vercel, Anthropic SDK, Zod (checks AI answers), Sharp (checks photos) |
| AI | Claude Haiku 5.5 reads receipts and menus; Claude Sonnet 5.5 takes a second look when unsure |
| Data | Supabase (Postgres); AsyncStorage on the phone; Frankfurter exchange rates |
| Testing | Jest (app), Vitest (backend), ESLint, TypeScript checks, GitHub Actions |
| Tools | Git and GitHub, Claude Code (AI coding assistant) |

## Testing, and how AI helped

- **289 app tests and 59 backend tests**, plus type checks and linting, run before every commit and
  automatically on GitHub on every push (**Actions** tab).
- Each money rule (safe to spend, warnings, conversions, tax
  refund eligibility, menu prices with tax and service, plan days) has tests with worked examples.
- **AI assistance:** the team used Claude Code, an AI coding assistant, in place of GitHub Copilot. It
  wrote the unit tests alongside the code, ran all the checks before each change, and opened the app
  in a browser to click through each flow (scanning, saving, overspending). It also ran a real AI scan
  on the live site and checked that no secret keys reach the app.
- Bugs found by the team's own testing were turned into tests before being fixed, so they cannot come
  back. One example: changing the app date to day 1 used to count later expenses.

## Build status

| Phase | Status |
|---|---|
| 0. Foundations: project, checks, five-tab shell, backend | Done |
| 1. Money core and Home: safe-to-spend maths, demo trip, plan-a-trip flow | Done |
| 2. Currency and manual entry: live rates, converter, history, add/edit/delete expenses | Done |
| 3. Scan backend (AI): receipt and menu reading, checks, limits, cache, demo samples | Done |
| 4. Receipt scan flow: photo or sample, review with highlighted fields, save, offline waiting list | Done |
| 5. Tax refund: Japan rules as config, eligibility on every receipt, tracker, checklist, reminder | Done |
| 6. Menu translate: dishes in English, Ringgit prices with tax and service, pork and alcohol flags, log your order | Done |
| 7. Community: typical trip per destination, feed, likes, comments, report and block, share your trip | Done |
| 8. Plans and Me: free trial, Day Pass, 7-Day Pass (purchases simulated), free version, My plan | Done |
| 9. Polish: launch animation, welcome screens, motion, Trip Wrapped, demo receipt photos, accessibility pass | Done |
| 10. Final deployment checks and demo rehearsal: live smoke test, real AI scan, security check, offline check | Done |

## Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer. The first time, install the packages (run
these in the project folder):

```bash
npm install
```

```bash
npm --prefix mobile install
```

Then open **two terminals** in the project folder.

Terminal 1, the backend:

```bash
npm run dev:api
```

Terminal 2, the app:

```bash
npm --prefix mobile run web
```

The app opens at http://localhost:8081. Go to the **Me** tab: it should say **Connected**.

To see it at phone size on a laptop, press F12 in the browser and click the phone icon.

## The live site (Vercel)

Vercel watches the GitHub repository. Every push to `main` is built and published automatically
to the project's `https://….vercel.app` address, which works on any phone. Pushes to other
branches get their own preview address, so work in progress can be checked before it is merged.

The settings Vercel needs are in `vercel.json`; nothing has to be configured by hand except the
secret keys below.

**Put it on a phone like an app**: open the live address on the phone, then tap **Download ITER** (Home or Me).
On Android it installs straight away; on iPhone, in Safari, tap Share, then "Add to Home Screen". Opened from the home
screen it runs full screen, without the browser's bars. If you added it before 16 Oct 2026, remove the old icon and
add it again to get full screen.

### Secret keys

Receipt scanning and menu translation use the Anthropic API, and the daily exchange rates are
stored in Supabase. Both keys live **only on the server**. `.env.example` explains where to find each.

- **Live site:** Vercel -> the project -> Settings -> Environment Variables. Add
  `ANTHROPIC_API_KEY`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, then redeploy.
- **Your own computer:** copy `.env.example` to a new file called `.env` in the same folder, paste
  the key after `ANTHROPIC_API_KEY=`, and restart the backend.

`.env` is ignored by Git. Never commit it, paste a key in a chat, or put a key anywhere in `mobile/`.

## How scanning works

The app sends a photo to `/api/scan-receipt` or `/api/scan-menu`. The backend:

1. Turns away anything that is not a JPEG, PNG or WebP photo under 3 MB.
2. Answers straight from the **cache** if the exact same photo was read before (free and instant).
3. Counts the scan against the **daily limits** in `backend/scan/limits.ts` (per phone, and for everyone together).
4. Asks **Claude Haiku 5.5** to copy what is printed, as strict JSON. Code then checks it: items must add up to
   the subtotal, subtotal plus tax and service to the total, the currency must be supported, and the date should fall
   within the trip. If Haiku is unsure or the numbers do not add up, **Claude Sonnet 5.5** takes a second look.
5. For the demo sample photos in `mobile/assets/samples/`, if the AI cannot be reached it answers with the
   sample's printed contents (`backend/scan/samples.ts`), so a demo never breaks.

The AI only reads. It never converts currencies or works out money; the app's code does that.

To try a photo against a running backend (each new photo uses one real scan, a fraction of a sen):

```bash
npx tsx scripts/try-scan.ts http://localhost:8080 receipt mobile/assets/samples/receipt-drugstore-ginza.jpg
```

The sample photos are drawn by `scripts/make-samples.ts`. If you change one, change `backend/scan/samples.ts` to match.

## Checks

Run these in the project folder (for the backend) and again in `mobile/` (for the app) before
committing. GitHub runs the same checks automatically on every push (see the **Actions** tab).

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

## Change prices, plan limits and tax rules

These are deliberately kept out of the screens, each in one config file:

| What | Where | Arrives in |
|---|---|---|
| Plans: free trial length and its daily scans, pass prices and days, the "Every plan includes" list, how long unused passes last | `mobile/src/config/plans.ts` | Now |
| Server-side daily scan limits that protect the AI bill | `backend/scan/limits.ts` | Now |
| Safe-to-spend rules: the "spending fast" threshold and the suggested split | `mobile/src/config/budget.ts` | Now |
| The demo date and the seeded exchange rates | `mobile/src/config/demo.ts` | Now |
| The demo trip and its expenses | `mobile/src/data/seed.ts` | Now |
| The sample community: travellers, trip summaries, posts and comments | `mobile/src/data/communitySeed.ts` | Now |
| Destinations, their currencies and photos | `mobile/src/data/destinations.ts` | Now |
| "Somewhere else?" countries and every currency's name, symbol and decimals (generated: edit the list in the script, then run `npx tsx scripts/make-currencies.ts`) | `scripts/make-currencies.ts` | Now |
| Tax refund rules per country, each with a source link and "last verified" date (including the handling fee placeholder) | `mobile/src/config/taxRules.ts` | Now |
| Colours, spacing and type sizes | `mobile/src/theme/tokens.ts` | Now |

After changing one, run the checks above: the tests will tell you if a number no longer adds up.

## Working together

- `main` always works, and is what the live site shows. Each phase is built on its own branch and
  merged when its checks pass.
- Get the latest changes before you start, and push when you finish.
- Work on different parts at the same time to avoid conflicts.
