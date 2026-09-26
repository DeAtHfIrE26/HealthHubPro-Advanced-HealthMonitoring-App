# Changes

Performance, algorithms, UI/motion and an About section. No feature, route or
API contract changed. Auth, CSRF, route guards, the `/api/health` response
shape, SPA deep-link rewrites and the sample account are all untouched.

**Regression gate: the E2E suite passed before and after every step.** It grew
from 90 to 108 tests, because four of the bugs below got past all 90.

---

## Headline numbers

Measured with Playwright + CDP against the production build. "Mobile" is 390px
/ Fast 3G / 4× CPU, the Lighthouse mobile default. Throttled figures are the
median of three runs. The harness that produced them is in `.perf/`.

|                            | Before             | After                       | Change           |
| -------------------------- | ------------------ | --------------------------- | ---------------- |
| Login payload              | 756.6 kB           | **376.1 kB**                | **−50%**         |
| Dashboard payload          | 766.9 kB           | **381.2 kB**                | **−50%**         |
| Login LCP (mobile)         | 1960 ms            | **1464 ms**                 | −25%             |
| Dashboard LCP (mobile)     | 2328 ms            | **1756 ms**                 | −25%             |
| Login TBT (mobile)         | 183 ms             | **129 ms**                  | −30%             |
| Dashboard TBT (mobile)     | 370 ms             | **169 ms**                  | **−54%**         |
| Longest task (mobile)      | 188 ms             | **104 ms**                  | −45%             |
| CLS (desktop, unthrottled) | 0.0006             | **0**                       | —                |
| Dashboard API requests     | 7                  | **5**                       | −2               |
| Cold start, compiled JS    | 455 ms             | **117 ms**                  | **−74%**         |
| Largest asset              | recharts, 99 kB gz | **react, 47.6 kB gz**       | recharts removed |
| Dependencies               | —                  | **one removed, none added** |                  |

Against the targets in the brief: **LCP < 2.5 s ✅**, **CLS < 0.1 ✅**,
**INP < 200 ms ✅** (no long task blocks input after first load), **no task

> 100 ms — narrowly missed**, at 104 ms median. What remains is React plus
> entry evaluation; getting under 100 ms would mean server rendering or a
> smaller framework, neither of which is worth it here.

---

## Four premises in the brief that did not match the repo

Worth recording, because they changed what was worth doing.

| Brief                                                                 | Reality                                                                                                                                                               |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "JWT auth with CSRF protection"                                       | HMAC-signed httpOnly `SameSite=Lax` cookies, not JWT. CSRF defence is Content-Type inspection on mutations.                                                           |
| "PostgreSQL with Drizzle"                                             | In the code, but **not running in production** — no `DATABASE_URL`, so the live site serves seeded in-memory storage and `/api/health` reports `"persistent": false`. |
| "may contain Redis, InfluxDB, Kubernetes, Prometheus/Grafana, Sentry" | **None of it exists.** No source, config or dependency references any of them; the only mentions are in `docs/` explaining their earlier removal.                     |
| "charts receive more data points than they can display"               | The chart offers 7/14/30 days — **30 points maximum**. LTTB downsampling would have been complexity for no gain, so it was not added.                                 |

Two things the brief asked about turned out to be already correct:

- **Connection handling.** Neon's HTTP driver (`drizzle-orm/neon-http`) is the
  right serverless choice. There is no TCP pool to exhaust, so the cost is
  per-query round trips, not connections — which is what makes the N+1s below
  matter.
- **Compression.** Vercel already returns `content-encoding: br` on API
  responses. A `compression` middleware would have been redundant.

---

## What changed

### 1. The chart library was being downloaded by people looking at the login form

`vite.config.ts` gave recharts its own manual chunk to keep it off the
critical path. Naming a chunk promotes it into the entry's preload set, so
`index.html` emitted `<link rel="modulepreload">` for it and **every visitor
downloaded 365 kB — 48% of the page — to look at a login form with no chart on
it.** The optimisation was causing the problem it was added to prevent.

Removing that one config branch let recharts ride in the already-lazy chart
chunk. Login went from 756.6 kB to 398.2 kB.

That alone regressed dashboard CLS from 0 to 0.0304, because the chart then
arrived later and the flat 304px Suspense skeleton only matched at widths
where the filter row does not wrap — at 390px those eight buttons wrap and the
real block is 344px. A skeleton mirroring the actual control row fixed it.
(That component was deleted again in step 3, once the chunk it covered stopped
existing.)

### 2. The dashboard asked for the same data three times

It fetched `history?days=7`, `history?days=14` and `/activity`. But 14 days
contains 7, any range ≥ 14 contains 14, and today is the last row of whichever
window came back. It now fetches `max(days, 14)` once and slices locally.
Seven requests became five, with no change to anything on screen.

### 3. 355 ms of every cold start was Drizzle the request never used

