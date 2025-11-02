# Production Lockdown Plan: One Card, One Contract

Goal: Make production 100% consistent by rendering ONLY the professional card from a SINGLE object shape.

1) Freeze the card and object
- Authorized renderer: components/professional-commitment-card.tsx
- Authorized object: docs/professional-athlete-contract.md

2) Pages allowed to render cards in prod today
- /athletes → uses components/athletes-grid.tsx → ProfessionalCommitmentCard
- /athletes-public (if kept) → must also render AthletesGrid (same normalization)

3) Remove/avoid these from production routes (keep only in /debug/*)
- components:
  - commitment-card.tsx
  - commitment-card-working.tsx
  - commitment-card-robust.tsx
  - fixed-production-flip-card.tsx
  - commitment-card-fixed.tsx
  - production-commitment-card.tsx
  - simple-working-card.tsx, simple-working-flip-card.tsx
  - bulletproof-flip-card.tsx
- pages (non-exhaustive; keep under /debug only):
  - app/debug/* (ok to keep)
  - any app/test/* or app/*/test-* that render cards
  - watch for “working”, “robust”, “fixed”, “production”, “simple” in filenames/imports

4) Data normalization rule
- BEFORE rendering a card, map any raw row to the Professional Athlete contract.
- Example mappings to enforce in your API code (conceptual, not code here):
  - graduationyear = graduation_year ?? 2025
  - weightclass    = weight_class
  - highschool     = high_school
  - photourl       = image_url ?? photo_url ?? photourl
  - commitmentdate = commitment_date
- Never pass raw DB shapes directly to card components.

5) Navigation and fallback audit
- Ensure nav/CTAs only link to the allowed pages listed above.
- If /api/athletes fails and you use mock data, still pass it through the normalization step so the contract is preserved.

6) QA checklist (10 minutes)
- Visit /athletes
  - All cards share the same professional look; no flip icons, no “Tap To Flip Card”.
  - Pagination/filters do not change the card style.
- Visit / (home), if it shows featured cards
  - Same card style (if cards are shown).
- Visit /athletes-public (if it exists)
  - Same card style.
- Manually visit /debug/* pages to confirm flip-card variants are isolated and not linked from the nav.

7) What to do if you still see the wrong card
- You landed on a route that imports a non-professional card variant, or normalization was skipped.
- Search for “flip-card”, “commitment-card-working”, “production-commitment-card”, “bulletproof”, “simple-*-card” in the repo and remove imports from any non-debug route.

Outcome
- One card renderer and one object shape in all production experiences.
- Experiments remain, but only under /debug so they can’t leak into launch.
