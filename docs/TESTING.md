# Testing

**166 unit and integration tests + 58 end-to-end tests.** All passing as of 2026-09-20.

```bash
npm test          # 166 passed, 7 skipped (Postgres, needs DATABASE_URL)
npm run test:e2e  # 58 passed across desktop and mobile
```

For context: before this work the test suite could not execute at all. `npm test` crashed on `ReferenceError: module is not defined in ES module scope` — the Jest config used CommonJS under `"type": "module"` — and the Cypress specs targeted pages that did not exist.

---

## What is covered

### Unit — 93 tests

| Area              | File                            | Covers                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema validation | `shared/schema.test.ts`         | Username rules, password length boundaries, email normalisation, unicode names, unknown-key rejection, invalid calendar dates (`2026-02-31`, `2026-04-31`), exact upper bounds, fractional-vs-integer metrics, privilege-escalation-shaped payloads |
| Insight engine    | `server/insights.test.ts`       | Every rule's trigger and non-trigger, priority ordering, the five-insight cap, determinism for identical input, all-zero days without `NaN`/`Infinity`, single-day and empty history                                                                |
| Formatting        | `client/src/lib/format.test.ts` | Duration boundaries (59s/60s/3599s/3600s/86399s), local-vs-UTC date parsing, relative days, pluralisation, unicode initials, empty strings                                                                                                          |

### Integration — 73 tests

`test/api.test.ts` drives the real Express app through Supertest. Every route is covered for happy path, invalid input, unauthorised access and not-found. Beyond the obvious:

- **Session integrity** — forged unsigned cookies and cookies with a tampered signature are both rejected.
- **Username enumeration** — "unknown user" and "wrong password" return byte-identical responses.
- **Ownership** — finishing another user's workout session returns 403.
- **Mass assignment** — `PATCH /users/me` rejects `role`, `passwordHash` and any other key outside the allow-list.
- **CSRF shape** — a form-encoded POST is refused with 415; a bodyless JSON POST is allowed.
- **Leakage** — no response, including the leaderboard, contains a password hash.
- **Derived progress** — logging activity moves challenge progress without touching a counter.
- **Malformed bodies** — invalid JSON returns 400, oversized bodies 413.

### End-to-end — 58 tests (29 × desktop, 29 × mobile)

`e2e/auth.spec.ts` and `e2e/app.spec.ts`, run with Playwright **against the production build**, not the dev server.

Covered flows: one-click demo, manual sign-in, wrong password, registration with inline validation, sign-out and route protection, redirect away from login when signed in, dashboard render, logging activity, out-of-range rejection, chart metric and range switching, the chart's table view, workout search/filter/clear, the empty state, start-and-finish a session, challenge join/leave, leaderboard, insights (including asserting the "not a language model" disclosure is still present), browser back/forward, deep-link reload, 404, double-submit, theme persistence, the skip link, 360px overflow on four pages, and the pinned mobile navigation.

**Accessibility** is asserted with axe-core on the login, dashboard, challenges and insights pages, failing on any `serious` or `critical` WCAG 2.1 A/AA violation. Failures report the offending node and the measured colours, not just a count.

**Console cleanliness** is asserted on the two highest-traffic paths: zero console errors, zero failed requests.

### Postgres — 7 tests, skipped by default

`test/postgres.test.ts` runs only when `DATABASE_URL` is set:

```bash
DATABASE_URL="postgresql://..." npm test
```

It checks idempotent schema creation and seeding, case-insensitive user lookup, upsert on the `(user, date)` key, zero-filled history, ranked leaderboards and idempotent joins — the same behaviours the memory suite asserts, so the two implementations stay in step.

---

## Bugs these suites caught

Every one of these was found by a test or a browser run, not by reading code.

