#!/usr/bin/env python3
"""
Import Team North Carolina's Junior National Duals bouts (Muse's Flo transcription) into
other_tournament_results + other_tournament_bouts. Each style is a duals row in the profile's and
the scouting report's Olympic Styles section, under Dual results, with every bout and the
opponents' accolades.

The source prints names abbreviated - "C. Raper" vs "J. Brechler" - and opponents' teams as codes
(FLOR, TA, GEOR...). So:
  - Our wrestler is named in full from Team NC's own roster - the same kids' Fargo bouts, which
    print full names - and only then linked to a profile, by that full name. Initial + surname alone
    is not enough: "C. Goucher" is Christopher Goucher, who has no profile, not Cole Goucher, who
    does. An abbreviation the roster cannot resolve to one name is not stored.
  - The opponent's team code becomes his state ("FLOR" -> "FL"), stored as opponent_club: the
    evidence the profile's accolade rules read.
  - The opponent's name is expanded to a full name only when exactly one placer, event placer or
    nationally ranked wrestler from that state carries that surname and initial; otherwise it stays
    as printed, and no accolade can attach to it.
  - Duals have no placement; the record is the result.

The 16U National Duals file (USA Bracketing) prints full names and team codes like NOCA/UTBL:
full names link straight to a profile, and are never "expanded".

  python3 scripts/import-junior-duals.py ~/Downloads/junior-duals-2026-freestyle-bouts.csv \\
      --year 2026 --date 2026-06-18 [--dry-run]
  python3 scripts/import-junior-duals.py ~/Downloads/16u-duals-2026-greco-bouts.csv \\
      --year 2026 --date 2026-06-09 --slug 16u-national-duals --short "16U National Duals" --state UT
"""

import collections
import csv
import importlib.util
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEAM_STATE = {
    "FLOR": "FL", "TA": "AL", "SDR": "SD", "TIB": "IN", "ARKA": "AR", "TKS": "KS", "MISS": "MO",
    "GEOR": "GA", "TM": "MD", "OR": "OK", "CG": "CA", "WASH": "WA", "NC": "NC", "NOCA": "NC",
    # 16U National Duals (USA Bracketing's four-letter codes)
    "UTBL": "UT", "ARIZ": "AZ", "NEBR": "NE", "OKRE": "OK", "IOBL": "IA", "VIRG": "VA", "WYBR": "WY",
    "WYGO": "WY", "TEXA": "TX", "PENN": "PA",
}
OUR_TEAMS = {"NC", "NOCA"}
ABBREVIATED = re.compile(r"^[A-Za-z]\.\s")
CODES = {"fall": "F", "tf": "TF", "dec": "DEC", "md": "MD", "forfeit": "FF", "inj": "INJ"}


def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


