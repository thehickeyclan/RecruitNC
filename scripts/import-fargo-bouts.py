#!/usr/bin/env python3
"""
Import Fargo bouts for North Carolina wrestlers into other_tournament_bouts, so a profile's Fargo
row opens into its matches - opponents, results, and each opponent's accolades - and the wins feed
Significant wins like every other event's.

CSV columns (Muse's collector format):
  division, weight, round, bout_number, winner_name, winner_state, loser_name, loser_state,
  result_type, score, time

  - One event key per division and year: fargo-2026-16u-fs, fargo-2026-junior-gr. Each run
    replaces the keys its file contains, so a corrected file never duplicates.
  - No other_tournament_results rows: fargo_results already gives the profile its Fargo row, and
    these bouts hang under it (lib/profile/tournament-rows.ts).
  - NC wrestlers link to a profile by exact name (or wrestling name) among NC athletes, and only
    when exactly one profile carries it. An unlinked bout is still written; it just reaches no
    profile until the name is fixed.
  - Opponents carry their state ("MT"), which is the evidence the out-of-state placer and national
    ranking rules read.

  python3 scripts/import-fargo-bouts.py ~/Downloads/fargo-2026-nc-bouts.csv --year 2026 [--dry-run]
"""

import collections
import csv
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Fargo is wrestled in mid-July; the date only places a bout in its season and the 12-month window.
EVENT_DATE = "{year}-07-15"
# --all-states keeps the whole national field instead of North Carolina alone; see
# scripts/import-nhsca-nationals-bouts.ts for the reasoning. An unresolved wrestler is still
# recorded, with a null athlete_id and her state in athlete_club.
ALL_STATES = "--all-states" in sys.argv

RESULT_CODES = {"fall": "F", "tf": "TF", "dec": "DEC", "md": "MD", "forfeit": "FF", "for": "FF", "inj": "INJ", "dq": "DQ"}


def load_env():
    for name in (".env.local", ".env"):
        path = os.path.join(ROOT, name)
        if os.path.exists(path):
            for line in open(path):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def name_key(value):
    return " ".join(re.sub(r"[^a-z ]", "", re.sub(r"[-'.]", " ", str(value or "").lower())).split())


def nickname_groups():
    """ATHLETE_FIRST_NAME_EQUIVALENT_GROUPS, read from the TypeScript so the two never drift."""
    src = open(os.path.join(ROOT, "lib", "athlete-name-match.ts")).read()
    block = src.split("ATHLETE_FIRST_NAME_EQUIVALENT_GROUPS", 1)[1].split("]\n]", 1)[0]
    return [{n.lower() for n in re.findall(r'"([^"]+)"', g)} for g in re.findall(r"\[([^\[\]]+)\]", block)]


def first_names_alike(a, b, groups):
    """Mirror of firstNamesLikelySame: equal, a 3+ letter prefix, or one nickname group."""
    if a == b or (len(a) >= 3 and b.startswith(a)) or (len(b) >= 3 and a.startswith(b)):
        return True
    return any(a in g and b in g for g in groups)


# Fargo's national export spells the state out; our own collector sent the code. Both reach here.
STATE_CODES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "district of columbia": "DC",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL",
    "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
    "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
    "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA",
    "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
}


def state_code(value):
    """'ILLINOIS' and 'IL' both become 'IL'; anything else is left as written."""
    v = (value or "").strip()
    if len(v) == 2:
        return v.upper()
    return STATE_CODES.get(v.lower(), v.upper())


def event_parts(division):
    """'Junior Boys Freestyle' -> ('junior', 'fs', 'Junior Freestyle'); 'JR Girls' is junior too."""
    d = division.lower()
    # The girls' national brackets are labelled "JR Girls" and "16U Girls" - no style named, and
    # "jr" rather than "junior". Left alone, "JR Girls" made its own age division and its bouts
    # hung under a key no results row uses.
    age = "16u" if "16u" in d else "junior" if ("junior" in d or re.match(r"^jr\b", d)) else re.sub(r"\W+", "", d.split()[0])
    style = "gr" if "greco" in d else "fs"
    label = f"{'16U' if age == '16u' else age.title()} {'Greco-Roman' if style == 'gr' else 'Freestyle'}"
    return age, style, label


class Db:
    def __init__(self):
        self.url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    def request(self, method, path, body=None, prefer=None):
        req = urllib.request.Request(f"{self.url}/rest/v1/{path}", method=method,
                                     data=json.dumps(body).encode() if body is not None else None)
        for k, v in (("apikey", self.key), ("Authorization", f"Bearer {self.key}"), ("Content-Type", "application/json")):
            req.add_header(k, v)
        if prefer:
            req.add_header("Prefer", prefer)
        try:
            with urllib.request.urlopen(req) as res:
                text = res.read()
                return json.loads(text) if text else None
        except urllib.error.HTTPError as e:
            sys.exit(f"{method} {path} failed: {e.code} {e.read().decode()}")

    def get_all(self, path, page=1000):
        out, offset = [], 0
        while True:
            rows = self.request("GET", f"{path}&limit={page}&offset={offset}")
            out += rows
            offset += page
            if len(rows) < page:
                return out


