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


def event_parts(division):
    """'Junior Boys Freestyle' -> ('junior', 'fs', 'Junior Freestyle')."""
    d = division.lower()
    age = "16u" if "16u" in d else "junior" if "junior" in d else re.sub(r"\W+", "", d.split()[0])
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

    def profile_ids(name):
        """Exact name first; else the one profile with the same surname and a compatible first
        name - "Joshua Stonebraker" is the profile "Josh Stonebraker"."""
        exact = profiles.get(name_key(name), set())
        if exact:
            return exact
        words = name_key(name).split()
        if len(words) < 2:
            return set()
        return {i for first, i in by_surname.get(words[-1], []) if first_names_alike(words[0], first, groups)}

    out, unlinked, keys = [], collections.Counter(), set()
    per_wrestler = collections.Counter()
    for r in sorted(rows, key=lambda r: int(r["bout_number"] or 0)):
        age, style, label = event_parts(r["division"])
        key = f"fargo-{year}-{age}-{style}"
        keys.add(key)
        code = RESULT_CODES.get(r["result_type"].strip().lower(), r["result_type"].strip().upper())
        score = " ".join(x for x in (r["score"].strip(), r["time"].strip()) if x)
        for side, other in (("winner", "loser"), ("loser", "winner")):
            if r[f"{side}_state"].strip().upper() != "NC":
                continue
            me = r[f"{side}_name"].strip()
            ids = profile_ids(me)
            athlete_id = next(iter(ids)) if len(ids) == 1 else None
            if not athlete_id:
                unlinked[f"{me} ({'none' if not ids else 'ambiguous'})"] += 1
            opp = r[f"{other}_name"].strip() or None
            per_wrestler[(key, me)] += 1
            out.append({
                "event_key": key,
                "event_name": f"{year} Fargo {label}",
                "event_date": EVENT_DATE.format(year=year),
                "year": year,
                "weight_class": r["weight"].strip(),
                "round": r["round"].strip(),
                "source_round": r["round"].strip(),
                "bout_order": per_wrestler[(key, me)],
                "athlete_name": me,
                "athlete_id": athlete_id,
                "athlete_club": "NC",
                "opponent_name": opp,
                "opponent_id": None,
                "opponent_club": r[f"{other}_state"].strip().upper() or None,
                "win": side == "winner",
                "is_bye": not opp,
                "win_type": code,
                "score": score,
                "source_file": os.path.basename(path),
            })

    wins = sum(1 for b in out if b["win"])
    print(f"{len(rows)} bouts -> {len(out)} NC bout rows ({wins}-{len(out) - wins}), "
          f"{len({b['athlete_name'] for b in out})} wrestlers, {sum(1 for b in out if b['athlete_id'])} linked")
    print("event keys:", sorted(keys))
    if unlinked:
        print("not linked to a profile:", dict(unlinked))
    if "--dry-run" in sys.argv:
        print("Dry run — nothing written.")
        return
    for key in keys:
        db.request("DELETE", f"other_tournament_bouts?event_key=eq.{key}", prefer="return=minimal")
    for i in range(0, len(out), 250):
        db.request("POST", "other_tournament_bouts", out[i:i + 250], "return=minimal")
    print("Written.")


if __name__ == "__main__":
    main()