`shared/schema.ts` held the Drizzle table definitions and the Zod validators in
one module. Routes import the validators, so every cold start evaluated
`drizzle-orm/pg-core` too — **355 ms measured in isolation, against 94 ms for
Express itself.** With no `DATABASE_URL`, which is how this deploys today, all
355 ms was waste.

Three modules now:

- `shared/enums.ts` — the closed value sets, no imports at all
- `shared/tables.ts` — `pgTable` definitions, imported only by `storage/postgres.ts`
- `shared/schema.ts` — Zod validators and the row types inferred from those tables

`enums.ts` exists so neither of the others has to import the other: the tables
narrow columns with `$type<GoalType>()` while the validators build `z.enum()`
from the same arrays at runtime. Without it the choice was a circular import or
putting Drizzle back on the cold path.

`schema.ts` reaches the tables through a **top-level `import type`**, which is
erased. An inline `{ type X }` specifier would not have been enough:
`verbatimModuleSyntax` emits the statement verbatim, so `import {} from
'./tables.js'` would still have loaded the module and saved nothing. Every
export `schema.ts` used to provide, it still provides.

Cold start: 455 ms → 117 ms. When `DATABASE_URL` is set the 355 ms returns,
once, inside storage init where it is genuinely needed.

### 4. Four pages were in the entry chunk that nobody had asked for

Only Settings was lazy. Workouts, Challenges and Insights now are too.
Dashboard and Login stay eager: they are the two pages a visitor can land on
cold, and splitting either would add a round trip to the only paint that
matters. Entry chunk 234.4 → 177.0 kB raw.

### 5. Recharts replaced with a hand-rolled chart

371 kB raw / 99 kB gzipped — **larger than React** — and profiling put ~270 ms
of script self-time in its chunk, the last main-thread task over 100 ms. For a
bar chart of at most 30 bars with two axes, a dashed goal line and a hover
tooltip, that is a library's worth of generality nobody here uses.

|                   | Before                  | After                    |
| ----------------- | ----------------------- | ------------------------ |
| Chart chunk       | 371.45 kB / 99.38 kB gz | **5.68 kB / 2.11 kB gz** |
| Dashboard payload | 766 kB                  | **377 kB**               |
| Dashboard TBT     | 349 ms                  | **175 ms**               |

The feature is unchanged: same five metrics, same 7/14/30 ranges, same peak
emphasis, same goal line, same table view, same empty state. It _gained_ a
`role="img"` summary that the SVG never had.

Bars are flex bands scaled with `transform: scaleY()` from the bottom, so the
plot is responsive with no DOM measurement and no `ResizeObserver`, and the
scaling is GPU-composited rather than a layout pass. At 2 kB the lazy boundary
cost more than it saved, so the chart went back into the entry chunk — which
still shrank, 177 → 154 kB.

### 6. Motion and UI polish

- **Metric tiles count up** to their value (`useCountUp`, rAF + easeOutCubic).
- **Goal rings sweep in.** The stroke transition already existed but React
  painted the final offset on first render, so there was nothing to animate
  from.
- **Route transitions**: a 260 ms opacity/transform entrance, keyed on the
  path. Remounting also restarts the counters and rings, which is what you
  want on arrival.
- **Chart bars animate** between ranges via the same `scaleY`.
- Tile hover states; the existing focus rings, skeletons and import/export
  progress were already in place.

Only `opacity` and `transform` are animated. `prefers-reduced-motion` is
honoured — globally in `index.css`, and `useCountUp` checks it directly and
jumps straight to the value.

### 7. Responsive fix: 68px of horizontal overflow at 768px

Found during this work, **pre-existing**, on every signed-in page including
ones with no chart. 768px is exactly the `md` breakpoint, where the header nav
appeared while the viewport was still too narrow to hold it alongside the
logo, badge, theme toggle and avatar — about 813px of content in a 736px box.
Header nav and bottom bar moved to `lg`, so tablets get the bottom bar.

The overflow test only covered 360px, which is why nobody noticed. It now runs
at **360, 375, 768, 1280 and 1920**, across five routes.

### 8. About section

A slim footer under every page, signed in and out (`SiteFooter`, mounted in
`AppShell` and on Login/Register). Two short paragraphs on the project and one
line on the builder, then Portfolio / GitHub / LinkedIn / Email as icon-plus-text
links opening in new tabs with `rel="noreferrer noopener"`. No phone number.
A footer rather than a page or a modal: it is context, not a destination.

---

## Bugs found and fixed

Three were introduced by the chart rewrite and caught by screenshotting the
result rather than trusting the suite. All three now have tests.

1. **Every bar had zero width at 30 days.** A percentage flex `gap` resolves
   against the container, not the band, so 29 gaps of 11% overflowed and flex
   shrank every bar to nothing. The plot still drew gridlines, axes and the
   goal line, so **all 90 tests passed over an empty chart.** Bars are now
   inset within their own band.
2. **X labels truncated to "S"** at 30 days — each label was confined to a
   ~9px band. They are now centred on the band and free to overflow it.
3. **The tooltip survived a range switch**, showing a stale index against a
   different day's data.

