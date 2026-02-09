# Division Naming Convention

**Spell out NCAA every time. Use Roman numerals (I, II, III), not numbers.**

## Full form (database, APIs, when space allows)

- **NCAA Division I**
- **NCAA Division II**
- **NCAA Division III**
- **NAIA**
- **NJCAA**
- **Club (NCWA)** (if tracking club/NCWA programs)

Store and compare using these exact strings. Do not mix "D1" with "Division I".

## Abbreviated (cards, filters, tables)

Use `getDivisionDisplayShort()` from `lib/division-display.ts`:

- DI, DII, DIII
- NAIA
- NJCAA
- Club (NCWA)

Be consistent — don’t mix "D1" with "Division I" anywhere.

## Where to update

- **college_division_mappings** or **college_master**: use the full form (NCAA Division I, etc.).
- **lib/division-display.ts**: single place for full vs short labels.

## Common inputs (normalized to full form)

- "D1", "DI", "Division 1" → NCAA Division I
- "D2", "DII", "Division 2" → NCAA Division II
- "D3", "DIII", "Division 3" → NCAA Division III
- "JUCO", "NJCA" → NJCAA