def main():
    if "--year" not in sys.argv:
        sys.exit(__doc__)
    year_at = sys.argv.index("--year") + 1
    year = int(sys.argv[year_at])
    args = [a for i, a in enumerate(sys.argv[1:], start=1) if not a.startswith("--") and i != year_at]
    if len(args) != 1:
        sys.exit(__doc__)
    path = os.path.expanduser(args[0])
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))

    load_env()
    db = Db()
    profiles = collections.defaultdict(set)
    by_surname = collections.defaultdict(list)  # surname -> [(first name, id)]
    for a in db.get_all("athletes?select=id,name,wrestling_name&is_nc_athlete=eq.true"):
        for n in (a.get("name"), a.get("wrestling_name")):
            if n:
                profiles[name_key(n)].add(a["id"])
                words = name_key(n).split()
                if len(words) >= 2:
                    by_surname[words[-1]].append((words[0], a["id"]))
    groups = nickname_groups()
    # A North Carolinian whose profile is not flagged NC (Jack Harty): exact full name only.
    anyone = collections.defaultdict(set)
    for a in db.get_all("athletes?select=id,name"):
        if a.get("name"):
            anyone[name_key(a["name"])].add(a["id"])

    def profile_ids(name):
        """Exact name first; else the one profile with the same surname and a compatible first
        name - "Joshua Stonebraker" is the profile "Josh Stonebraker"."""
        exact = profiles.get(name_key(name), set())
        if exact:
            return exact
        words = name_key(name).split()
        if len(words) < 2:
            return set()
        alike = {i for first, i in by_surname.get(words[-1], []) if first_names_alike(words[0], first, groups)}
        return alike or anyone.get(name_key(name), set())

    out, unlinked, keys = [], collections.Counter(), set()
    per_wrestler = collections.Counter()
    for r in sorted(rows, key=lambda r: int(r["bout_number"] or 0)):
        age, style, label = event_parts(r["division"])
        key = f"fargo-{year}-{age}-{style}"
        keys.add(key)
        code = RESULT_CODES.get(r["result_type"].strip().lower(), r["result_type"].strip().upper())
        score = " ".join(x for x in (r["score"].strip(), r["time"].strip()) if x)
        for side, other in (("winner", "loser"), ("loser", "winner")):
            my_state = state_code(r[f"{side}_state"])
            if not ALL_STATES and my_state != "NC":
                continue
            me = r[f"{side}_name"].strip()
            if not me:
                continue
            ids = profile_ids(me)
            athlete_id = next(iter(ids)) if len(ids) == 1 else None
            if not athlete_id:
                unlinked[f"{me} ({'none' if not ids else 'ambiguous'})"] += 1
            opp = r[f"{other}_name"].strip() or None
            # Keyed with the state: two wrestlers of the same name from different states each need
            # their own bracket order, or one overwrites the other's.
            per_wrestler[(key, me, my_state)] += 1
            out.append({
                "event_key": key,
                "event_name": f"{year} Fargo {label}",
                "event_date": EVENT_DATE.format(year=year),
                "year": year,
                "weight_class": r["weight"].strip(),
                "round": r["round"].strip(),
                "source_round": r["round"].strip(),
                "bout_order": per_wrestler[(key, me, my_state)],
                "athlete_name": me,
                "athlete_id": athlete_id,
                "athlete_club": my_state or None,
                "opponent_name": opp,
                "opponent_id": None,
                "opponent_club": state_code(r[f"{other}_state"]) or None,
                "win": side == "winner",
                "is_bye": not opp,
                "win_type": code,
                "score": score,
                "source_file": os.path.basename(path),
            })

    wins = sum(1 for b in out if b["win"])
    label_scope = "bout rows" if ALL_STATES else "NC bout rows"
    print(f"{len(rows)} bouts -> {len(out)} {label_scope} ({wins}-{len(out) - wins}), "
          f"{len({(b['athlete_name'], b['athlete_club']) for b in out})} wrestlers, "
          f"{sum(1 for b in out if b['athlete_id'])} linked")
    print("event keys:", sorted(keys))
    if ALL_STATES:
        print("states:", len({b["athlete_club"] for b in out if b["athlete_club"]}))
    elif unlinked:
        # Naming them is useful for NC; under --all-states it is every other state's field.
        print("not linked to a profile:", dict(unlinked))
    if "--dry-run" in sys.argv:
        print("Dry run — nothing written.")
        return
    # This file's own rows only. The girls' Fargo brackets share these keys (fargo-2026-16u-fs
    # carries no gender) and arrive in their own export, so deleting by event key erased them.
    src = os.path.basename(path)
    for key in keys:
        db.request("DELETE", f"other_tournament_bouts?event_key=eq.{key}&source_file=eq.{src}",
                   prefer="return=minimal")
    # And never insert over a bout another import holds: the table's unique key is
    # (event, weight, round, athlete, opponent) and one duplicate aborts the whole batch.
    held = set()
    for key in keys:
        offset = 0
        while True:
            page = db.request(
                "GET",
                f"other_tournament_bouts?event_key=eq.{key}"
                f"&select=weight_class,round,athlete_name,opponent_name&limit=1000&offset={offset}",
            ) or []
            for b in page:
                held.add((key, b["weight_class"], b["round"], b["athlete_name"], b["opponent_name"]))
            if len(page) < 1000:
                break
            offset += 1000
    fresh = [b for b in out
             if (b["event_key"], b["weight_class"], b["round"], b["athlete_name"], b["opponent_name"]) not in held]
    if len(fresh) != len(out):
        print(f"{len(out) - len(fresh)} bouts already held by another import, left alone")
    for i in range(0, len(fresh), 250):
        db.request("POST", "other_tournament_bouts", fresh[i:i + 250], "return=minimal")
    print("Written.")


if __name__ == "__main__":
    main()
