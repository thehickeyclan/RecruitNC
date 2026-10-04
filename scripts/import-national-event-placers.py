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
      --event super32-2025 --name "Super 32" --year 2025 --hs-weights nfhs --largest-bracket [--dry-run]

No middle-school results: Super 32 and NHSCA run middle-school (and girls') brackets in the same
export without labelling them. --hs-weights keeps only high-school weights ("nfhs" or "nhsca", or a
comma list) - 100 and 112 are middle-school weights, never high school. --largest-bracket then keeps
only the biggest bracket at each weight, the high-school one where Super 32 runs a middle-school
bracket at a shared weight; brackets are told apart by who wrestled whom. NHSCA does not need it:
its four grade divisions share each weight and are all high school, so it keeps the largest four
(--largest-brackets 4), which drops the smaller girls' bracket sharing a boys' weight.
--main-bracket-only (Journeymen) drops overflow-bracket placings: see the comment where it is applied.

A placer list (Muse's format: tournament, weight, place, wrestler_name, team) loads directly:

  python3 scripts/import-national-event-placers.py ~/Downloads/beast-2025-placers.csv \
      --event beast-of-the-east-2025 --name "Beast of the East" --year 2025
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


HS_WEIGHTS = {
    "nfhs": {"106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"},
    "nhsca": {"106", "113", "120", "126", "132", "138", "145", "152", "160", "170", "182", "195", "220", "285"},
}


def brackets(rows):
    """Wrestler -> bracket id per weight: connected groups of who wrestled whom."""
    parent = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for r in rows:
        a, b = (r["Weight"], r["Winning Wrestler"].strip()), (r["Weight"], r["Losing Wrestler"].strip())
        if a[1] and b[1]:
            parent[find(a)] = find(b)
        elif a[1]:
            find(a)
    return find


def main():
    files = [a for i, a in enumerate(sys.argv[1:], start=1)
             if not a.startswith("--") and sys.argv[i - 1] not in ("--event", "--name", "--year", "--hs-weights", "--largest-brackets")]
    event_key, name, year = arg("--event"), arg("--name"), arg("--year")
    if len(files) != 1 or not (event_key and name and year):
        sys.exit(__doc__)
    rows = [{cell(k): cell(v) for k, v in r.items()} for r in csv.DictReader(open(os.path.expanduser(files[0]), encoding="utf-8-sig"))]

    placers, seen = [], set()
    if rows and "place" in rows[0] and "wrestler_name" in rows[0]:
        # A placer list: one row per finish, the team a school or club (Ironman, Beast of the East).
        # The same placer can arrive twice: the Super 32 2023 list repeats eleven of its fourteen
        # weights in full, so every slot is filled by the same wrestler twice and the whole insert
        # dies on the table's unique key. An exact repeat is a duplicated row, not two people.
        seen_slot = set()
        for r in rows:
            who, team = r["wrestler_name"].strip(), (r.get("team") or "").strip() or None
            if not who or not r["place"].strip().isdigit():
                continue
            slot = (r["weight"].strip(), int(r["place"]), who.lower())
            if slot in seen_slot:
                continue
            seen_slot.add(slot)
            placers.append({
                "event_key": event_key, "event_name": name, "year": int(year), "weight": r["weight"].strip(),
                "place": int(r["place"]), "wrestler_name": who, "team": team,
                "state": team if team and re.fullmatch(r"[A-Z]{2}", team) else None,
            })
        rows = []
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

    hs = arg("--hs-weights")
    if hs:
        allowed = HS_WEIGHTS.get(hs) or {w.strip() for w in hs.split(",")}
        before = len(placers)
        placers = [p for p in placers if p["weight"] in allowed]
        print(f"high-school weights only: dropped {before - len(placers)} middle-school/other placings")
    keep = int(arg("--largest-brackets") or (1 if "--largest-bracket" in sys.argv else 0))
    if keep and rows:
        find = brackets(rows)
        size = {}
        for r in rows:
            for who in (r["Winning Wrestler"].strip(), r["Losing Wrestler"].strip()):
                if who:
                    size.setdefault(find((r["Weight"], who)), set()).add(who)
        by_weight = {}
        for root, members in size.items():
            by_weight.setdefault(root[0], []).append((len(members), root))
        kept = {root for groups in by_weight.values() for _, root in sorted(groups, reverse=True)[:keep]}
        before = len(placers)
        placers = [p for p in placers if find((p["weight"], p["wrestler_name"])) in kept]
        print(f"largest {keep} bracket(s) per weight only: dropped {before - len(placers)} placings from smaller brackets")

    if "--main-bracket-only" in sys.argv and rows:
        # Journeymen runs overflow ("OF") brackets, and the export calls their last round "Finals"
        # too: Jekai Sedgwick lost twice at 119, then won an overflow final and read as the
        # Journeymen champion. Only what the main bracket proves is kept: a "Finals" winner with no
        # loss at the weight is its champion (at 119, Brayden Wenrich, of five "Finals" winners), and
        # the wrestler he beat in that final is the runner-up. Overflow entrants may never have
        # wrestled the main bracket, so 3rd-8th cannot be proven and are dropped.
        losses = {}
        for r in rows:
            who = r["Losing Wrestler"].strip()
            if who:
                losses[(r["Weight"], who.lower())] = losses.get((r["Weight"], who.lower()), 0) + 1
        main_finals = {
            (r["Weight"], r["Winning Wrestler"].strip().lower(), r["Losing Wrestler"].strip().lower())
            for r in rows
            if r["Round"].strip().lower() in ("finals", "1st place", "1st place match")
            and r["Winning Wrestler"].strip()
            and losses.get((r["Weight"], r["Winning Wrestler"].strip().lower()), 0) == 0
        }
        champions = {(w, a) for w, a, _ in main_finals}
        runners_up = {(w, b) for w, _, b in main_finals}
        before = len(placers)
        placers = [
            p for p in placers
            if (p["place"] == 1 and (p["weight"], p["wrestler_name"].lower()) in champions)
            or (p["place"] == 2 and (p["weight"], p["wrestler_name"].lower()) in runners_up)
        ]
        print(f"main bracket only: kept {len(placers)} proven champions and runners-up, dropped {before - len(placers)}")

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
