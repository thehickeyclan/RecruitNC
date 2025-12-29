# NHSCA Participation Data Import Guide

## Overview

This import captures **ALL participants** at NHSCA tournaments, not just placers. This provides:
- Complete tournament participation history
- Data for rankings (NHSCA participation is valuable)
- Profile completeness (shows all national tournament experience)

## Data Structure

### Placers (24 in 2025)
- Have `placement: 1-8` (All-Americans)
- These are the top performers

### Non-Placers (Majority)
- Have `placement: null` or no placement field
- Still valuable data - they competed at a national tournament
- Shows participation history

## Import Strategy

### Import All Participants

**Why:**
- Complete tournament history
- Rankings benefit from participation data
- Profiles show full national tournament experience
- You already have placers from 1990+, this adds participation context

**What Gets Imported:**
- All entries from your JSON
- `placement` = `1-8` for placers
- `placement` = `null` for non-placers

## Display Logic

### On Profile Pages

**For Placers:**
```
2025 NHSCA: 3rd Place (Junior, 138lbs) - Record: 7-1
```

**For Non-Placers:**
```
2025 NHSCA: Participated (Junior, 138lbs) - Record: 2-2
```

### In Rankings

- **Placers:** Counted as All-Americans (high value)
- **Non-Placers:** Counted as national tournament participation (moderate value)
- Both contribute to ranking scores

## Auto-Fetch Behavior

When users create profiles, the system will:
1. Search `nhsca_placements` by name
2. Return ALL matches (placers and non-placers)
3. Display appropriately:
   - Placers: Show placement (Champion, Finalist, 3rd, etc.)
   - Non-Placers: Show "Participated"

## Benefits

1. **Complete History** - See all NHSCA participation, not just placers
2. **Rankings** - Participation data improves ranking accuracy
3. **Profiles** - Shows full national tournament experience
4. **Context** - Understand athlete's complete tournament journey

## Example Profile Display

```
NHSCA Tournament History:
- 2025: Participated (Senior, 157lbs) - 3-2
- 2024: 3rd Place (Junior, 152lbs) - 5-1
- 2023: Participated (Sophomore, 145lbs) - 2-2
```

This shows:
- They've competed at NHSCA 3 years
- They placed once (2024)
- Complete participation history

## Import Process

1. **Import all entries** (placers + non-placers)
2. **Placement field:**
   - `1-8` for placers
   - `null` for non-placers
3. **Auto-fetch** will return all matches
4. **Display** will show appropriately

## Summary

✅ Import **ALL participants** (not just placers)
✅ `placement` = `null` for non-placers is correct
✅ System handles both placers and non-placers
✅ Profiles show complete tournament history
✅ Rankings benefit from participation data

