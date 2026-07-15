# Fargo data import

Files in this folder feed `fargo_results` in Supabase (profiles, Data Dawg, `/fargo` pages).

**Canonical annual path:** Admin **`/admin/imports`** → **Stage Fargo Nationals** → review → approve.  
See `docs/FARGO-NATIONALS-CONNECTOR.md`.

Freestyle and Greco-Roman are **separate careers**. FloWrestling is **never** the SoR.

## Prerequisite

1. `scripts/create-fargo-results-table.sql` (once, if table missing)
2. **`scripts/fargo-results-harden-setup.sql`** (style / gender / age_division / unique key)

## Register years

`lib/public-imports/connectors/fargo-nationals.ts` — add CSV paths per tournament year after Fargo.

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
| `fargo_junior_2025_2026.csv` | Legacy extract — prefer `fargo_juniors_details.csv` |

## Legacy CLI (prefer admin connector)

```bash
node scripts/import-fargo-results.mjs \
  scripts/data/fargo/fargo_2023_16u.csv \
  scripts/data/fargo/fargo_2024_16u.csv \
  scripts/data/fargo/fargo_2023_junior.csv \
  scripts/data/fargo/fargo_2024_junior.csv \
  scripts/data/fargo/fargo_16U_details.csv \
  scripts/data/fargo/fargo_juniors_details.csv
```

Dry run: add `--dry-run`.

## Env (CLI only)

`NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
