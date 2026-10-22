"""
Muse's college admissions pull (2026-27 cycle, Fall 2027 entry) -> lib/college-programs/admissions-2026-27.json.

    python3 -I scripts/import-college-admissions.py ~/Downloads/college-admissions-2026-27.csv

Keyed by our school id (matched on the college's name, as programs-2026-27.json spells it). Every
value keeps its source URL. A date becomes a countdown only when the sheet gives its year: "March 1"
stays words, never a guessed year. "not offered" is recorded as not offered; a blank stays unknown.
"""
import csv, json, re, sys
from datetime import date

SRC = sys.argv[1]
OUT = "lib/college-programs/admissions-2026-27.json"
PROGRAMS = "lib/college-programs/programs-2026-27.json"
MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}
DATE = re.compile(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? (\d{1,2}),? (20\d\d)\b")
PLANS = [("ed1", "ED_I_Deadline", "ED_I_Source_URL"), ("ed2", "ED_II_Deadline", "ED_II_Source_URL"), ("ea", "EA_Deadline", "EA_Source_URL"), ("rea", "REA_SCEA_Deadline", "REA_Source_URL"), ("rd", "Regular_Decision_Deadline", "RD_Source_URL")]

# Links Muse found that land somewhere other than the first-year apply page.
APPLY_FIX = {
    # The pulled link was UNC's early-college / international page; this is the first-year start.
    "university-of-north-carolina-at-chapel-hill-north-carolina": "https://admissions.unc.edu/apply/",
}

def clean_url(u):
    """Drop analytics tags (utm_*, _gl, pk_*, gclid...) a link picked up from an ad or a newsletter."""
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
    if not u: return None
    parts = urlsplit(u)
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not re.match(r"^(utm_|_gl$|_ga$|pk_|gclid$|fbclid$|source$)", k)]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(q), ""))

def key(s):
    return re.sub(r"[^a-z]", "", s.lower().replace("&", "and"))

def text(r, col):
    return (r.get(col) or "").strip()

def dates(raw):
    """Every dated deadline in a cell, with the words after it as its label: '(Early Action II)'."""
    out = []
    for m in DATE.finditer(raw):
        d = date(int(m.group(3)), MONTHS[m.group(1)[:3].lower()], int(m.group(2)))
        tail = raw[m.end():].lstrip()
        label = re.match(r"^\(([^)]{1,40})\)", tail)
        head = re.search(r"([A-Za-z][A-Za-z #0-9]{1,30}):\s*$", raw[: m.start()])
        out.append({"date": d.isoformat(), **({"label": (label or head).group(1).strip()} if (label or head) else {})})
    return out

def platform(raw):
    l = raw.lower()
    if not l:
        return None
    parts = []
    if "common app" in l: parts.append("Common App")
    if "coalition" in l: parts.append("Coalition")
    if "own portal" in l or "portal" in l: parts.append("College's own application")
    return " or ".join(parts) or raw

def aid(raw):
    l = raw.lower()
    if not l: return None
    if "css" in l: return "FAFSA + CSS Profile" if "fafsa" in l else "CSS Profile"
    if "institutional" in l: return "FAFSA + college's own form"
    if "fafsa" in l: return "FAFSA"
    return raw

ids = {key(s["name"]): s["id"] for s in json.load(open(PROGRAMS))["schools"]}
out, unmatched = {}, []
for r in csv.DictReader(open(SRC, encoding="utf-8-sig")):
    sid = ids.get(key(text(r, "School")))
    if not sid:
        unmatched.append(text(r, "School")); continue
    plans = {}
    for plan, col, scol in PLANS:
        raw = text(r, col)
        if not raw: continue
        if raw.lower() == "not offered":
            plans[plan] = {"offered": False, "source": text(r, scol) or None}; continue
        plans[plan] = {"offered": True, "raw": raw, "dates": dates(raw), "source": text(r, scol) or None}
    rolling_raw = text(r, "Rolling")
    fee_raw = text(r, "Application_Fee_USD")
    entry = {
        "plans": plans,
        "rolling": None if not rolling_raw else (False if rolling_raw.lower() == "not offered" else (True if rolling_raw.lower() in ("yes", "rolling") else rolling_raw)),
        "applyUrl": APPLY_FIX.get(sid) or clean_url(text(r, "Apply_URL")),
        "platform": platform(text(r, "Platform")),
        "fee": int(fee_raw) if fee_raw.isdigit() else None,
        "feeWaiver": {"yes": True, "no": False}.get(text(r, "Fee_Waiver_Available").lower()) if text(r, "Fee_Waiver_Available").lower() in ("yes", "no") else (True if "no application fee" in text(r, "Fee_Waiver_Available").lower() else None),
        "testPolicy": text(r, "Test_Policy") or None,
        "aidForm": aid(text(r, "Aid_Form_FAFSA_or_CSS")),
        "aidDeadline": text(r, "Priority_Financial_Aid_Deadline") or None,
        "sources": {k: v for k, v in {
            "apply": text(r, "Apply_URL_Source_URL"), "fee": text(r, "Fee_Source_URL"), "test": text(r, "Test_Policy_Source_URL"),
            "aid": text(r, "Aid_Form_Source_URL"), "aidDeadline": text(r, "Priority_Aid_Source_URL"), "rolling": text(r, "Rolling_Source_URL"),
        }.items() if v},
    }
    out[sid] = entry

json.dump({"source": "Muse college admissions pull, 2026-27 cycle (Fall 2027 entry), 22 Oct 2026", "colleges": out}, open(OUT, "w"), indent=1, ensure_ascii=False)
open(OUT, "a").write("\n")
withDates = sum(1 for e in out.values() if any(p.get("dates") for p in e["plans"].values()))
print(f"{len(out)} colleges, {withDates} with a dated deadline, unmatched {len(unmatched)}: {unmatched[:5]}")
