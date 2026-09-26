# Open-source audit

What can be published from this repository, what must stay private, and the
result of scanning the full git history for secrets.

Audited at `561ebb7`. Live app:
**https://healthhubproapp.vercel.app** (also reachable at the longer
`health-hub-pro-advanced-health-monitoring-deathfire26s-projects.vercel.app`).

---

## 1. Stack and structure

| Layer  | What                                                                                        |
| ------ | ------------------------------------------------------------------------------------------- |
| Client | React 18, TypeScript, Vite 8 (Rolldown), Tailwind, Radix primitives, wouter, TanStack Query |
| Server | Express 4 exported as a **single** Vercel serverless function (`api/index.ts`)              |
| Data   | Drizzle ORM over Neon Postgres (HTTP driver), with a seeded in-memory fallback              |
| Auth   | HMAC-signed httpOnly `SameSite=Lax` cookies. Not JWT. CSRF by Content-Type check            |
| Tests  | Vitest (246 passing, 7 skipped) + Playwright (108, desktop and mobile)                      |
| Deploy | Vercel, `vercel.json` rewrites `/api/(.*)` to one function and everything else to the SPA   |

```
api/index.ts        the whole Express app as one function (Hobby caps at 12)
server/             routes, auth, insights engine, storage (Postgres + memory)
shared/             enums.ts · tables.ts (Drizzle) · schema.ts (Zod) · import.ts
client/src/         components/{ui,common,dashboard,layout,settings}, hooks, lib, pages
e2e/ test/          Playwright specs · Vitest suites
```

**Build on Vercel.** `buildCommand: npm run build` → `vite build` → `dist`.
The function is `api/index.ts` at `maxDuration: 15`, `memory: 1024`. Assets
under `/assets/` are served `public, max-age=31536000, immutable`; CSP, HSTS
and the other security headers are set in `vercel.json`.

**Environment variable names** (names only — no values appear anywhere in
this repository or its history):

