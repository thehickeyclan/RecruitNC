#!/usr/bin/env python3
"""
Import North Carolina freestyle / Greco-Roman events transcribed from USA Bracketing (Muse's format)
into other_tournament_results + other_tournament_bouts, so each event is a row on the profile and
the scouting report - in their Freestyle & Greco-Roman sections - with every bout and the
opponents' accolades, and wins feed Significant wins.

CSV columns: tournament, weight, round, bout_number, winner_name, winner_team, loser_name,
loser_team, result_type, score, time. "tournament" is "<year> <event> - <division>", e.g.
"2026 Tar Heel State Classic - Junior Boys Freestyle".

  - High-school divisions only: 16U and Junior, boys and girls. No middle-school results anywhere
    (14U and younger), and no open/masters adults.
  - Wrestlers link to a profile by exact name, else a unique surname + compatible first name (the
    site's nickname rule), else an exact full name among all profiles. Only linked wrestlers are
    stored; both sides of an NC-vs-NC bout get their own row.
  - Placement only where the bracket proves it: 1st/3rd/5th/7th place matches. Round-robin pools
    have none, so those rows carry a record and no place rather than a guessed one.
  - One event key per event and division (tarheel-classic-2026-junior-boys-fs); each run replaces
    the keys its file contains.

  python3 scripts/import-usab-freestyle-events.py ~/Downloads/tarheel-2026-freestyle-bouts.csv \\
      --slug tarheel-classic --date 2026-04-18 [--dry-run]
"""

import collections
import csv
import importlib.util
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP = re.compile(r"\b(16U|Junior)\b", re.I)
PLACE_MATCH = {"1st place match": (1, 2), "3rd place match": (3, 4), "5th place match": (5, 6), "7th place match": (7, 8)}
CODES = {"fall": "F", "tf": "TF", "dec": "DEC", "md": "MD", "ff": "FF", "for": "FF", "forfeit": "FF", "inj": "INJ", "dq": "DQ"}


def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


