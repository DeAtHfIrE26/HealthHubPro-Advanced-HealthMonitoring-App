# Deployment

## Status

**Live:** https://health-hub-pro-advanced-health-monitoring-deathfire26s-projects.vercel.app

Both prerequisites are done — `SESSION_SECRET` is set for Production, Preview and Development, and Vercel Authentication is disabled, so the URL is publicly reachable. `GET /api/health` returns `{"status":"ok","persistent":false}`.

`persistent: false` means no database is attached: the app runs on seeded in-memory storage and shows a `Demo mode` badge. Adding `DATABASE_URL` (see below) makes it persistent with no code change.

---

## Existing Vercel project

|                   |                                                                              |
| ----------------- | ---------------------------------------------------------------------------- |
| Project           | `health-hub-pro-advanced-health-monitoring-app`                              |
| Team              | `deathfire26s-projects`                                                      |
| Production domain | `health-hub-pro-advanced-health-monitoring-deathfire26s-projects.vercel.app` |
| Git integration   | Connected to this repository; pushes deploy automatically                    |

> Historical note: every one of the ten deployments made before this work failed with `Command "npm run build" exited with 2` — 65 TypeScript errors. That build is now green.

---

## Step 1 — Set `SESSION_SECRET`

Generate a value:

```bash
openssl rand -base64 32
```

In the Vercel dashboard: **Project → Settings → Environment Variables → Add New**

| Field        | Value                            |
| ------------ | -------------------------------- |
| Key          | `SESSION_SECRET`                 |
| Value        | _(the generated string)_         |
| Environments | Production, Preview, Development |
| Type         | Sensitive                        |

Or with the CLI:

```bash
npx vercel env add SESSION_SECRET production
```

This signs session cookies. It must be at least 32 characters. **Changing it later signs every existing user out** — that is the only consequence, and it is safe to rotate.

## Step 2 — Disable Vercel Authentication

**Project → Settings → Deployment Protection → Vercel Authentication → Disabled → Save**

Without this the production URL asks visitors to log in to Vercel, which defeats the point of a public portfolio demo.

## Step 3 — Deploy

Pushing to the default branch deploys to production automatically. To deploy manually:

```bash
npx vercel --prod
```

## Step 4 — Verify

```bash
curl -s https://<your-domain>/api/health
# Expected: {"status":"ok","persistent":false,"time":"..."}
```

- `persistent: false` → in-memory storage; data resets on redeploy and the UI shows a `Demo mode` badge.
- `persistent: true` → Postgres is connected.

A 503 naming `SESSION_SECRET` means step 1 has not taken effect — redeploy after adding the variable, since environment changes only apply to new deployments.

Then run the full end-to-end suite against the live site:

```bash
BASE_URL=https://<your-domain> npm run test:e2e
```

---

## Optional — persistent data with Neon

Without a database the app is fully functional but resets whenever the serverless instance recycles. To make data persist:

1. Create a free project at [neon.com](https://neon.com) — no card required.
2. Copy the connection string (it looks like `postgresql://user:pass@host/db?sslmode=require`).
3. Add it to Vercel as `DATABASE_URL` for Production, Preview and Development.
4. Redeploy.

No code change is needed. The app detects the variable, creates its schema on first boot, and seeds demo data only if the `users` table is empty. The `Demo mode` badge disappears on its own.

Vercel's Neon integration (**Storage → Create Database → Neon**) does the same thing and sets the variable for you.

---

## Free-tier limits in play

Figures verified against provider documentation on 2026-09-20. Limits change — re-check before relying on them.

### Vercel Hobby

| Limit                               | Value                           | Relevance here                                                                                                               |
| ----------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Serverless Functions per deployment | **12**                          | **The binding constraint.** This API has ~20 routes, so it mounts as one function. Splitting per route would fail the build. |
| Function duration                   | 60s, or 300s with Fluid Compute | Not close — the slowest path is a cold start with seeding.                                                                   |
| Bandwidth                           | 100 GB/month                    | Not close for a portfolio demo.                                                                                              |
| Build execution                     | 6,000 minutes/month             | Builds take ~2 minutes.                                                                                                      |
| Deployments                         | 100/day                         | Not close.                                                                                                                   |
| **Commercial use**                  | **Prohibited**                  | Hobby is personal use only. A portfolio project qualifies; a product does not.                                               |

### Neon free plan

| Limit         | Value                | Relevance here                                                                                                                                                 |
| ------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage       | 0.5 GB per project   | The seed dataset is a few hundred kilobytes.                                                                                                                   |
| Compute       | 100 CU-hours/month   | Ample for demo traffic.                                                                                                                                        |
| Scale to zero | After 5 minutes idle | **The tradeoff:** a demo left alone for a week has a ~1s cold start on the first request. Skeleton states cover it. Projects are _not_ deleted for inactivity. |

---

## Operational notes

**Cold starts.** The first request to an idle deployment pays for module load plus, in memory mode, seeding — which includes a bcrypt hash at cost 10. Expect roughly a second. Subsequent requests are fast.

**Rate limiting is best-effort.** `express-rate-limit` keeps its counter in process memory. Serverless instances do not share it, and Vercel's proxy can place many users behind one IP. It slows a burst against a single warm instance; it is not a global quota. Treat it as a brake, not a guarantee.

**In-memory storage and serverless.** Without `DATABASE_URL`, each instance holds its own copy of the seed. Two browser tabs may be served by different instances and see slightly different mutations. Fine for a demo, which is why the badge is shown — not fine for real use, which is what `DATABASE_URL` is for.

**Fonts.** Space Grotesk and Inter load from Google Fonts with a non-blocking `<link>`. If the CDN is unreachable the app falls back to the system stack and stays fully usable.

---

## Redeploying from scratch

```bash
npm ci
npm run verify          # lint, typecheck, test, build
npx vercel --prod
```

`npm ci` needs no special environment variables. The previous dependency set required `CYPRESS_INSTALL_BINARY=0` and `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to install at all; both of those packages are gone.
