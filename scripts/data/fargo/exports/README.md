# Fargo official exports (SoR)

Drop **USA Bracketing** or **Trackwrestling** exports here. FloWrestling is never SoR.

**Production note:** Vercel cannot read this folder at runtime. Also copy each export into
`lib/public-imports/fixtures/fargo/` and register it in `lib/public-imports/fixtures/fargo/index.ts`
so the full connector can load it after deploy.

Do **not** use `usawrestlingevents.com` event hub pages as `fetch_url` — they are HTML, not JSON.

## Naming

Match paths registered in `lib/public-imports/connectors/fargo-events.ts`:

- `2026-junior-boys-fs.json` — USA Bracketing JSON
- `2026-junior-boys-gr.json`
- `2024-junior-boys-fs.track.txt` — Trackwrestling tab/over text

## USA Bracketing JSON shape

See `2026-junior-boys-fs.json` for the RecruitNC-normalized schema (`brackets[].matches` + placers).

## Admin

`/admin/imports` → **Run full Fargo connector** (stages seasons + bouts for review).
Missing brackets are skipped; any loaded exports still stage.