def fargo_module():
    spec = importlib.util.spec_from_file_location("fargo", os.path.join(ROOT, "scripts", "import-fargo-bouts.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    files = [a for i, a in enumerate(sys.argv[1:], start=1)
             if not a.startswith("--") and sys.argv[i - 1] not in ("--slug", "--date")]
    slug, date = arg("--slug"), arg("--date")
    if len(files) != 1 or not slug or not date:
        sys.exit(__doc__)
    path = os.path.expanduser(files[0])
    rows = [r for r in csv.DictReader(open(path, encoding="utf-8-sig")) if KEEP.search(r["tournament"])]
    year = int(date[:4])

    fargo = fargo_module()
    fargo.load_env()
    db = fargo.Db()
    key = fargo.name_key
    profiles, by_surname, anyone = collections.defaultdict(set), collections.defaultdict(list), collections.defaultdict(set)
    for a in db.get_all("athletes?select=id,name,wrestling_name,highschool,gender,is_nc_athlete"):
        names = [n for n in (a.get("name"), a.get("wrestling_name")) if n]
        for n in names:
            anyone[key(n)].add(a["id"])
            if a.get("is_nc_athlete"):
                profiles[key(n)].add(a["id"])
                w = key(n).split()
                if len(w) >= 2:
                    by_surname[w[-1]].append((w[0], a["id"]))
    groups = fargo.nickname_groups()

    def link(name):
        ids = profiles.get(key(name), set())
        if not ids:
            w = key(name).split()
            if len(w) >= 2:
                ids = {i for f, i in by_surname.get(w[-1], []) if fargo.first_names_alike(w[0], f, groups)}
        if not ids:
            ids = anyone.get(key(name), set())
        return next(iter(ids)) if len(ids) == 1 else None

    def event_parts(tournament):
        name, division = tournament.split(" - ", 1)
        style = "gr" if "greco" in division.lower() else "fs"
        div_slug = re.sub(r"[^a-z0-9]+", "-", division.lower().replace("freestyle", "").replace("greco", "")).strip("-")
        return f"{slug}-{year}-{div_slug}-{style}", tournament, re.sub(r"^\d{4}\s+", "", name)

    entrants = collections.defaultdict(set)
    for r in rows:
        entrants[(r["tournament"], r["weight"])] |= {r["winner_name"].strip(), r["loser_name"].strip()} - {""}

    bouts, results, unlinked = [], {}, collections.Counter()
    order = collections.Counter()
    for r in sorted(rows, key=lambda r: int(r["bout_number"] or 0)):
        event_key, event_name, short = event_parts(r["tournament"])
        places = PLACE_MATCH.get(r["round"].strip().lower())
        code = CODES.get(r["result_type"].strip().lower(), r["result_type"].strip().upper())
        score = " ".join(x for x in (r["score"].strip(), r["time"].strip()) if x)
        for side, other in (("winner", "loser"), ("loser", "winner")):
            me = r[f"{side}_name"].strip()
            if not me:
                continue
            athlete_id = link(me)
            if not athlete_id:
                unlinked[me] += 1
                continue
            rk = (event_key, r["weight"], athlete_id)
            res = results.setdefault(rk, {
                "event_key": event_key, "event_name": event_name, "event_short_name": short, "event_state": "NC",
                "event_date": date, "year": year, "athlete_name": me, "athlete_id": athlete_id,
                "club": r[f"{side}_team"].strip() or None, "high_school": None, "gender": None,
                "weight_class": r["weight"].strip(), "wins": 0, "losses": 0, "byes": 0, "record": "",
                "placement": None, "qualified": False, "entrants": len(entrants[(r["tournament"], r["weight"])]),
                "source_file": os.path.basename(path), "verification_status": "verified",
            })
            won = side == "winner"
            res["wins" if won else "losses"] += 1
            if places:
                res["placement"] = places[0] if won else places[1]
            order[rk] += 1
            opp = r[f"{other}_name"].strip() or None
            bouts.append({
                "event_key": event_key, "event_name": event_name, "event_date": date, "year": year,
                "weight_class": r["weight"].strip(), "round": r["round"].strip(), "source_round": r["round"].strip(),
                "bout_order": order[rk], "athlete_name": me, "athlete_id": athlete_id,
                "athlete_club": r[f"{side}_team"].strip() or None, "opponent_name": opp, "opponent_id": link(opp) if opp else None,
                "opponent_club": r[f"{other}_team"].strip() or None, "win": won, "is_bye": not opp,
                "win_type": code, "score": score, "source_file": os.path.basename(path),
            })
    for res in results.values():
        res["record"] = f"{res['wins']}-{res['losses']}"

    keys = sorted({b["event_key"] for b in bouts} | {e for e, _, _ in (event_parts(r["tournament"]) for r in rows)})
    placed = sum(1 for r in results.values() if r["placement"])
    print(f"{os.path.basename(path)}: {len(rows)} 16U/Junior bouts -> {len(results)} results, {len(bouts)} bout rows "
          f"for {len({r['athlete_id'] for r in results.values()})} wrestlers with a profile; {placed} with a proven placement")
    print(f"  {len(unlinked)} names with no profile (not stored)")
    if "--dry-run" in sys.argv:
        for res in list(results.values())[:6]:
            print("  ", res["athlete_name"], res["event_name"], res["weight_class"], res["record"], res["placement"])
        print("Dry run — nothing written.")
        return
    for k in keys:
        for table in ("other_tournament_bouts", "other_tournament_results"):
            db.request("DELETE", f"{table}?event_key=eq.{urllib.parse.quote(k)}", prefer="return=minimal")
    payload = list(results.values())
    for i in range(0, len(payload), 250):
        db.request("POST", "other_tournament_results", payload[i:i + 250], "return=minimal")
    for i in range(0, len(bouts), 250):
        db.request("POST", "other_tournament_bouts", bouts[i:i + 250], "return=minimal")
    print("Written.")


if __name__ == "__main__":
    main()
