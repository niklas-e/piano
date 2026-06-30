# Agent Instructions

## Mandatory validation

Before considering any code change complete, run and ensure all pass:

```bash
pnpm lint        # Biome with --write: reports and auto-fixes
pnpm test:unit   # Node built-in test runner
pnpm test:e2e    # Playwright
```

All three must exit cleanly (no remaining errors) before you finish.