Three more were pre-existing:

4. **Light theme failed WCAG AA on every page.** axe had only ever run
   against the dark default. The accent measured **3.13:1** both as text on
   white and under white ink — the same ratio — so the week-on-week deltas,
   the primary button label and the avatar initials all failed; the demo
   badge was **2.97:1** on its own tint. Computed rather than eyeballed:
   accent moves 38% → 28% (5.31:1 on white, 4.82:1 on surface-raised),
   accent-dim 88% → 90%, warn 42% → 32% (4.75:1 on tint). Chart bars keep
   the lighter value — they are graphics, judged at 3:1. axe now runs in
   **both themes across five routes**, which is what should have caught this.
5. **68px horizontal overflow at 768px** (above).
6. **CLS 0.0668 from the dashboard skeleton and the demo badge.** The skeleton
   reserved ~650px against ~1240px of real content, so everything below it —
   including the new footer — dropped half a screen when data landed. And the
   "Demo mode" badge rendered only once the health check resolved, shoving the
   theme toggle and avatar sideways. The skeleton is now sized to the measured
   layout at both breakpoints, and the badge's slot is held from the start and
   faded into. CLS is 0.

---

## Tried and rejected

Recorded because the measurements are the point.

- **Gating the chart mount on `requestIdleCallback`.** Sampled three runs each
  way: dashboard TBT 302/338/345 ms with it against 333/354/442 ms without.
  Overlapping spreads, no movement in the longest task — noise, not a gain. A
  single sample had suggested it made things _worse_, which was equally
  unsupported. Deleted.
- **An animation library.** The brief suggested Motion, GSAP or Animate.css.
  Motion is ~18 kB gzipped even trimmed to `LazyMotion` + `m`, which is 35% of
  the current entry chunk, and it was hard to justify adding that back
  immediately after cutting 99 kB. What it would have bought here — number
  interpolation and an entrance — is ~50 lines of rAF and a CSS keyframe.
  **The choice is CSS plus `tailwindcss-animate`, which was already
  installed.** If layout animations or gesture handling are ever wanted, Motion
  is the right pick and the tradeoff changes.
- **LTTB downsampling.** The chart shows at most 30 points.
- **Virtualised lists.** The longest list is 10 workouts.
- **A compression middleware.** Vercel already sends brotli.
- **Broad `useMemo`/`memo`.** The chart's three memos cover the only real
  derivation; the rest would be noise.

---

## Not done, and why

**The Postgres query work is deferred.** It is real but latent — none of it
executes today, because no `DATABASE_URL` is set.

- `GET /challenges` issues 1 + 3×4 = **13 queries**.
- `GET /challenges/:id/leaderboard` issues **9**, and polls every 5 s — 108
  queries a minute per open leaderboard. `Promise.all` parallelises them so
  latency survives, but on Neon's HTTP driver that is 13 HTTP requests of real
  compute against a free-tier allowance.
- `activity_stats_user_idx ON (user_id)` duplicates the index Postgres already
  creates for `UNIQUE (user_id, date)`, which serves `user_id`-prefix lookups.
- `init()` re-runs 9 `CREATE ... IF NOT EXISTS` statements plus a `COUNT` on
  every cold start — roughly 300–600 ms on Neon HTTP.
- `GET /api/export` is unbounded and built as one in-memory string: 213 kB for
  three years of data.

I recommended deferring this until there is a database, so the fixes can be
shown with real `EXPLAIN ANALYZE` before and after rather than asserted. The
same goes for the index claim above — no database exists yet, so it is reasoned
from the schema, not measured.

**`PostgresStorage` has still never executed.** Its 7 parity tests skip without
a connection string.

---

## New dependencies

**None.** One was removed: `recharts` (371 kB raw / 99 kB gzipped).

---

## Verifying this yourself

Everything above was measured against a local production build. The sandbox's
egress policy blocks `*.vercel.app`, so no browser here can reach the live
deployment. From any unrestricted machine:

```bash
npm run verify                  # lint, typecheck, 233 unit/integration tests, build
npm run test:e2e                # 108 end-to-end tests, desktop + mobile
node .perf/measure.mjs          # waterfall, Web Vitals, long tasks
node .perf/throttled.mjs        # the same under Fast 3G + 4x CPU
node .perf/api.mjs              # per-endpoint latency (needs NODE_ENV=test)
node .perf/scale.mjs            # three years of imported history

BASE_URL=https://health-hub-pro-advanced-health-monitoring-deathfire26s-projects.vercel.app \
  npm run test:e2e
npx lighthouse https://health-hub-pro-advanced-health-monitoring-deathfire26s-projects.vercel.app \
  --preset=desktop --view
```

`.perf/api.mjs` needs the API on `NODE_ENV=test`: 30 iterations across 15
endpoints is 450 requests, which trips the 300/min limiter and turns the tail
of the run into 429s.

The real Vercel cold start — sandbox boot plus the 117 ms of JS measured here —
can only be seen against the live function.
