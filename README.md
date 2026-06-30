# Piano Practice

> Early work in progress — many features are not built yet.

A lean piano practice app: technical exercises and theory, nothing else.

Most practice apps bury the practice under subscriptions, ads, and accounts —
and you end up juggling several of them to cover the basics. This is the
opposite: one place for exercises and theory, no fluff.

The app is live at <https://piano.niklas-e.fi/>


## Local Development

Install dependencies:

```bash
pnpm install
```

Run the dev server:

```bash
pnpm dev
```

Build static output:

```bash
pnpm build
```

## Tests

Run unit tests with Node's built-in test runner:

```bash
pnpm test:unit
```

Run Playwright tests:

```bash
pnpm test:e2e
```

Run all tests:

```bash
pnpm test
```

If Playwright browsers are missing, install Chromium:

```bash
pnpm exec playwright install chromium
```
