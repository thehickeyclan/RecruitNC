# National team: persist checkout line items on registration

Run in **Supabase → SQL Editor** so pending checkouts show exactly what was selected (hotel, van, gear, etc.) even before payment completes.

```sql
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS checkout_lines text;
ALTER TABLE national_team_event_registrations ADD COLUMN IF NOT EXISTS checkout_mode text;

COMMENT ON COLUMN national_team_event_registrations.checkout_lines IS 'Compact hub checkout line items (registration, van, hotel, gear) — set when Stripe session is created.';
COMMENT ON COLUMN national_team_event_registrations.checkout_mode IS 'team_package or individual — hub checkout mode.';
```