| Name             | Required              | Purpose                                                              |
| ---------------- | --------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`   | no (prod: yes)        | Postgres. Unset → seeded in-memory storage and a "Demo mode" badge   |
| `SESSION_SECRET` | **yes in production** | Signs session cookies. ≥32 chars; the app refuses to boot without it |
| `PORT`           | no                    | Local API port, defaults to 5000                                     |
| `CORS_ORIGIN`    | no                    | Extra allowed origins; unnecessary on Vercel (same origin)           |
| `NODE_ENV`       | no                    | `test` disables the rate limiter for the E2E suite                   |

---

## 2. Classification

### CORE — stays private

Business logic, the API surface, and anything that describes the data model
or how a session is established.

| Path                                                                                          | Why                                                                                     |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `server/routes.ts`                                                                            | All 24 endpoints: the API surface itself                                                |
| `server/insights.ts`                                                                          | The rules engine — the product's actual differentiator                                  |
| `server/storage/*`                                                                            | Postgres and in-memory implementations, merge strategy, leaderboard derivation, seeding |
| `server/auth.ts`, `server/env.ts`, `server/app.ts`                                            | Cookie signing, CSRF, rate limiting, config gating                                      |
| `shared/tables.ts`                                                                            | Drizzle table definitions — the database schema                                         |
| `shared/schema.ts`                                                                            | Zod validators: a precise map of every request and response shape                       |
| `shared/import.ts`, `shared/enums.ts`                                                         | The import contract and the closed value sets it validates                              |
| `client/src/lib/api.ts`                                                                       | The client's API map — publishing it publishes the surface                              |
| `client/src/pages/*`                                                                          | Product flows, wired directly to the API                                                |
| `client/src/context/AuthContext.tsx`, `context/auth-context.ts`, `hooks/useAuth.ts`           | Auth internals                                                                          |
| `client/src/components/dashboard/LogActivityDialog.tsx`, `components/settings/ImportCard.tsx` | Call the API directly                                                                   |
| `client/src/components/layout/AppShell.tsx`                                                   | App-specific navigation; also calls `/api/health`                                       |
| `api/index.ts`, `vercel.json`, `drizzle.config.ts`                                            | Deployment and database wiring                                                          |

### SHAREABLE — published to the showcase

Everything below is presentational, generic, or a pure function. Each was
checked for imports of `@shared/*`, `@/lib/api` and `@/lib/queryClient`; the
three that import a _type_ are decoupled with a local declaration, and
nothing else needed changing.

| Group          | Files                                                                                                                   | Core coupling removed                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| UI primitives  | `alert` `avatar` `badge` `button` `card` `dialog` `dropdown-menu` `input` `label` `select` `skeleton` `toast` `toaster` | none                                                     |
| Common         | `ErrorBoundary`, `States` (loading / empty / error / offline)                                                           | none                                                     |
| Data display   | `ActivityChart`, `GoalRing`, `StatTile`                                                                                 | `ActivityStat` / `GoalProgress` types → local `types.ts` |
| Hooks          | `useCountUp`, `useTheme`, `useOnlineStatus`, `use-mobile`, `use-toast`                                                  | none                                                     |
| Utilities      | `format.ts` (+ tests), `utils.ts`                                                                                       | none                                                     |
| Import parsers | `import/aggregate.ts`, `import/appleHealth.ts`, `import/csv.ts` (+ tests)                                               | `ImportDay` type → local `types.ts`                      |
| Design tokens  | the token block of `index.css`                                                                                          | none                                                     |

**On the import parsers.** These are the one judgement call. They are format
adapters — "turn an Apple Health XML or a CSV into daily totals" — and carry
no health-domain rules, no thresholds and no product decisions. What makes
them worth publishing is the technique: 4 MB slice reads with a carry buffer
across chunk boundaries, verified by a test that pushes 5,000 records across
those boundaries and asserts the totals still sum exactly. The _contract_ they
feed (`shared/import.ts`, with its Zod validators and per-metric caps) stays
private; the showcase declares its own minimal `ImportDay`. If this reads as
too close to core, deleting `src/lib/import/` from the showcase removes it
cleanly — nothing else imports it.

### SENSITIVE — never public

- `DATABASE_URL` and `SESSION_SECRET` **values**. Held only in Vercel's
  environment; they have never been committed.
- No third-party personal data, resumes, uploaded documents or real user
  records exist in the repository or its history.
- `docs/screenshots/*` show the seeded demo account only. The seed is
  synthetic and deterministic; there is no real health data in it.
- The demo credentials (`demo` / `demo1234`) are already published in the main
  README on purpose — that account is the public demo. They are not a secret,
  but the showcase does not restate them.

---

## 3. Secret scan of the full git history

Two independent scanners over all **45 commits** and **375 blobs**, plus a
targeted pattern sweep.

| Tool                                         | Scope                                                           | Result                       |
| -------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| `gitleaks` v8 (`--log-opts=--all`)           | 39 commits, 2.64 MB                                             | **1 finding** (below)        |
| `trufflehog` (regex + entropy, mirror clone) | full history                                                    | **11 findings** (all benign) |
| Targeted regex over every blob               | AWS, GitHub, OpenAI, Slack, private keys, JWTs, real Neon hosts | **0 findings**               |

### Findings

| #   | File                 | Commit                                 | What it is                                                                                                                                                                                                         | Action                      |
| --- | -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| 1   | `server/storage.ts`  | `1d3b42f` (2025-03-14), also `61e4d91` | `password: "5e884898…"` — the **SHA-256 of the literal string `password`**, in seed data for a fictional `johndoe`. Confirmed by hashing: `printf 'password' \| sha256sum` matches exactly. File deleted long ago. | **None.** Not a credential. |
| 2   | `.env.example`       | `701c630`, `4ead872`                   | `postgresql://username:password@localhost:5432/…` — placeholder                                                                                                                                                    | None                        |
| 3   | `docs/DEPLOYMENT.md` | `b5b5d88`                              | `postgresql://user:pass@host/db` — placeholder in documentation                                                                                                                                                    | None                        |
| 4   | `package-lock.json`  | 6 commits                              | npm `integrity` hashes flagged as high-entropy                                                                                                                                                                     | None                        |

**Nothing needs rotating.** No live credential has ever been committed.

The one thing worth knowing: finding #1 means an unsalted SHA-256 of a common
password sits in reachable history. It authenticates nothing — that code path
is gone and the app has used bcrypt at cost 10 since — but if the history is
ever made public it is a small "this project once hashed passwords badly"
signal. The showcase gets a **fresh history**, so it does not inherit this.

### Reproducing the scan

```bash
go install github.com/zricethezav/gitleaks/v8@latest
gitleaks detect --source . --log-opts="--all" --redact --report-format json

pip install trufflehog
git clone --mirror . /tmp/hist.git
trufflehog --regex --entropy=True --json /tmp/hist.git
```

---

## 4. What the showcase publishes, and what it proves

A standalone component library plus a one-command Vite playground running on
**synthetic data only**. It carries no API client, no schema, no server code
and no database access, so it cannot leak the product surface even by
accident.

What it is meant to demonstrate, each backed by something a reader can run:

1. **A hand-rolled chart that replaced Recharts** — 371 kB raw / 99 kB gzipped
   down to 5.68 kB / 2.11 kB, with the same five metrics, ranges, goal line,
   peak emphasis and table view.
2. **Chunk-safe streaming parsers** for Apple Health XML and CSV, with the
   boundary test that proves it.
3. **A WCAG-AA design system** in both themes, with the contrast figures
   computed rather than eyeballed.
4. **Tests that found real bugs** — including a chart that rendered zero-width
   bars while 90 tests passed over it.

---

## 5. Where the showcase lives

Repository creation through the GitHub integration available to this session
returned `403`, so the showcase was built the fallback way: on an **orphan
branch** in this repository.

- Branch: **`showcase`**
- History: **one commit, zero shared ancestry** with `main`. `git log showcase`
  shows a single root commit; nothing from this repository's 45 commits is
  reachable from it.
- 73 files, 10,593 lines. No `node_modules`, no build output, no `.env`.

Moving it into its own public repository is a five-command job and is listed in
the handoff notes. Until then, the branch is self-contained: cloning it with
`--single-branch --branch showcase` yields a repository with no trace of the
application.

### Verification performed on a clean clone

Cloned fresh from `origin/showcase` into an empty directory, with no cached
`node_modules`:

| Check                                     | Result                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                  | 355 packages, **0 vulnerabilities**                                                                                           |
| `npm run lint` (ESLint 9, flat config)    | clean                                                                                                                         |
| `npm run typecheck` (`tsc --noEmit`)      | clean                                                                                                                         |
| `npm test` (Vitest)                       | **82 passed** in 4 files                                                                                                      |
| `npm run build`                           | `dist/index.js` 65.19 kB, gzip **18.59 kB**                                                                                   |
| `gitleaks detect` over the branch history | **no leaks found**                                                                                                            |
| `trufflehog --regex --entropy=True`       | 378 hits, **all 378** matched, string for string, against the `"integrity"` digests in `package-lock.json` — zero unaccounted |

### One fix that came back into this repository

Measuring contrast for the showcase's design-system section surfaced a real
WCAG failure in the shared button:

```
danger: 'bg-danger text-white hover:bg-danger/90'
```

In the dark theme `--danger: 353 76% 62%` carries white text at **3.56:1**,
below the 4.5:1 AA threshold for body text. It had gone unnoticed because
nothing in the app renders `variant="danger"` — the failure is latent, not
visible.

Fixed in both places by giving the token its own ink colour rather than
assuming white:

- `client/src/index.css` — `--danger-ink: 220 30% 8%;` (dark, 5.25:1) and
  `--danger-ink: 0 0% 100%;` (light, where the red is dark enough for white)
- `tailwind.config.ts` — `danger` becomes `{ DEFAULT, ink }`
- `client/src/components/ui/button.tsx` — `text-white` → `text-danger-ink`

Because no component uses the variant, this changes nothing that currently
renders; it removes a trap for whoever reaches for it first.
