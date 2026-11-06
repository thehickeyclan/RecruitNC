#!/usr/bin/env bash
#
# Import one of Muse's state containers end to end, from the zip.
#
# Matt wants all fifty states live by Sunday 8 November 2026, and the first five cost a failed run
# each because no two containers were laid out the same way: Nebraska and Colorado put bouts in
# bouts/, Idaho in csv/, Utah loose at the top level. This finds the files wherever they are, runs
# the chain in the order the import playbook sets, and prints one summary per state.
#
#   scripts/import-state-container.sh UT ~/Downloads/UT-import-package.zip            # dry run
#   scripts/import-state-container.sh UT ~/Downloads/UT-import-package.zip --write
#
# A container holding only final-qualifiers/ is treated as a year container: it fills grad years
# in place rather than re-importing the slice, because a rebuilt file carries none of the profile
# links added since the original import and the importer rightly refuses to drop them.
#
# The state must already be in lib/recruiting/brand.ts and the association map in
# lib/athlete-state.ts. That is a code change and stays a human one.
set -euo pipefail

STATE="${1:?usage: import-state-container.sh <XX> <zip> [--write]}"
ZIP="${2:?usage: import-state-container.sh <XX> <zip> [--write]}"
WRITE_FLAG=""
[[ "${3:-}" == "--write" ]] && WRITE_FLAG="--write"
STATE="$(echo "$STATE" | tr '[:lower:]' '[:upper:]')"

WORK="${SCRATCH:-/tmp}/state-import/$STATE"
rm -rf "$WORK"; mkdir -p "$WORK/unzipped" "$WORK/bouts"
unzip -q -o "$ZIP" -d "$WORK/unzipped"

# The container is untrusted data: nothing is executed from it, only read.
QUAL="$(find "$WORK/unzipped" -type d -name final-qualifiers | head -1)"
[[ -z "$QUAL" ]] && { echo "no final-qualifiers/ directory in $ZIP"; exit 1; }

# Bouts live in bouts/, in csv/, or loose at the root. Stage whatever is there into one directory.
found=0
for d in "$(find "$WORK/unzipped" -type d -name bouts | head -1)" "$(find "$WORK/unzipped" -type d -name csv | head -1)"; do
  if [[ -n "$d" && -d "$d" ]] && compgen -G "$d/*.csv" >/dev/null; then cp "$d"/*.csv "$WORK/bouts/"; found=1; break; fi
done
if [[ $found -eq 0 ]]; then
  while IFS= read -r f; do cp "$f" "$WORK/bouts/"; found=1; done < <(find "$WORK/unzipped" -maxdepth 2 -type f -name '*bouts*.csv')
fi

echo "=============================================================="
echo " $STATE  ${WRITE_FLAG:-(dry run)}"
echo " qualifiers: $(ls "$QUAL"/*.csv 2>/dev/null | wc -l | tr -d ' ') files   bouts: $(ls "$WORK/bouts"/*.csv 2>/dev/null | wc -l | tr -d ' ') files"
echo "=============================================================="

if [[ $found -eq 0 ]]; then
  # Year container: fill in place, never replace a slice that carries links.
  echo; echo "--- $STATE: no bout files, treating as a year container ---"
  npx tsx scripts/fill-qualifier-entrant-years.ts --state "$STATE" --dir "$QUAL" $WRITE_FLAG
  exit 0
fi

echo; echo "--- $STATE: qualifiers ---"
npx tsx scripts/import-state-qualifiers.ts "$QUAL"/*.csv $WRITE_FLAG

# The build's own grouping of keys into real athletes, where the container ships one. Without it
# the mint falls back to our matcher, and the matcher has already lost: Colorado minted five
# wrestlers twice (Ayla Hampton, Connor Simonds, Drake VomBaur, JR Ortega, Oz Nowick, Renee
# Hudson) because the first five containers were run without this flag. A canonical id only ever
# joins keys, so passing it cannot merge two different wrestlers.
CANON_FLAG=()
MINTLIST="$(find "$WORK/unzipped" -maxdepth 2 -type f -name "${STATE}-mint-list.csv" | head -1)"
if [[ -n "$MINTLIST" ]] && head -1 "$MINTLIST" | grep -q canonical_athlete_id; then
  CANON_FLAG=(--canonical "$MINTLIST")
  echo "  canonical grouping: $(basename "$MINTLIST")"
else
  echo "  canonical grouping: NONE SHIPPED (matcher is the only guard)"
fi

for SEASON in 2026 2025 2024; do
  echo; echo "--- $STATE: mint $SEASON ---"
  # bash 3.2 ships on macOS and treats an empty array as unset under `set -u`, so the expansion
  # below is the only form that survives both an empty and a populated CANON_FLAG.
  npx tsx scripts/mint-state-placer-profiles.ts --state "$STATE" --season "$SEASON" --only-with-class-year ${CANON_FLAG[@]+"${CANON_FLAG[@]}"} $WRITE_FLAG
done

echo; echo "--- $STATE: bouts ---"
npx tsx scripts/import-state-championship-bouts.ts --state "$STATE" --dir "$WORK/bouts" $WRITE_FLAG

if [[ -n "$WRITE_FLAG" ]]; then
  # The accounted file goes in BEFORE the gate reads it. Run the other way round and the gate
  # judges the state against the previous file, or against none: Alaska read 93 of 170 placers
  # accounted and Montana's would have read the same, when both in fact name every one.
  ACC="$(find "$WORK/unzipped" -maxdepth 2 -type f -name "${STATE}-accounted.json" | head -1)"
  if [[ -n "$ACC" ]]; then cp "$ACC" "docs/state-launch/${STATE}-accounted.json"; echo "  accounted file copied in"; fi
  echo; echo "--- $STATE: readiness ---"
  npx tsx scripts/state-readiness.ts --state "$STATE" --all | grep -E "GATE|INFO" || true
fi
