# ITER

Travel money app prototype for a Monash University FinTech team. The owners are not professional
developers: explain things in plain language and say clearly when they must do something themselves.

## Read first

- `docs/PROJECT_BRIEF.md` — the product brief (source of truth).
- `docs/DECISIONS.md` — later decisions that override the brief, and what is still open.
- `docs/DESIGN.md` — the visual direction and its rules. Follow it for every screen.
- `README.md` — how to run, test and deploy.

## Layout

- `mobile/` — Expo + React Native + TypeScript app, shipped as a web app (PWA). Routes in
  `mobile/src/app/`. See `mobile/AGENTS.md`: Expo APIs change every SDK, check the versioned docs.
- `api/` — one thin file per backend endpoint; Vercel turns each into `/api/<name>`.
- `backend/` — the backend's logic, route table, local dev server and tests (Node.js + TypeScript).
  Adding an endpoint means: a handler in `backend/handlers`, an entry in `backend/routes.ts`, a file in `api/`.
- Hosting: Vercel (app + functions, see `vercel.json`) and Supabase (scan counter, rate cache).

## Rules

- TypeScript strict. Small reusable components. Design tokens come from `mobile/src/theme/tokens.ts`.
- **AI reads, code calculates.** All money maths lives in pure functions with unit tests. Money is
  stored as integers in minor units with its currency.
- Pricing and plan limits are placeholders kept in one config file. Tax rules are config with a
  `lastVerified` date. Never hard-code either in screens.
- Secrets live only in Vercel's environment variables and the local `.env`. Never put a key in `mobile/` or commit one.
- Never crash and never lose user data: network calls return typed results (`mobile/src/services/http.ts`).
- Accessibility: WCAG AA contrast, 44pt touch targets, screen-reader labels.
- All data access from screens goes through `mobile/src/services/` and `mobile/src/state/AppDataProvider.tsx`.
- Calculations live in `mobile/src/domain/` (pure, tested). Tunable numbers live in `mobile/src/config/`.
- "Today" comes from `mobile/src/config/demo.ts` (a fixed demo date), never from `new Date()` in screens.

## Workflow

- One branch per build phase (`phase-N-name`), merged into `main` when it works.
- Before committing, in both the repo root (backend) and `mobile/`: `npm run typecheck`, `npm run lint`, `npm test`.