def main():
    files = [a for i, a in enumerate(sys.argv[1:], start=1)
             if not a.startswith("--") and sys.argv[i - 1] not in ("--year", "--date", "--slug", "--short", "--state")]
    year, date = arg("--year"), arg("--date")
    if len(files) != 1 or not year or not date:
        sys.exit(__doc__)
    path = os.path.expanduser(files[0])
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))

    spec = importlib.util.spec_from_file_location("fargo", os.path.join(ROOT, "scripts", "import-fargo-bouts.py"))
    fargo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(fargo)
    fargo.load_env()
    db = fargo.Db()
    key = fargo.name_key

    def initial_surname(name):
        w = key(name).split()
        w = [x for x in w if x not in {"jr", "sr", "ii", "iii", "iv"}]
        return (w[0][0], w[-1]) if len(w) >= 2 else None

    # Our side: Team NC's full names from its Fargo bouts, then a profile by that full name.
    roster = collections.defaultdict(dict)  # (initial, surname) -> {full name key: (name, athlete_id)}
    for b in db.get_all("other_tournament_bouts?select=athlete_name,athlete_id&event_key=like.fargo-*"):
        k = initial_surname(b["athlete_name"])
        if k:
            prev = roster[k].get(key(b["athlete_name"]))
            roster[k][key(b["athlete_name"])] = (b["athlete_name"], b["athlete_id"] or (prev[1] if prev else None))

    # Fallback for a wrestler not in the Fargo roster: the one NC profile with that initial and
    # surname, and only when its listed weight fits the dual weight ("K. Morrison" at 285).
    profiles = collections.defaultdict(list)
    for a in db.get_all("athletes?select=id,name,weightclass&is_nc_athlete=eq.true"):
        k = initial_surname(a["name"]) if a.get("name") else None
        if k:
            profiles[k].append(a)

    def weight_fits(listed, dual):
        try:
            listed, dual = float(re.sub(r"[^0-9.]", "", str(listed)) or 0), float(re.sub(r"[^0-9.]", "", str(dual)) or 0)
        except ValueError:
            return False
        return listed > 0 and dual > 0 and 0.85 * listed <= dual <= 1.2 * listed

    by_name = collections.defaultdict(set)
    for a in db.get_all("athletes?select=id,name,wrestling_name&is_nc_athlete=eq.true"):
        for n in (a.get("name"), a.get("wrestling_name")):
            if n:
                by_name[key(n)].add(a["id"])

    def our_wrestler(abbrev, weight):
        """(full name, profile id or None), or None when it cannot be said which wrestler it is."""
        if not ABBREVIATED.match(abbrev):
            # A full name: its own profile, else the one Fargo roster spelling it matches.
            ids = by_name.get(key(abbrev), set())
            if len(ids) == 1:
                return abbrev, next(iter(ids))
            for full, aid in roster.get(initial_surname(abbrev) or ("", ""), {}).values():
                if key(full) == key(abbrev):
                    return full, aid
            return (abbrev, None)
        k = initial_surname(abbrev) or ("", "")
        names = roster.get(k, {})
        if len(names) == 1:
            return next(iter(names.values()))
        if names:
            return None
        fits = [a for a in profiles.get(k, []) if weight_fits(a.get("weightclass"), weight)]
        return (fits[0]["name"], fits[0]["id"]) if len(profiles.get(k, [])) == 1 and len(fits) == 1 else None

    # Their side: placers, event placers and ranked wrestlers by (state, initial, surname).
    known = collections.defaultdict(set)
    for p in db.get_all("state_tournament_placers?select=state,wrestler_name"):
        k = initial_surname(p["wrestler_name"])
        if k:
            known[(p["state"],) + k].add(p["wrestler_name"].strip())
    for p in db.get_all("national_event_placers?select=state,wrestler_name&state=not.is.null"):
        k = initial_surname(p["wrestler_name"])
        if k:
            known[(p["state"],) + k].add(p["wrestler_name"].strip())
    for p in db.get_all("national_rankings?select=state,athlete_name"):
        k = initial_surname(p["athlete_name"])
        if k and p.get("state"):
            known[(p["state"],) + k].add(p["athlete_name"].strip())

    def full_name(abbrev, state):
        if not ABBREVIATED.match(abbrev):
            return abbrev
        k = initial_surname(abbrev)
        names = known.get((state,) + k, set()) if k and state else set()
        # One distinct full name: the same wrestler under every source.
        distinct = {key(n): n for n in names}
        return next(iter(distinct.values())) if len(distinct) == 1 else abbrev

    tournament = rows[0]["tournament"]
    event_name = tournament
    style = "gr" if "greco" in tournament.lower() else "fs"
    event_key = f"{arg('--slug') or 'junior-national-duals'}-{year}-{style}"
    results, bouts, unlinked, expanded = {}, [], collections.Counter(), 0
    order = collections.Counter()
    for r in rows:
        for side, other in (("winner", "loser"), ("loser", "winner")):
            if r[f"{side}_team"].strip() not in OUR_TEAMS:
                continue
            abbrev = r[f"{side}_name"].strip()
            found = our_wrestler(abbrev, r["weight"])
            if not found or not found[1]:
                unlinked[f"{abbrev} ({'not on the roster or ambiguous' if not found else found[0] + ', no profile'})"] += 1
                continue
            me, athlete_id = found
            opp_team = r[f"{other}_team"].strip()
            state = TEAM_STATE.get(opp_team)
            opp = full_name(r[f"{other}_name"].strip(), state)
            expanded += opp != r[f"{other}_name"].strip()
            rk = (athlete_id, r["weight"])
            res = results.setdefault(rk, {
                "event_key": event_key, "event_name": event_name, "event_short_name": arg("--short") or "Junior National Duals",
                "event_state": arg("--state") or "OK", "event_date": date, "year": int(year), "athlete_name": me, "athlete_id": athlete_id,
                "club": "Team North Carolina", "high_school": None, "gender": None, "weight_class": r["weight"].strip(),
                "wins": 0, "losses": 0, "byes": 0, "record": "", "placement": None, "qualified": False, "entrants": None,
                "source_file": os.path.basename(path), "verification_status": "verified",
            })
            won = side == "winner"
            res["wins" if won else "losses"] += 1
            order[rk] += 1
            bouts.append({
                "event_key": event_key, "event_name": event_name, "event_date": date, "year": int(year),
                "weight_class": r["weight"].strip(), "round": r["round"].strip(), "source_round": r["round"].strip(),
                "bout_order": order[rk], "athlete_name": me, "athlete_id": athlete_id, "athlete_club": "NC",
                "opponent_name": opp, "opponent_id": None, "opponent_club": state or opp_team or None,
                "win": won, "is_bye": False,
                "win_type": CODES.get(r["result_type"].strip().lower(), r["result_type"].strip().upper()),
                "score": " ".join(x for x in (r["score"].strip(), r["time"].strip()) if x),
                "source_file": os.path.basename(path),
            })
    for res in results.values():
        res["record"] = f"{res['wins']}-{res['losses']}"

    print(f"{os.path.basename(path)}: {len(rows)} bouts -> {len(bouts)} NC bout rows for {len(results)} wrestlers; "
          f"{expanded} opponents named in full from that state's placers/rankings")
    if unlinked:
        print("  not linked:", dict(unlinked))
    if "--dry-run" in sys.argv:
        for b in bouts[:6]:
            print("  ", b["athlete_name"], "W" if b["win"] else "L", b["win_type"], b["score"], "vs", b["opponent_name"], b["opponent_club"])
        print("Dry run — nothing written.")
        return
    for table in ("other_tournament_bouts", "other_tournament_results"):
        db.request("DELETE", f"{table}?event_key=eq.{urllib.parse.quote(event_key)}", prefer="return=minimal")
    db.request("POST", "other_tournament_results", list(results.values()), "return=minimal")
    db.request("POST", "other_tournament_bouts", bouts, "return=minimal")
    print("Written.")


if __name__ == "__main__":
    main()
