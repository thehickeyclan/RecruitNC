# Archived documentation (marketing / stakeholder copy)

Historical exports, pasted briefs, and other documents that might be **forwarded outside the repo** should live here (or be updated before sharing) so they stay aligned with RecruitNC’s live surfaces.

There is **no separate public URL** serving this folder; treat anything stored or copied from here as **share-ready** wording.

## Standard for charitable giving copy

See **[CHARITABLE-GIVING-COPY-BASELINE.md](./CHARITABLE-GIVING-COPY-BASELINE.md)** — the same four pillars used on the gift hub (Training Fund / NC United, checkout naming as documentation, IRC-style acknowledgment language, donor-specific deductibility).

## Quick maintainer pass

Before publishing or archiving a refreshed doc:

```bash
rg -i 'tax-deduct|fully tax|every .* deductible|100% .* deduct' archive/docs docs
```

Anything that survives must be explicitly qualified (“may be … to the extent allowed by law”; confirm with advisor/CPA), not unconditional.
