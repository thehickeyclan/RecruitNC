#!/usr/bin/env python3
"""
Placements at national events - Super 32, NHSCA Nationals, Journeymen - worked out from a
Trackwrestling full-bracket export, for every wrestler in the field. They label opponents on
profiles ("2025 Super 32 3rd (190)") and count toward Significant wins, the same way state
placements do.

Placement rounds decide places: Finals 1-2, 3rd Place 3-4, 5th Place 5-6, 7th Place 7-8. Exports
run several brackets under one weight number (NHSCA's four grade divisions, girls' brackets), so a
weight can have more than one champion; each is a separate person and keeps his own row.

The team column is a state code at NHSCA and Super 32 ("GA") and a club or school at Journeymen;
it is stored as the evidence the profile's matching rules read.

Each run replaces its event key. Run the SQL in scripts/create-state-tournament-results.sql first.

  python3 scripts/import-national-event-placers.py ~/Downloads/2025DefenseSoapSuper32Challenge.csv \
      --event super32-2025 --name "Super 32" --year 2025 [--dry-run]
"""

import csv
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLACES = {"finals": (1, 2), "1st place": (1, 2), "1st place match": (1, 2), "3rd place": (3, 4),
          "3rd place match": (3, 4), "5th place": (5, 6), "5th place match": (5, 6),
          "7th place": (7, 8), "7th place match": (7, 8)}


def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


def cell(value):
    return re.sub(r'^="(.*)"$', r"\1", (value or "").strip()).strip()


def load_env():
    for name in (".env.local", ".env"):
        path = os.path.join(ROOT, name)
        if os.path.exists(path):
            for line in open(path):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def request(method, path, body=None, prefer=None):
    url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    req = urllib.request.Request(f"{url}/rest/v1/{path}", method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    for k, v in (("apikey", key), ("Authorization", f"Bearer {key}"), ("Content-Type", "application/json")):
        req.add_header(k, v)
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req) as res:
            return res.read()
    except urllib.error.HTTPError as e:
        hint = " — run the SQL in scripts/create-state-tournament-results.sql first" if e.code == 404 else ""
        sys.exit(f"{method} {path} failed: {e.code} {e.read().decode()}{hint}")


def main():
    files = [a for i, a in enumerate(sys.argv[1:], start=1)
             if not a.startswith("--") and sys.argv[i - 1] not in ("--event", "--name", "--year")]
    event_key, name, year = arg("--event"), arg("--name"), arg("--year")
    if len(files) != 1 or not (event_key and name and year):
        sys.exit(__doc__)
    rows = [{cell(k): cell(v) for k, v in r.items()} for r in csv.DictReader(open(os.path.expanduser(files[0]), encoding="utf-8-sig"))]

    placers, seen = [], set()
    for r in rows:
        places = PLACES.get(r["Round"].strip().lower())
        if not places:
            continue
        for place, who, team in ((places[0], r["Winning Wrestler"], r["Winning Team"]),
                                 (places[1], r["Losing Wrestler"], r["Losing Team"])):
            who = who.strip()
            if not who or who.lower() in {"forfeit", "bye"}:
                continue
            key = (r["Weight"], place, who.lower())
            if key in seen:
                continue
            seen.add(key)
            team = team.strip() or None
            placers.append({
                "event_key": event_key,
                "event_name": name,
                "year": int(year),
                "weight": r["Weight"].strip(),
                "place": place,
                "wrestler_name": who,
                "team": team,
                "state": team if team and re.fullmatch(r"[A-Z]{2}", team) else None,
            })

    by_place = {p: sum(1 for x in placers if x["place"] == p) for p in range(1, 9)}
    print(f"{name} {year}: {len(placers)} placers from {len(rows)} bouts; by place {by_place}")
    print(f"with a state code: {sum(1 for p in placers if p['state'])}")
    if "--dry-run" in sys.argv:
        for p in placers[:5]:
            print(" ", p)
        print("Dry run — nothing written.")
        return
    load_env()
    request("DELETE", f"national_event_placers?event_key=eq.{urllib.parse.quote(event_key)}", prefer="return=minimal")
    for i in range(0, len(placers), 500):
        request("POST", "national_event_placers", placers[i:i + 500], "return=minimal")
    print("Written.")


if __name__ == "__main__":
    main()