| #   | Bug                                                                                                                                                                                                               | Found by                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Malformed JSON returned **500 instead of 400**. body-parser tags its errors and the handler did not recognise them, so bad input looked like a server fault.                                                      | Integration                             |
| 2   | `--text-subtle` measured **3.46:1** against surface-raised, failing WCAG AA across most of the app. Light mode failed too.                                                                                        | axe-core in E2E                         |
| 3   | The dialog's entrance animation ended at `transform: none`, **erasing the translate that centres it**. It rendered 253px below a 727px viewport with Save unreachable. Desktop had just enough height to hide it. | E2E mobile project                      |
| 4   | The dialog scrolled as one block, so its footer could fall below the fold on a short viewport.                                                                                                                    | E2E mobile project                      |
| 5   | `GET /auth/me` returned **401 for signed-out visitors**, printing a console error on every cold load for a perfectly normal user.                                                                                 | Browser console assertion               |
| 6   | The rate limiter's 120/min ceiling was low enough that **a fast human could trip it**.                                                                                                                            | E2E flakiness, then a 130-request burst |
| 7   | An "always-on" nutrition insight fired whenever any activity existed, making it generic filler and the steady-state branch unreachable.                                                                           | Unit                                    |

---

## Verified in production

Against `https://health-hub-pro-advanced-health-monitoring-deathfire26s-projects.vercel.app` on the live deployment, not a local build:

| Check                           | Result                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`                         | 200, correct SPA HTML, title, meta and OG tags                                                                                                             |
| `GET /challenges` (deep link)   | 200 — the SPA rewrite serves `index.html`                                                                                                                  |
| `GET /api/health`               | 200 `{"status":"ok","persistent":false}`                                                                                                                   |
| `GET /api/workouts?type=yoga`   | 200, correctly filtered to one result                                                                                                                      |
| `GET /api/goals` (no session)   | **401** — the auth guard rejects in production                                                                                                             |
| `GET /api/nonexistent-endpoint` | **404** JSON — the API 404 fires instead of falling through to the SPA                                                                                     |
| Response headers                | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` all present; `ratelimit-policy: 300;w=60` confirms the raised ceiling is live |

Not yet exercised against the live URL: the interactive browser flows (sign-in, logging activity, starting a session, leaderboards). Those pass against the production build locally and need one command to confirm in production.

---

## What is not covered, and why

Stated plainly rather than papered over.

| Gap                                       | Reason                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The live E2E suite has not been run**   | The deployment **is** live and its HTTP surface is verified (see "Verified in production" below), but Playwright has not been pointed at it: the build sandbox's egress policy blocks `*.vercel.app`, so the browser cannot reach it from there. Run `BASE_URL=https://... npm run test:e2e` locally to close this. |
| **PostgresStorage has not been executed** | No database was available in the build environment. Its 7 parity tests are written and will run against a real connection string. Until then, only `MemoryStorage` has actually executed — treat the Postgres path as reviewed, not proven.                                                                         |
| **Fonts were not exercised locally**      | The sandbox's TLS proxy blocks `fonts.googleapis.com`, so screenshots show the fallback stack. The non-blocking `<link>` and fallback are correct by construction; confirm the webfonts render once deployed.                                                                                                       |
| **No load testing**                       | The original repo shipped k6 and Artillery configs that were never run. They were removed rather than left as decoration. Meaningful load testing needs a real database and a real deployment.                                                                                                                      |
| **Browser coverage is Chromium only**     | Playwright is configured for Chromium at desktop and Pixel 5 sizes. Firefox and WebKit are one config line away but were not run.                                                                                                                                                                                   |
| **Coverage percentage is not reported**   | The previous config asserted an 85% threshold it never reached because nothing executed. Rather than assert a number that was not measured, `npm run test:coverage` is available and the covered areas are listed above.                                                                                            |

---

## Running them

```bash
npm test                                    # unit + integration
npm run test:watch                          # watch mode
npm run test:coverage                       # with a v8 coverage report
npm run test:e2e                            # E2E, builds and serves automatically
npx playwright test --project=desktop       # one viewport
BASE_URL=https://your-url npm run test:e2e  # against a deployment
npm run verify                              # lint → typecheck → test → build
```

E2E starts its own API and preview server. The API runs with `NODE_ENV=test`, which disables rate limiting — leaving it on made the suite fail nondeterministically once it exceeded the per-minute ceiling, which tested the limiter rather than the app.

CI runs the same commands on every push and pull request (`.github/workflows/ci.yml`).
