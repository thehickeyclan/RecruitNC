#!/usr/bin/env python3
"""
Import an out-of-state state-tournament workbook into Supabase
(state_tournament_divisions / state_tournament_bouts / state_tournament_placers).

Workbook layout (the collector template):
  events_and_divisions  one row per class: places awarded, class rank, dates
  matches               one row per placement bout (1st/3rd/5th/7th) — the only sheet trusted for names
  placers               read only for matching fields (school clean, city, grade, grad year, athlete id);
                        its name/school columns are formulas and are ignored — placers are derived from matches

The workbook is the full truth for every division it contains: those divisions' bouts and placers are
replaced on each run, so re-running with a more complete file (e.g. 5th/6th added) just fills in.

Prerequisite: run scripts/create-state-tournament-results.sql in the Supabase SQL Editor.

  python3 scripts/import-state-tournament-results.py "~/Downloads/Virginia 2026 Wrestling Results.xlsx" --dry-run
  python3 scripts/import-state-tournament-results.py "~/Downloads/Virginia 2026 Wrestling Results.xlsx"
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULT_TYPES = {"F", "TF", "MD", "DEC", "SV", "TB", "UTB", "INJ", "DQ", "FF"}
BOUT_PLACES = {"1st": (1, 2), "3rd": (3, 4), "5th": (5, 6), "7th": (7, 8)}
DIVISION_KEY = ("season", "state", "association", "gender", "classification")


def load_env():
    for name in (".env.local", ".env"):
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        for line in open(path):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            val = val.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), val)


def text(v):
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    s = str(v).strip()
    if not s or s.startswith("="):
        return None
    return s


def normalize_class(raw):
    s = text(raw)
    m = re.fullmatch(r"Class\s+(\d)", s or "", re.I)
    return f"{m.group(1)}A" if m else s


def sheet_rows(wb, name):
    rows = list(wb[name].iter_rows(values_only=True))
    header = [text(h) for h in rows[0]]
    return [dict(zip(header, r)) for r in rows[1:]]


def read_workbook(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    errors = []

    divisions = {}
    for r in sheet_rows(wb, "events_and_divisions"):
        if not isinstance(r.get("Season"), (int, float)):
            continue  # blank spacer or the trailing NOTE row
        d = {
            "season": int(r["Season"]),
            "state": text(r["State"]),
            "association": text(r["Association"]),
            "gender": text(r["Gender"]),
            "classification": normalize_class(r["Classification"]),
            "class_rank": int(r["Class Rank (1 = largest)"]) if r.get("Class Rank (1 = largest)") else None,
            "classes_in_state": int(r["Classes in State"]) if r.get("Classes in State") else None,
            "brackets": int(r["Brackets"]) if r.get("Brackets") else None,
            "places_awarded": int(r["Places Awarded"]),
            "tournament_dates": text(r.get("Tournament Dates")),
            "source_url": text(r.get("Bracket Source URL")),
        }
        divisions[tuple(d[k] for k in DIVISION_KEY)] = d

    bouts = []
    for i, r in enumerate(sheet_rows(wb, "matches"), start=2):
        winner, loser = text(r.get("Winner")), text(r.get("Loser"))
        if not winner and not loser:
            continue  # bout row not collected yet
        b = {
            "season": int(r["Season"]),
            "state": text(r["State"]),
            "association": text(r["Association"]),
            "gender": text(r["Gender"]),
            "classification": normalize_class(r["Classification"]),
            "weight": text(r["Weight"]),
            "bout": text(r["Bout (1st/3rd/5th/7th)"]),
            "winner_name": winner,
            "winner_school": text(r.get("Winner School")),
            "loser_name": loser,
            "loser_school": text(r.get("Loser School")),
            "result_type": text(r.get("Result Type")),
            "score": text(r.get("Score")),
            "fall_time": text(r.get("Fall Time")),
            "source_url": text(r.get("Source URL")),
        }
        where = f"matches row {i} ({b['classification']} {b['weight']} {b['bout']})"
        div = divisions.get(tuple(b[k] for k in DIVISION_KEY))
        if not winner or not loser:
            errors.append(f"{where}: winner or loser missing")
        if b["bout"] not in BOUT_PLACES:
            errors.append(f"{where}: bout must be 1st/3rd/5th/7th")
        elif div and BOUT_PLACES[b["bout"]][1] > div["places_awarded"]:
            errors.append(f"{where}: bout deeper than places_awarded={div['places_awarded']}")
        if not div:
            errors.append(f"{where}: no events_and_divisions row for this class")
        if b["result_type"] and b["result_type"] not in RESULT_TYPES:
            errors.append(f"{where}: result type {b['result_type']!r} is not a fixed code")
        if b["result_type"] == "F" and not b["fall_time"]:
            errors.append(f"{where}: fall without a fall time")
        bouts.append(b)

    seen = defaultdict(int)
    for b in bouts:
        seen[tuple(b[k] for k in DIVISION_KEY) + (b["weight"], b["bout"])] += 1
    errors += [f"duplicate bout {k}" for k, n in seen.items() if n > 1]

    extras = {}
    if "placers" in wb.sheetnames:
        for r in sheet_rows(wb, "placers"):
            if not isinstance(r.get("Season"), (int, float)):
                continue
            key = (normalize_class(r["Classification"]), text(r["Weight"]), int(r["Place"]))
            grad = text(r.get("Grad Year"))
            extras[key] = {
                "school_clean": text(r.get("School (clean)")),
                "city": text(r.get("City")),
                "grade": text(r.get("Grade")),
                "grad_year": int(grad) if grad and grad.isdigit() else None,
                "source_athlete_id": text(r.get("Athlete ID")),
                "source_athlete_id_source": text(r.get("Athlete ID Source")),
            }

    placers = []
    for b in bouts:
        if b["bout"] not in BOUT_PLACES:
            continue
        win_place, lose_place = BOUT_PLACES[b["bout"]]
        for place, name, school in ((win_place, b["winner_name"], b["winner_school"]),
                                    (lose_place, b["loser_name"], b["loser_school"])):
            row = {k: b[k] for k in DIVISION_KEY + ("weight",)}
            row.update(place=place, wrestler_name=name, school_raw=school, source_url=b["source_url"])
            row.update(extras.get((b["classification"], b["weight"], place), {}))
            placers.append(row)

    return divisions, bouts, placers, errors


def coverage(divisions, bouts):
    lines = []
    for key, d in divisions.items():
        got = sum(1 for b in bouts if tuple(b[k] for k in DIVISION_KEY) == key)
        expected = (d["brackets"] or 0) * ((d["places_awarded"] + 1) // 2)
        lines.append(f"  {d['state']} {d['season']} {d['gender']} {d['classification']}: "
                     f"{got}/{expected} placement bouts, {got * 2}/{expected * 2} placers")
    return "\n".join(lines)


class Supabase:
    def __init__(self):
        self.url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")

    def request(self, method, table, query="", body=None, prefer=None):
        req = urllib.request.Request(f"{self.url}/rest/v1/{table}{query}", method=method,
                                     data=json.dumps(body).encode() if body is not None else None)
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        if prefer:
            req.add_header("Prefer", prefer)
        try:
            with urllib.request.urlopen(req) as res:
                return res.read()
        except urllib.error.HTTPError as e:
            sys.exit(f"{method} {table} failed: {e.code} {e.read().decode()}")

    def division_filter(self, key):
        return "?" + "&".join(f"{k}=eq.{urllib.parse.quote(str(v))}" for k, v in zip(DIVISION_KEY, key))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    path = os.path.expanduser(args[0])
    divisions, bouts, placers, errors = read_workbook(path)

    print(f"{os.path.basename(path)}: {len(divisions)} divisions, {len(bouts)} bouts, {len(placers)} placers")
    print(coverage(divisions, bouts))
    if errors:
        print(f"\n{len(errors)} problem(s) — nothing written:")
        print("\n".join(f"  {e}" for e in errors))
        sys.exit(1)
    if "--dry-run" in sys.argv:
        print("\nDry run — nothing written.")
        return

    load_env()
    db = Supabase()
    db.request("POST", "state_tournament_divisions", "?on_conflict=" + ",".join(DIVISION_KEY),
               list(divisions.values()), "resolution=merge-duplicates,return=minimal")
    for key in divisions:
        for table in ("state_tournament_placers", "state_tournament_bouts"):
            db.request("DELETE", table, db.division_filter(key), prefer="return=minimal")
    db.request("POST", "state_tournament_bouts", "", bouts, "return=minimal")
    db.request("POST", "state_tournament_placers", "", placers, "return=minimal")
    print("\nWritten.")


if __name__ == "__main__":
    main()
