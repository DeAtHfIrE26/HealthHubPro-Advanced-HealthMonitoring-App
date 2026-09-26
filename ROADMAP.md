# Roadmap

Where this is going, and the ideas that are genuinely open. Anything marked
**good first issue** is scoped so that a first contribution can be complete
rather than partial — each names the files to touch and how to tell it worked.

## Next

### 1. Line and area marks for `ActivityChart` — _good first issue_

The chart only draws bars. Sleep and water read better as a line, and the
bar-scaling code already computes everything a line needs.

- Touch `src/components/data/ActivityChart.tsx`; add a `mark?: 'bar' | 'line'`
  prop defaulting to `'bar'`.
- Draw the line as a single SVG `<path>` overlaid on the existing band
  geometry, so responsiveness stays measurement-free.
- **Done when** `mark="line"` renders in the playground at 7, 14 and 30 days
  with no layout shift, and `ActivityChart.test.tsx` covers both marks.

### 2. A Google Fit `.zip` adapter — _good first issue_

`detectFormat` handles `.xml`, `.csv`, `.tsv` and `.txt`. Google Fit's
"Takeout" export is a zip of CSVs.

- Touch `src/lib/import/csv.ts` and `src/lib/import/aggregate.ts`.
- Needs a zip reader; propose one in the issue first with its gzipped size —
  the bar for a new dependency here is high.
- **Done when** a zip of two daily CSVs parses to the merged day set, and the
  chunk-boundary guarantee still holds for the files inside.

### 3. Timezone-aware day bucketing

Both parsers bucket by the date string in the source record. An Apple Health
export written in one timezone and read in another can shift a day at the
boundary.

- Touch `src/lib/import/appleHealth.ts`.
- Decide, and document, whether a day belongs to the recording timezone or
  the viewer's. Neither is obviously right, which is why this is not marked
  as a first issue.
- **Done when** a record at 23:30 +1300 lands on a defensible date with a test
  that states which rule was chosen.

### 4. A `useReducedMotion` hook — _good first issue_

`useCountUp` reads `prefers-reduced-motion` directly and the CSS handles the
rest. A shared hook would let components branch on it, not just soften.

- New file `src/hooks/useReducedMotion.ts`, exported from `src/index.ts`.
- Must subscribe to changes — people toggle it while the page is open, which
  the current one-shot read does not notice.
- **Done when** the hook re-renders on change, `useCountUp` uses it, and the
  test covers a mid-flight toggle.

### 5. Publish the playground

The playground is built by CI (`npm run build:playground`) but is not hosted,
so the README's demo is a GIF rather than something you can click.

- Add a Pages deploy job to `.github/workflows/ci.yml` on `main`.
- **Done when** the README's "Live Demo" badge points at a running playground.

## Not planned

- **A charting abstraction.** The chart is deliberately one concrete bar
  chart. A configurable chart library already exists many times over, and
  competing with it is how you end up back at 99 kB.
- **A component for every Radix primitive.** Only the ones the application
  actually used are here. The rest would be untested surface.
- **Server-side anything.** That belongs to the private application.
