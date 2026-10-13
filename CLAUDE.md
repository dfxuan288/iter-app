# ITER

Travel money app prototype for a Monash University FinTech team. The owners are not professional
developers: explain things in plain language and say clearly when they must do something themselves.

## Read first

- `docs/PROJECT_BRIEF.md` — the product brief (source of truth).
- `docs/DECISIONS.md` — later decisions that override the brief, and what is still open.
- `README.md` — how to run, test and deploy.

## Layout

- `mobile/` — Expo + React Native + TypeScript app, shipped as a web app (PWA). Routes in
  `mobile/src/app/`. See `mobile/AGENTS.md`: Expo APIs change every SDK, check the versioned docs.
- `server/` — Node.js + TypeScript (Fastify) backend, packaged with Docker.
- `docker-compose.yml`, `.env.example` — deployment.

## Rules

- TypeScript strict. Small reusable components. Design tokens come from `mobile/src/theme/tokens.ts`.
- **AI reads, code calculates.** All money maths lives in pure functions with unit tests. Money is
  stored as integers in minor units with its currency.
- Pricing and plan limits are placeholders kept in one config file. Tax rules are config with a
  `lastVerified` date. Never hard-code either in screens.
- Secrets live only in the server's `.env`. Never put a key in `mobile/` or commit one.
- Never crash and never lose user data: network calls return typed results (`mobile/src/services/http.ts`).
- Accessibility: WCAG AA contrast, 44pt touch targets, screen-reader labels.
- All data access from screens goes through `mobile/src/services/`.

## Workflow

- One branch per build phase (`phase-N-name`), merged into `main` when it works.
- Before committing, in both `mobile/` and `server/`: `npm run typecheck`, `npm run lint`, `npm test`.
