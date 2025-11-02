# Division Naming Convention

Use these exact, canonical values across the database:

- DI
- DII
- DIII
- NAIA
- NJCAA

Notes:
- NJCAA is the correct label (do not use "NJCA" or "JUCO").
- These values are case-sensitive.
- Do not use alternatives like "NCAA Division I/II/III", "D1/D2/D3", "D-I/D-II/D-III", or "JUCO".

Why this set?
- Short, unambiguous, widely understood, and consistent with college athletics.
- Minimizes label drift across tables and tools.

Where to update
- Supabase Table Editor → logo_mappings → filter entity_type = 'college' → edit division inline.
- After edits, if you need athlete records to carry the same division in athletes.division, re-run your division sync script.

Common alias mapping (for reference)
- DI: "D1", "NCAA D1", "Division I", "NCAA Division I", "D-I"
- DII: "D2", "NCAA D2", "Division II", "NCAA Division II", "D-II"
- DIII: "D3", "NCAA D3", "Division III", "NCAA Division III", "D-III"
- NAIA: "NAIA" (usually consistent)
- NJCAA: "JUCO", "NJCA", "NJCCAA"
