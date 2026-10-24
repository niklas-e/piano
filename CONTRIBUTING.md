# Contributing

Thanks for helping with Piano Practice! Bug reports, ideas and pull requests
are welcome. Reporting a bug or suggesting an idea does not require a CLA.

## Contributing code or content

You keep the copyright to your work. The [Contributor License Agreement](CLA.md)
lets the maintainer offer contributions under additional terms, subject to its
open source and hosting commitments.

Before your first contribution is incorporated, read version 1.0 (2026-10-24)
and actively check the PR template's box, or comment on the relevant PR or issue:

> I have read and accept the Piano Practice Contributor License Agreement,
> version 1.0 (2026-10-24), for my contributions here and all my future
> contributions to Piano Practice.

You only need to accept this version once; you may link your earlier acceptance.
Changed terms require fresh acceptance.

Mention other authors, third-party material (with its source and license), or an
employer that owns your work when relevant. Only accept on someone else's behalf
if authorized; acceptance for one employer does not cover a different employer.

For the maintainer: before incorporating work, including issue/comment patches,
confirm acceptance or authority for all relevant rights holders and record the
acceptance and a permalink to the agreed CLA revision. Review third-party licenses
separately: permission to use material under its existing license does not supply
broader relicensing rights.

## Before opening a pull request

Run all checks and make sure they pass:

```bash
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm test:offline
```

The [README](README.md) explains how to set up the project and run it locally.
