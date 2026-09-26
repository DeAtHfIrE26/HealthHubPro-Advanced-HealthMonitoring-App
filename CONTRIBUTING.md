# Contributing

Thanks for looking. This is a small library, so the process is short.

## Getting set up

```bash
git clone https://github.com/DeAtHfIrE26/healthhubpro-showcase.git
cd healthhubpro-showcase
npm install
npm run dev      # playground on http://localhost:5173
```

Node 20.19 or newer. No database, no API keys, no `.env` needed — everything
in the playground runs on synthetic data generated in the browser.

## Before you open a pull request

```bash
npm run verify   # lint, typecheck, test, build — the same four CI runs
```

CI runs `format:check` too, so `npm run format` if Prettier complains.

Two more things worth doing by hand, because neither is automated:

- **Look at it in both themes.** The toggle is in the playground header. Light
  mode is where contrast problems hide; it had 42 WCAG AA failures before
  anyone thought to scan it.
- **Look at it at 375px.** A percentage-based layout that works at 1280px can
  collapse entirely on a phone — see the zero-width bar bug in the README.

## What makes a good change here

- **A test that fails without it.** Every bug in the README's case studies was
  found by something other than the test suite, which is the argument for
  adding one.
- **Small.** One thing per pull request.
- **Comments that explain why, not what.** The code says what it does. If a
  value is unusual — a lightness of 28% instead of 38%, a 4 MB chunk size —
  say what it is protecting against.

## Style

Prettier and ESLint decide formatting and lint; do not argue with them in
review. Beyond that:

- Only animate `transform` and `opacity`, and always honour
  `prefers-reduced-motion`.
- Colour must clear WCAG AA — 4.5:1 for text, 3:1 for graphics. Compute it,
  do not eyeball it.
- No new runtime dependency without saying in the pull request what it costs
  in gzipped kilobytes and why the alternative is worse. This library exists
  partly because a 99 kB charting dependency was replaced with 2 kB of code.

## Reporting a security issue

Please do not open a public issue. See [SECURITY.md](SECURITY.md).
