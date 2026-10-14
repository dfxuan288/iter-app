# ITER

**Smarter journeys. Safer spends.** A travel money app for Malaysian travellers: safe-to-spend per day,
AI receipt scanning, tax refund tracking, live exchange rates and a community feed.

This is a **prototype**. It uses demo data and moves no real money.

| Folder | What it is |
|---|---|
| `mobile/` | The app (Expo + React Native + TypeScript), shipped as a web app you open in a browser |
| `api/` | The backend's endpoints. Vercel turns each file here into a web address under `/api/` |
| `backend/` | The backend's actual logic and tests. Holds the AI key and fetches exchange rates |
| `docs/` | The project brief, the decisions made since, and the design direction |

It is hosted on **Vercel** (the app and the backend) with **Supabase** for the backend's small
database, as recommended for the course.

## Build status

| Phase | Status |
|---|---|
| 0. Foundations: project, checks, five-tab shell, backend | Done |
| 1. Money core and Home: safe-to-spend maths, demo trip, plan-a-trip flow | Done |
| 2. Currency and manual entry: live rates, converter, history, add/edit/delete expenses | Done |
| 3. Scan backend (AI): receipt and menu reading, checks, limits, cache, demo samples | Done |
| 4. Receipt scan flow | Next |
| 5. Tax refund | |
| 6. Menu translate | |
| 7. Community | |
| 8. Plans and Me | |
| 9. Polish | |
| 10. Final deployment checks and demo rehearsal | |

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
| Plan prices and free scan limits (placeholders) | `mobile/src/config/plans.ts` | Now |
| Server-side daily scan limits that protect the AI bill | `backend/scan/limits.ts` | Now |
| Safe-to-spend rules: which categories are essentials, the "spending fast" threshold, suggested split | `mobile/src/config/budget.ts` | Now |
| The demo date and the seeded exchange rates | `mobile/src/config/demo.ts` | Now |
| The demo trip and its expenses | `mobile/src/data/seed.ts` | Now |
| Destinations, their currencies and photos | `mobile/src/data/destinations.ts` | Now |
| Tax refund rules per country, each with a source link and "last verified" date | `mobile/src/config/taxRules.ts` | Phase 5 |
| Colours, spacing and type sizes | `mobile/src/theme/tokens.ts` | Now |

After changing one, run the checks above: the tests will tell you if a number no longer adds up.

## Working together

- `main` always works, and is what the live site shows. Each phase is built on its own branch and
  merged when its checks pass.
- Get the latest changes before you start, and push when you finish.
- Work on different parts at the same time to avoid conflicts.
