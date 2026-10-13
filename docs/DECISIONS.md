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

## Still open

- Tagline: the brief says "Know what's safe to spend."; the logo sheet says "Smarter journeys.
  Safer spends." The app currently uses the brief's.
- Colours: the logo sheet uses #0B2A4A / #00B894; the brief's palette (§10) is used for the app UI.
- Server details from the lecturer: operating system, web address/HTTPS, and how we get access.
