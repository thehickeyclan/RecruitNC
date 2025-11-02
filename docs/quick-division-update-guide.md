Quick Division Update Guide

Where to edit
- Supabase > Table editor > logo_mappings
- Filter: entity_type = 'college'
- Edit: division column (inline), and optionally aliases

Canonical values (use exactly these)
- DI
- DII
- DIII
- NAIA
- NJCAA

Tips
- Keep aliases updated (e.g., "UNC", "UNC Chapel Hill") to improve matching.
- If a college isn’t listed, add a new row:
  - entity_type: college
  - entity_name: canonical college name
  - logo_url: existing logo or add as needed
  - division: one of the canonical values
  - aliases: optional variations

Propagation
- Immediate: Views that read division directly from logo_mappings will reflect your edits instantly.
- To update athlete rows (only if a feature reads athletes.division):
  - Run scripts/sync-athlete-divisions-from-logo-mappings.sql in Supabase SQL Editor.

Checklist
- [ ] Filter logo_mappings to colleges
- [ ] Fill division for each college using DI/DII/DIII/NAIA/NJCAA
- [ ] Add helpful aliases
- [ ] (Optional) Run sync script to update athletes.division if your features need it
