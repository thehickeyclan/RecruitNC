# Fargo official exports (SoR)

Drop **USA Bracketing** or **Trackwrestling** exports here. FloWrestling is never SoR.

## Naming

Match paths registered in `lib/public-imports/connectors/fargo-events.ts`:

- `2026-junior-boys-fs.json` — USA Bracketing JSON
- `2026-junior-boys-gr.json`
- `2024-junior-boys-fs.track.txt` — Trackwrestling tab/over text

## USA Bracketing JSON shape

See `2026-junior-boys-fs.json` for the RecruitNC-normalized schema (`brackets[].matches` + placers).

## Admin

`/admin/imports` → **Run full Fargo connector** (stages seasons + bouts for review).
