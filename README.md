# Piano Practice

Lean SolidJS piano practice app for technical exercises and metronome work.

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
