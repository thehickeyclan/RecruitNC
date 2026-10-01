#!/usr/bin/env python3
"""
Import NC United's (National and Select) bouts from the 2026 NHSCA National Duals export into
other_tournament_bouts, so they reach profiles: under the NC United row in the tournament list, in
Significant wins, and with each opponent's accolades.

Why a separate import: scripts/import-nhsca-national-duals-2026.ts brings in NC kids on other
teams and deliberately skips NC United, whose live results come from the duals scoring sheet
(nhsca_duals_matches). That sheet records opponents as "M. Kilgore", which nothing can match, so
these rows - full names from the official export - are what lets a win be recognised.

  - Own event key (EVENT_KEY), replaced whole on every run, so re-running never duplicates and the
    other import cannot wipe these rows.
  - Wrestlers link to profiles through nhsca_duals_wrestlers, which already holds the athlete id.
  - No other_tournament_results rows: the event already has a row on the profile (the NC United
    team record), and these bouts attach to it rather than adding a second one.
  - Opposing teams get a home state where the export's own rosters prove one: if a team's
    wrestlers include at least three of one state's 2026 placers, three times any other state's,
    its club is written "Storm Wrestling Center - HSB (GA)". That suffix is evidence the profile's
    out-of-state rule reads. National all-star sides (Team Gotcha: one MD, one AZ, one SD placer)
    stay untagged - their wrestlers come from everywhere.

  python3 scripts/import-nc-united-duals-2026.py "~/Downloads/2026NHSCANationalDuals.csv" --dry-run
"""

import collections
import csv
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENT_KEY = "nhsca-duals-2026-nc-united"
EVENT_NAME = "2026 NHSCA National Duals"
NC_TEAMS = {"NC United - HSB": "national", "NC United Select - HSB": "select"}


def load_env():
    for name in (".env.local", ".env"):
        path = os.path.join(ROOT, name)
        if os.path.exists(path):
            for line in open(path):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def cell(value):
    """Trackwrestling exports wrap every cell as ="value"."""
    return re.sub(r'^="(.*)"$', r"\1", (value or "").strip()).strip()


def name_key(value):
    return " ".join(re.sub(r"[^a-z ]", "", re.sub(r"[-'.]", " ", str(value or "").lower())).split())


class Db:
    def __init__(self):
        self.url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")

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


def team_states(rows, placers):
    """Home state per team, proven by its own wrestlers being one state's placers."""
    by_name = collections.defaultdict(set)
    for p in placers:
        by_name[name_key(p["wrestler_name"])].add(p["state"])
    seen = collections.defaultdict(set)  # team -> wrestler names
    for r in rows:
        for who, team in ((r["Winning Wrestler"], r["Winning Team"]), (r["Losing Wrestler"], r["Losing Team"])):
            if who and team:
                seen[team].add(name_key(who))
    out = {}
    for team, names in seen.items():
        counts = collections.Counter(s for n in names for s in by_name.get(n, ()))
        if not counts:
            continue
        (state, top), *rest = counts.most_common()
        runner_up = rest[0][1] if rest else 0
        # Three of one state's placers, well clear of any other: no run of namesakes does that.
        if top >= 3 and top >= 3 * runner_up:
            out[team] = state
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        sys.exit(__doc__)
    path = os.path.expanduser(args[0])
    rows = [{cell(k): cell(v) for k, v in r.items()} for r in csv.DictReader(open(path, encoding="utf-8-sig"))]
    rows = [r for r in rows if r.get("Event") == EVENT_NAME and "Test" not in (r["Winning Team"], r["Losing Team"])]

    load_env()
    db = Db()
    teams = {t["name"]: t["id"] for t in db.request("GET", "nhsca_duals_teams?select=id,name&is_nc_united=eq.true")}
    team_id = {
        "national": next(i for n, i in teams.items() if "Select" not in n),
        "select": next(i for n, i in teams.items() if "Select" in n),
    }
    roster = db.request("GET", "nhsca_duals_wrestlers?select=name,team_id,athlete_id")
    profile_of = {(r["team_id"], name_key(r["name"])): r["athlete_id"] for r in roster}
    # The roster uses the names the team calls them - "Xan Moody", "Sammy Gantt", "Manny Kahsai" -
    # and the export the bracket names. Within one team a surname that appears once is the same boy.
    by_surname = collections.defaultdict(list)
    for r in roster:
        by_surname[(r["team_id"], name_key(r["name"]).split()[-1])].append(r["athlete_id"])

    def link(team, wrestler):
        key = name_key(wrestler)
        tid = team_id[NC_TEAMS[team]]
        if (tid, key) in profile_of:
            return profile_of[(tid, key)]
        words = [w for w in key.split() if w not in {"jr", "sr", "ii", "iii"}]
        same = by_surname.get((tid, words[-1] if words else ""), [])
        return same[0] if len(same) == 1 else None
    placers = db.get_all("state_tournament_placers?select=state,wrestler_name")
    states = team_states(rows, placers)

    out, unlinked = [], collections.Counter()
    order = collections.Counter()
    for r in rows:
        for side, other in (("Winning", "Losing"), ("Losing", "Winning")):
            team = r[f"{side} Team"]
            if team not in NC_TEAMS:
                continue
            me = r[f"{side} Wrestler"]
            athlete_id = link(team, me)
            if not athlete_id:
                unlinked[f"{me} ({team})"] += 1
            opp, opp_team = r[f"{other} Wrestler"] or None, r[f"{other} Team"] or None
            if opp_team and opp_team in states:
                opp_team = f"{opp_team} ({states[opp_team]})"
            month, day, year = (int(x) for x in r["Date"].split("/"))
            order[(me, team)] += 1
            out.append({
                "event_key": EVENT_KEY,
                "event_name": EVENT_NAME,
                "event_date": f"{year:04d}-{month:02d}-{day:02d}",
                "year": year,
                "weight_class": r["Weight"],
                "round": r["Round"],
                "source_round": r["Round"],
                "bout_order": order[(me, team)],
                "athlete_name": me,
                "athlete_id": athlete_id,
                "athlete_club": team,
                "opponent_name": opp,
                "opponent_id": None,
                "opponent_club": opp_team,
                "win": side == "Winning",
                "is_bye": not opp,
                "win_type": r["Win Type"],
                "score": r["Result"],
                "source_file": os.path.basename(path),
            })

    wins = sum(1 for b in out if b["win"])
    print(f"{len(rows)} bouts in the export; NC United: {len(out)} bouts ({wins}-{len(out) - wins}), "
          f"{len({b['athlete_name'] for b in out})} wrestlers, {sum(1 for b in out if b['athlete_id'])} linked to a profile")
    print(f"opposing teams with a proven home state: {sum(1 for t in {b['opponent_club'] for b in out} if t and t.endswith(')'))}")
    if unlinked:
        print("not on the NC United roster with a profile:", dict(unlinked))
    if "--dry-run" in sys.argv:
        for b in out[:5]:
            print(" ", b["athlete_name"], "W" if b["win"] else "L", b["win_type"], b["score"], "vs", b["opponent_name"], "|", b["opponent_club"])
        print("Dry run — nothing written.")
        return

    db.request("DELETE", f"other_tournament_bouts?event_key=eq.{EVENT_KEY}", prefer="return=minimal")
    for i in range(0, len(out), 250):
        db.request("POST", "other_tournament_bouts", out[i:i + 250], "return=minimal")
    print("Written.")


if __name__ == "__main__":
    main()
