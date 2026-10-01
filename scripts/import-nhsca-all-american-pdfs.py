#!/usr/bin/env python3
"""
NHSCA All-Americans (places 1-8) for past years, from the "Full_NHSCA_<Grade>_All_Americans.pdf"
lists, into national_event_placers - the years before we hold full brackets. Mac Johnson's AAU
opponent Jack Abramson was 7th at 120 at the 2024 Freshman Nationals; without this, nothing said so.

The PDFs run two columns per page that flow top to bottom, so each page is read as its left column
then its right column, as one stream of: a year ("2024"), a weight ("120"), and "7th: Jack Abramson NJ".
Only the years given are kept (default 2022-2024: 2025 and 2026 come from the full brackets via
import-national-event-placers.py, and older years are out of reach of current wrestlers).

  python3 scripts/import-nhsca-all-american-pdfs.py ~/Downloads/Full_NHSCA_*_All_Americans.pdf \\
      [--years 2022-2024] [--dry-run]
"""

import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = re.compile(r"^(\d)(?:st|nd|rd|th):\s*(.+?)\s+([A-Z]{2})$")


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
        sys.exit(f"{method} {path} failed: {e.code} {e.read().decode()}")


def stream(pdf):
    """The page's text as left column then right column, one segment per line."""
    text = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    for page in text.split("\f"):
        left, right = [], []
        for line in page.splitlines():
            if not line.strip():
                continue
            parts = [p for p in re.split(r"\s{2,}", line.strip()) if p]
            indent = len(line) - len(line.lstrip())
            if len(parts) >= 2:
                left.append(parts[0])
                right.extend(parts[1:])
            elif indent >= 15:
                right.append(parts[0])
            else:
                left.append(parts[0])
        yield from left
        yield from right


def parse(pdf, years):
    grade = re.search(r"NHSCA_(\w+?)_All", os.path.basename(pdf))
    grade = grade.group(1) if grade else "All"
    year = weight = None
    out = []
    for seg in stream(pdf):
        m_year = re.match(r"^(20\d\d)\b", seg)
        if m_year and not ENTRY.match(seg):
            year, weight = int(m_year.group(1)), None
            continue
        if re.fullmatch(r"\d{2,3}", seg):
            weight = seg
            continue
        m = ENTRY.match(seg)
        if m and year in years and weight:
            out.append({
                "event_key": f"nhsca-aa-{grade.lower()}-{year}",
                "event_name": "NHSCA",
                "year": year,
                "weight": weight,
                "place": int(m.group(1)),
                "wrestler_name": m.group(2).strip(),
                "team": m.group(3),
                "state": m.group(3),
            })
    return out


def main():
    files = [a for i, a in enumerate(sys.argv[1:], start=1) if a.endswith(".pdf")]
    span = sys.argv[sys.argv.index("--years") + 1] if "--years" in sys.argv else "2022-2024"
    lo, hi = (int(x) for x in span.split("-"))
    years = set(range(lo, hi + 1))
    rows = []
    for pdf in files:
        got = parse(os.path.expanduser(pdf), years)
        by_year = {y: sum(1 for r in got if r["year"] == y) for y in sorted(years)}
        print(f"{os.path.basename(pdf)}: {len(got)} All-Americans {by_year}")
        rows += got
    # A bracket lists each weight's eight once; more means the columns were misread.
    per = {}
    for r in rows:
        per[(r["event_key"], r["weight"])] = per.get((r["event_key"], r["weight"]), 0) + 1
    odd = {k: v for k, v in per.items() if v != 8}
    if odd:
        # A page break swallowed a weight header and two weights ran together. Names, places, years
        # and states are still right; the weight is not, so it is dropped rather than stored wrong.
        # Those rows label as "2024 NHSCA All-American (7th)" and are never credited by weight.
        for r in rows:
            if (r["event_key"], r["weight"]) in odd:
                r["weight"] = ""
        print(f"weight dropped on {sum(odd.values())} rows in {len(odd)} misread weight groups")
    if "--dry-run" in sys.argv:
        print("Dry run — nothing written.")
        return
    load_env()
    for key in sorted({r["event_key"] for r in rows}):
        request("DELETE", f"national_event_placers?event_key=eq.{urllib.parse.quote(key)}", prefer="return=minimal")
    unique = {(r["event_key"], r["weight"], r["place"], r["wrestler_name"]): r for r in rows}
    payload = list(unique.values())
    for i in range(0, len(payload), 500):
        request("POST", "national_event_placers", payload[i:i + 500], "return=minimal")
    print(f"Written: {len(payload)}")


if __name__ == "__main__":
    main()
