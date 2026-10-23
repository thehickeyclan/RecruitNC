"""
Muse's coach backgrounds (23 Oct 2026) -> lib/college-programs/coach-backgrounds-2026-27.json.

    python3 -I scripts/import-coach-backgrounds.py ~/Downloads/coach-backgrounds.csv

Head and assistant coaches only, from each coach's own bio page on the athletics site: the year
they started at the school, previous coaching jobs, where they wrestled and their best college
result. A field the bio does not state is left out, never filled in. Keyed by our school id and the
coach's name as staff-2026-27.json spells it.
"""
import csv, json, re, sys

key = lambda s: re.sub(r"[^a-z]", "", s.lower().replace("&", "and"))
nk = lambda s: re.sub(r"[^a-z]", "", s.lower())
ids = {key(s["name"]): s["id"] for s in json.load(open("lib/college-programs/programs-2026-27.json"))["schools"]}
staff = json.load(open("lib/college-programs/staff-2026-27.json"))["staff"]

out, skipped = {}, 0
for r in csv.DictReader(open(sys.argv[1], encoding="utf-8-sig")):
    sid = ids.get(key(r["school"]))
    if not sid:
        skipped += 1; continue
    match = next((m for m in staff.get(sid, []) if nk(m["name"]) == nk(r["coach_name"])), None)
    if not match:
        skipped += 1; continue
    started = r["started_year"].strip()
    entry = {
        "name": match["name"],
        "started": int(started) if re.fullmatch(r"(19|20)\d\d", started) else None,
        "previous": r["previous_coaching_jobs"].strip() or None,
        "wrestled": r["college_wrestled"].strip() or None,
        "best": r["best_college_result"].strip() or None,
        "source": r["source_url"].strip() or None,
    }
    if not any(entry[k] for k in ("started", "previous", "wrestled", "best")):
        continue  # no bio found: nothing to say beyond what staff already holds
    out.setdefault(sid, []).append(entry)

path = "lib/college-programs/coach-backgrounds-2026-27.json"
json.dump({"source": "Muse, coach bio pages on each athletics site, 23 Oct 2026", "coaches": out}, open(path, "w"), indent=1, ensure_ascii=False)
open(path, "a").write("\n")
print(f"{sum(len(v) for v in out.values())} coaches with a background at {len(out)} programs; skipped {skipped}")
