# Digital wallet — unlinked donations

Raised by a parent 12 Aug 2026: Jaxon Thomas's wallet showed **-$150** with no balance.
She was right. It is not a maths error and no money is lost, but it affects 19 athletes.

## What is wrong

Donations are keyed by `spartan_donations.athlete_code` (e.g. `NCU-THOMAS-27`).
Spending is keyed by `guild_credit_allocations.athlete_id` (a UUID).

Nothing joins the two unless the athlete has a row in `athlete_fundraising_profiles`
carrying `spartan_code` / `primary_fundraising_code`. When that row is missing:

- the raised total resolves to nothing
- the only rows that join are the spends
- the wallet renders those alone, as a negative

## Scale

32 donation codes exist. Only 13 have a matching profile row.

**19 codes, $10,282.00, invisible to the families who raised it.**

| Code | Raised |
|---|---|
| NCU-SHUSTER-28 | $1,895.00 |
| NCU-SHUSTER-27 | $1,840.00 |
| NCU-THOMAS-27 | $1,125.00 |
| NCU-GORE-27 | $1,000.00 |
| NCU-HICKEY-25 | $955.00 |
| NCU-GOREAI-27 | $559.00 |
| NCU-YATES-29 | $515.00 |
| NCU-GUERRERO-29 | $308.00 |
| NCU-ADAMSV1-27 | $265.00 |
| NCU-GOREAD-27 | $255.00 |
| NCU-WORRICK-27 | $255.00 |
| NCU-TUFTS-27 | $250.00 |
| NCU-RICHARDS-28 | $225.00 |
| NCU-MYLES-27 | $195.00 |
| NCU-TAYLOR-30 | $155.00 |
| NCU-ADAMSM2-27 | $155.00 |
| NCU-JOHNSONT-27 | $155.00 |
| NCU-JOHNSONM-27 | $155.00 |
| NCU-APONTEV1-31 | $20.00 |

## Worked example

Jaxon Thomas — `ca4cdc62-99ac-4951-bab6-6577885aad3e`

```
spartan_donations   NCU-THOMAS-27   10 donations      $1,125.00
guild_credit_allocations (guild_applied)
    2026-06-11  $120.00
    2026-07-23   $30.00                                 -$150.00
                                                       ──────────
correct balance                                          $975.00
```

He has no row in `athlete_fundraising_profiles` or `spartan_fundraising_athletes`.

## Do NOT bulk-link by surname

`NCU-GORE-27`, `NCU-GOREAI-27`, `NCU-GOREAD-27` — three codes, one surname. Possibly
siblings, possibly duplicates for one athlete. Same for `NCU-ADAMSV1-27` / `NCU-ADAMSM2-27`,
the two SHUSTER codes and the two JOHNSON codes.

Guessing assigns real money to the wrong child. Every link needs human confirmation.

## Suggested order

1. **Admin reconciliation view** — each code with its raised total, a suggested athlete, and
   a confirm action. Matt confirms; nothing auto-links.
2. **Backfill** the missing `athlete_fundraising_profiles` rows from those confirmations.
3. **Fix the lookup** so the wallet resolves donations by code *and* athlete id — then a
   missing profile row can never hide money again. This is the durable fix; 1 and 2 are the
   cleanup.
4. **Guard**: an admin check that flags any donation code with no linked athlete, so this
   surfaces on its own next time rather than via a parent.

## Files

- `lib/admin-digital-wallet-ledger.ts` — wallet figure
- `lib/spartan-fayetteville-totals-by-code.ts` — code-based totals
- `lib/guild-credit-allocations.ts` — the spend side
- `athlete_fundraising_profiles` — the join table that is missing rows
