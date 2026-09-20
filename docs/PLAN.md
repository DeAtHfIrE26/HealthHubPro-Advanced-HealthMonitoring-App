# HealthHubPro — Phase 1 Plan

**Date:** 2026-09-20
**Branch:** `claude/festive-babbage-oze5t4` (restarted from `main` @ `2a831c5` after PR #1 merged)
**Decisions:** all Phase 0 defaults accepted (see `docs/AUDIT.md` §10)

---

## Decisions locked

| # | Decision |
|---|---|
| 1 | Ship **Dashboard, Workouts, Challenges, AI Insights** + auth. **Nutrition is cut** — no data model, no API, no seed data behind it |
| 2 | Recommendations are a **deterministic rules engine** over the user's real stats, labelled in-UI as *"Rule-based insights"*. No OpenAI dependency |
| 3 | **No WebSockets.** TanStack Query polling (5 s) on the challenge leaderboard |
| 4 | **Postgres-first with a seeded in-memory fallback** — see "Resolving #4" below |
| 5 | **Vercel SSO protection will be disabled** on the project so the URL is publicly viewable |
| 6 | Seeded **`demo` / `demo1234`** account, credentials on the login screen, one-click "Try the demo", 30 days of realistic data |
| 7 | Delete all §8 junk incl. `attached_assets/`, `k8s/`, load-test configs, unused deps |
| 8 | README rewritten from scratch; claim only what runs |
| 9 | Small commits on this branch; **open a new PR** (PR #1 is merged and cannot track new work) |
| 10 | Add GitHub Actions CI: lint + typecheck + test + build |
| 11 | Stay Node/React |

### Resolving #4 without blocking on a credential

You accepted "Neon + Drizzle", but the connection string is the one thing I can't self-serve, and I'm not going to provision a marketplace integration on your account without asking.

So the data layer ships as **one `Storage` interface with two implementations**:

- **`PostgresStorage`** — Drizzle + `@neondatabase/serverless`. Used automatically when `DATABASE_URL` is set.
- **`MemoryStorage`** — the same interface over a seeded in-memory dataset. Used when it isn't.

This means I deliver a fully working live URL now, and the moment you paste a Neon URL into Vercel's env vars it becomes persistent **with zero code change**. When memory-backed, the app shows an honest `Demo mode — data resets on redeploy` badge in the header rather than pretending otherwise. Both paths are covered by the same integration tests.

Send me a Neon connection string whenever you like and I'll switch it over and re-verify.

---

## Architecture & deployment target

**Vercel, single project, one serverless function.** Two constraints drove this:

1. **Hobby allows max 12 Serverless Functions per deployment.** The API has 26 routes — as individual `/api/*.ts` files that's an instant build failure.
2. Vercel **officially supports exporting an Express app as a function's default export** (`export default app` under `"type": "module"`).

So: `api/index.ts` mounts the whole Express app as **one** function; `vercel.json` rewrites `/api/(.*)` to it and everything else to `/index.html` for the SPA. Total functions: **1**. All existing route logic is preserved rather than rewritten.

```
┌────────────────────┐   /(.*)          ┌──────────────────────┐
│  Vercel Edge/CDN   ├─────────────────►│  dist/ (Vite SPA)    │
│                    │   /api/(.*)      ├──────────────────────┤
│                    ├─────────────────►│  api/index.ts        │
└────────────────────┘                  │  (Express, 1 fn)     │
                                        └──────────┬───────────┘
                                                   │ Storage iface
                                        ┌──────────▼───────────┐
                                        │ PostgresStorage      │  DATABASE_URL set
                                        │ MemoryStorage (seed) │  otherwise
                                        └──────────────────────┘
```

**Rejected:** migrating to Next.js — a framework rewrite that buys nothing here and throws away the working Vite + shadcn setup.

### Tooling swaps (one line each)

- **Jest → Vitest.** Jest's config is already broken under ESM; Vitest is native ESM, reuses `vite.config.ts`, and drops `ts-jest` entirely.
- **Cypress → Playwright.** Cypress's postinstall breaks `npm ci`; Playwright is already present in this environment and runs headless against both local and production URLs.
- **ESLint 9 flat config + Prettier.** Currently neither is installed despite `npm run lint` claiming otherwise.

---

## Design direction

Deliberately **not** default-shadcn. A fitness dashboard is a data instrument; it should read like one.

- **Canvas:** dark-first. Near-black `#0B0C0E` ground, elevated `#141618` cards, hairline `#232629` borders. Light theme ships too, toggled and persisted.
- **Colour:** exactly **one** accent — a vivid lime (`#B8F84A`) reserved for progress, positive delta and primary action. Amber for at-risk, muted rose for negative. Accent never used on chrome, only on data. This restraint is the whole look.
- **Type:** **Space Grotesk** for headings and all numerals (geometric, tabular figures — essential when metrics update in place and must not jitter), **Inter** for body and UI. Both Google Fonts, both free. Type scale 12/14/16/20/28/40, tight tracking on display sizes.
- **Space & shape:** 4 px base, 8 px rhythm, 24–32 px section gaps. 12 px card radius, 8 px controls — softer than shadcn's default.
- **Motion:** 150–200 ms ease-out on hover/state. One staged fade-up on first dashboard paint; stat values count up once on mount; progress rings sweep from zero. All of it behind `prefers-reduced-motion`.
- **States, treated as first-class:** skeletons that match the final layout (never spinners), empty states with one clear action, inline error cards with a working Retry, optimistic updates when logging activity, and a real offline banner.
- **First screen hardest:** the login screen carries the demo credentials and the one-click demo button, and the dashboard's first paint is the thing that gets judged in 90 seconds.

---

## Work items

Each item = intent · files touched · how I verify it. Ordered; I run them top to bottom.

### Phase 2 — Hygiene & safety

**1. Purge junk, fix `.gitignore`**
Remove `generated-icon.png`, `replit_agent/`, `attached_assets/`, `k8s/`, `nginx-load-balancer.conf`, `k6-load-test.js`, `artillery-*`, `cypress/`, `cypress.config.ts`, `theme.json`. Add `dist/`, `.vercel/`, `coverage/`, `.env.local`, `.env.*.local`, `*.log`, `.DS_Store`, editor dirs.
*Verify:* `git status` clean; `rg` finds no remaining references to any removed path.

**2. Dependency purge + clean lockfile**
Drop `@tensorflow/tfjs`, `openai`, `redis`, `@influxdata/influxdb-client`, `sequelize`, `sequelize-typescript`, `pg`, `pg-hstore`, `passport`, `passport-local`, `framer-motion`, `puppeteer`, `artillery`, `k6`, `msw`, `@replit/*`, `bootstrap` CDN refs. Add `vitest`, `@playwright/test`, `eslint`, `prettier`, `bcryptjs` (already present, now actually used).
*Verify:* `npm ci` succeeds **with no env-var workarounds**; `npm audit` high/critical count reported before and after; `node_modules` size before and after.

**3. Real tooling: lint, format, typecheck**
ESLint 9 flat config + Prettier + `tsconfig` split (`tsconfig.json` base, `tsconfig.server.json`, client via Vite). Fix `moduleResolution` so the ESM extension errors stop being a class of bug. Add `.nvmrc` and `engines`.
*Verify:* `npm run lint`, `npm run format:check`, `npm run typecheck` all exit 0 — the first time any of them ever has.

### Phase 3 — Make it run

**4. Fix the server: 65 TS errors → 0**
Correct ESM import specifiers, type the `never[]` seed arrays properly, resolve `@shared/*`, remove the `../vite.config` import from `server/vite.ts`.
*Verify:* `npm run typecheck` exits 0; `npm run build` exits 0.

**5. Consolidate three persistence layers into one**
Delete `server/storage_db.ts`, `server/db/`, `server/db/mock.ts`, `server/influxdb.ts`, `server/redis.ts`, `server/tensorflow.ts`. Introduce `server/storage/index.ts` (interface), `server/storage/postgres.ts`, `server/storage/memory.ts`, `server/storage/seed.ts`. Drizzle schema moves into `shared/schema.ts` as real tables alongside the Zod validators.
*Verify:* integration tests (item 13) run green against **both** implementations.

**6. Make the React app the actual app**
Rewrite `client/index.html` as a real Vite entry (root div + `main.tsx`). Write the missing modules: `lib/queryClient.ts`, `lib/utils.ts`, `types/index.ts`, `context/AuthContext.tsx`, `hooks/useAuth.ts`, `hooks/use-mobile.ts`. Delete the vanilla Bootstrap page and `server/vite.ts`.
*Verify:* `vite build` transforms **hundreds** of modules, not 2; app boots and renders locally.

### Phase 4 — Build it out

**7. Real authentication**
bcrypt hashing (replacing unsalted SHA-256), httpOnly signed-cookie sessions, server-side route guards that actually reject, ownership checks on `PATCH /users/:id`, Zod validation on every mutating route, `SESSION_SECRET` required in production with no fallback literal, scoped CORS, real CSRF enforcement.
*Verify:* integration tests assert 401 on missing auth and 403 on cross-user access — both currently pass through.

**8. Write the five pages**
`Login`, `Register` (both from scratch — corrupted, unrecoverable), `Dashboard`, `Workouts`, `Challenges`, `AIInsights`, `NotFound`. Rules-based recommendation engine in `server/insights.ts`.
*Verify:* manual click-through of every control; E2E specs in item 14.

**9. Design pass + states + responsive + a11y**
Apply the design direction above. Skeletons, empty, error, offline, 404, validation, long-text and missing-image handling. Real 360 px / tablet / desktop layouts. Semantic HTML, keyboard nav, visible focus rings, labelled inputs, alt text, contrast.
*Verify:* Playwright screenshots at 360/768/1280; keyboard-only traversal of every page; axe-core accessibility scan in the E2E suite; console asserted clean.

**10. Demo mode**
Seed `demo`/`demo1234` with 30 days of activity, joined challenges, completed sessions. Credentials shown on the login screen; one-click "Try the demo" button. Honest demo-mode badge when memory-backed.
*Verify:* E2E test that lands on `/login` and reaches a populated dashboard in one click, with no credentials typed.

### Phase 5 — Testing

**11. Unit tests** — rules engine, validation schemas, date/stat utils, formatters. Edge cases: empty, null, zero, negative, huge, malformed, unicode, boundary.
**12. Integration tests** — every one of the 26 routes: happy path, bad input, unauthorised, not-found, and storage-layer failure. Run against both storage implementations.
**13. E2E (Playwright, headless)** — register → login → log activity → browse/filter workouts → start & complete a session → join challenge → view leaderboard → read insights → logout. Plus back/forward, refresh mid-flow, deep links, double-submit, rapid clicking.
*Verify:* `npm test` green; coverage reported honestly (no invented threshold I can't hit); `docs/TESTING.md` records what's covered, what passed, and what I couldn't test and why.

### Phase 6 — Deploy

**14. Vercel wiring**
`api/index.ts` single-function entry, `vercel.json` (rewrites, Node 22, function config), build/output settings, env vars scoped per environment, preview deploys on PRs. **Disable SSO protection.**
*Verify:* production build succeeds — the first time in this project's history — and the deployment reaches `READY`, not `ERROR`.

**15. GitHub Actions CI**
`.github/workflows/ci.yml`: install → lint → typecheck → test → build on push and PR.
*Verify:* green check on the new PR.

### Phase 7 — Verify live

**16.** Re-run the full E2E suite **against the production URL**. Manually exercise every page on desktop and a mobile viewport. Check env resolution, DB connection, auth, CORS, HTTPS, favicon, page titles, OG/meta tags, cold-cache first load. Fix → redeploy → re-verify until clean.

### Phase 8 — Handoff

**17.** README rewritten for recruiter + developer (pitch, live link, demo credentials, screenshots, features, architecture, stack rationale, setup, env vars, testing, deployment). `docs/DEPLOYMENT.md`. Open the new PR.

---

## What I will not do

- Claim OpenAI, TensorFlow, Redis, InfluxDB, Kubernetes or microservices anywhere in the repo.
- Report a number I didn't measure — no invented benchmarks, no coverage percentage I didn't hit.
- Rewrite git history or force-push.
- Provision any paid resource, or any account-level resource, without asking first.
- Mark a phase done without running the verification listed against it.

## Known risks

1. **Phase 4 item 8 is a green-field build**, not a repair — seven pages from scratch. It's the bulk of the work and the most likely place to run long.
2. **No `DATABASE_URL` yet**, so the live demo starts memory-backed and resets on redeploy. Honest, labelled, and a one-env-var fix whenever you send the string.
3. **Vercel Hobby is non-commercial** — fine for a portfolio, worth knowing if this ever becomes a product.

---

**Ready for your go-ahead.** After that I run to completion without checking in unless genuinely blocked.
