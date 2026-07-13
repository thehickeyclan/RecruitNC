# Fargo data import

Files in this folder feed `fargo_results` in Supabase (profiles, Data Dawg, future `/fargo` page).

## Canonical files

| File | Contents |
|------|----------|
| `fargo_16U_brief.md` | NC 16U story + caveats (2023–2026) |
| `fargo_16U_summary.csv` | 16U team stats by year (for archive page) |
| `fargo_16U_details.csv` | **Official** per-wrestler 16U rows (2025 & 2026) |
| `fargo_juniors_brief.md` | NC Junior story + caveats (2023–2026) |
| `fargo_juniors_summary.csv` | Junior team stats by year (for archive page) |
| `fargo_juniors_details.csv` | **Official** per-wrestler Junior rows (2025 & 2026) |
| `fargo_2023_16u.csv` | 2023 16U individuals (bracket export) |
| `fargo_2024_16u.csv` | 2024 16U individuals (bracket export) |
| `fargo_2023_junior.csv` | 2023 Junior individuals |
| `fargo_2024_junior.csv` | 2024 Junior individuals |
| `fargo_junior_2025_2026.csv` | Legacy extract from old seed — use `fargo_juniors_details.csv` instead |
| `../fargo_results_seed.csv` | Legacy combined seed — do not import alongside details files |

## Prerequisite

Run `scripts/create-fargo-results-table.sql` in Supabase SQL Editor once.

## Full import (recommended)

```bash
node scripts/import-fargo-results.mjs \
  scripts/data/fargo/fargo_2023_16u.csv \
  scripts/data/fargo/fargo_2024_16u.csv \
  scripts/data/fargo/fargo_2023_junior.csv \
  scripts/data/fargo/fargo_2024_junior.csv \
  scripts/data/fargo/fargo_16U_details.csv \
  scripts/data/fargo/fargo_juniors_details.csv
```

Imports are **division-scoped** per year — 16U and Junior for the same year do not wipe each other.

Dry run: add `--dry-run` to any command.

## Env

`NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
