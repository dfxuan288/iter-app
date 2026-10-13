# ITER

**Smarter journeys. Safer spends.** A travel money app for Malaysian travellers: safe-to-spend per day,
AI receipt scanning, tax refund tracking, live exchange rates and a community feed.

This is a **prototype**. It uses demo data and moves no real money.

| Folder | What it is |
|---|---|
| `mobile/` | The app (Expo + React Native + TypeScript), shipped as a web app you open in a phone browser |
| `server/` | The backend (Node.js + TypeScript), packaged with Docker. Holds the AI key and fetches exchange rates |
| `docs/` | The project brief, the decisions made since, and the design direction |

## Build status

| Phase | Status |
|---|---|
| 0. Foundations: project, checks, five-tab shell, backend in Docker | Done |
| 1. Money core and Home: safe-to-spend maths, demo trip, plan-a-trip flow | Done |
| 2. Currency and manual entry | Next |
| 3. Scan backend (AI) | |
| 4. Receipt scan flow | |
| 5. Tax refund | |
| 6. Menu translate | |
| 7. Community | |
| 8. Plans and Me | |
| 9. Polish | |
| 10. Deployment to the lecturer's server | |

## Run it on your computer

You need [Node.js](https://nodejs.org) 22 or newer. The first time, install the packages:

```bash
cd server
npm install
cd ../mobile
npm install
```

Then open **two terminals**.

Terminal 1, the backend:

```bash
cd server
npm run dev
```

Terminal 2, the app:

```bash
cd mobile
npm run web
```

The app opens at http://localhost:8081. Go to the **Me** tab: it should say **Connected**.

To see it at phone size on a laptop, press F12 in the browser and click the phone icon.

### Try it on your phone

Your phone and laptop must be on the same Wi-Fi. When `npm run web` starts it prints an address
such as `http://192.168.1.20:8081`; open that in the phone's browser.

The phone **camera** will not work this way, because browsers only allow the camera over HTTPS.
Camera testing on a phone is covered in the scanning phase.

## The API key

Receipt scanning and menu translation use the Anthropic API. The key lives **only on the server**.

1. Copy `.env.example` to a new file called `.env` in the same folder.
2. Paste the key after `ANTHROPIC_API_KEY=`.
3. Restart the backend.

`.env` is ignored by Git. Never commit it, paste it in a chat, or put a key anywhere in `mobile/`.

## Checks

Run these in both `mobile/` and `server/` before committing. GitHub runs the same checks
automatically on every push (see the **Actions** tab on GitHub).

```bash
npm run typecheck
npm run lint
npm test
```

## Run the backend with Docker

This is how the backend runs on the real server. You need Docker Desktop running.

```bash
docker compose up --build -d
```

Check it at http://localhost:8080/api/health, and stop it with:

```bash
docker compose down
```

## Deploy to the server

Full instructions arrive with Phase 10. In short, the server needs:

- Linux with Docker installed.
- A web address (domain or subdomain) pointing to it, with ports 80 and 443 open. The phone camera
  only works over HTTPS, and the deployment package sets up the HTTPS certificate automatically
  once the address exists.
- A `.env` file containing the Anthropic API key.

## Change prices, plan limits and tax rules

These are deliberately kept out of the screens, each in one config file:

| What | Where | Arrives in |
|---|---|---|
| Plan prices and free scan limits (placeholders) | `mobile/src/config/plans.ts` | Now |
| Safe-to-spend rules: which categories are essentials, the "spending fast" threshold, suggested split | `mobile/src/config/budget.ts` | Now |
| The demo date and the seeded exchange rates | `mobile/src/config/demo.ts` | Now |
| The demo trip and its expenses | `mobile/src/data/seed.ts` | Now |
| Destinations, their currencies and photos | `mobile/src/data/destinations.ts` | Now |
| Tax refund rules per country, each with a source link and "last verified" date | `mobile/src/config/taxRules.ts` | Phase 5 |
| Colours, spacing and type sizes | `mobile/src/theme/tokens.ts` | Now |

After changing one, run the checks above: the tests will tell you if a number no longer adds up.

## Working together

- `main` always works. Each phase is built on its own branch and merged when its checks pass.
- Get the latest changes before you start, and push when you finish.
- Work on different parts at the same time to avoid conflicts.
