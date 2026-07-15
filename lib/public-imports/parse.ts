import type { DualTeamProposed, PlacerProposed } from "./types"

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v)
  return null
}

function asStr(v: unknown): string {
  return String(v ?? "").trim()
}

/** Accept export JSON `{ records: [...] }` or a bare array of dual rows. */
export function parseDualTeamPayload(input: unknown): DualTeamProposed[] {
  let rows: unknown[] = []
  if (Array.isArray(input)) rows = input
  else if (input && typeof input === "object") {
    const o = input as Record<string, unknown>
    if (Array.isArray(o.records)) rows = o.records
    else if (Array.isArray(o.schools)) {
      // school leaderboard is derived — expand years[] into dual rows if divisions[] aligned
      const expanded: DualTeamProposed[] = []
      for (const s of o.schools) {
        if (!s || typeof s !== "object") continue
        const school = s as Record<string, unknown>
        const name = asStr(school.champion_school)
        const years = Array.isArray(school.years) ? school.years : []
        const divisions = Array.isArray(school.divisions) ? school.divisions : []
        for (let i = 0; i < years.length; i++) {
          const year = asNum(years[i])
          const division = asStr(divisions[i] ?? divisions[0])
          if (year == null || !name || !division) continue
          expanded.push({
            year,
            division,
            champion_school: name,
            held: true,
            is_vacated: false,
          })
        }
      }
      return expanded
    }
  }

  const out: DualTeamProposed[] = []
  for (const r of rows) {
    if (!r || typeof r !== "object") continue
    const row = r as Record<string, unknown>
    const year = asNum(row.year)
    const division = asStr(row.division ?? row.classification)
    const champion = asStr(row.champion_school ?? row.school)
    if (year == null || !division || !champion) continue
    // Skip COVID / vacated placeholders unless explicitly held=false with notes — keep for review
    out.push({
      year,
      division,
      champion_school: champion,
      runner_up_school: row.runner_up_school != null ? asStr(row.runner_up_school) : null,
      champion_score: asNum(row.champion_score),
      runner_up_score: asNum(row.runner_up_score),
      is_vacated: row.is_vacated == null ? false : Boolean(row.is_vacated),
      held: row.held == null ? true : Boolean(row.held),
      notes: row.notes != null ? asStr(row.notes) : null,
    })
  }
  return out
}

/** Accept { year, classifications: [...] } placer JSON used by 2026 import script. */
export function parsePlacerJsonPayload(input: unknown): PlacerProposed[] {
  if (!input || typeof input !== "object") return []
  const data = input as Record<string, unknown>
  const year =
    asNum(data.year) ??
    asNum(data.tournament_year) ??
    null
  if (year == null) return []

  const classifications =
    (data.classifications as unknown[]) ||
    (data.classification_results as unknown[]) ||
    []

  const out: PlacerProposed[] = []
  for (const block of classifications) {
    if (!block || typeof block !== "object") continue
    const b = block as Record<string, unknown>
    const classification = asStr(b.classification ?? b.division ?? b.class)
    if (!classification) continue
    const weightClasses = (b.weight_classes as unknown[]) || (b.weights as unknown[]) || []
    for (const wc of weightClasses) {
      if (!wc || typeof wc !== "object") continue
      const w = wc as Record<string, unknown>
      const weight_class = asStr(w.weight ?? w.weight_class ?? w.class)
      if (!weight_class) continue
      const places = (w.places as unknown[]) || (w.results as unknown[]) || []
      for (const p of places) {
        if (!p || typeof p !== "object") continue
        const pl = p as Record<string, unknown>
        const place = asNum(pl.place ?? pl.rank ?? pl.finish)
        const wrestler_name = asStr(pl.name ?? pl.wrestler_name)
        const school = asStr(pl.school ?? pl.team)
        if (place == null || !wrestler_name) continue
        out.push({ year, classification, weight_class, place, wrestler_name, school })
      }
    }
  }
  return out
}

const PLACE_ORDINAL: Record<string, number> = {
  "1st": 1,
  "2nd": 2,
  "3rd": 3,
  "4th": 4,
  "5th": 5,
  "6th": 6,
  "7th": 7,
  "8th": 8,
}

const CLASS_WEIGHT_RE =
  /\b((?:1A\/2A)|(?:1-4A)|(?:[1-8]A))\s+(\d{2,3})\b/i
const WEIGHT_ONLY_RE = /^\s*(\d{2,3})\s*$/
const PLACE_LINE_RE =
  /(\d+)(?:st|nd|rd|th)\s+Place\s*[–—-]\s*(.+?)\s+of\s+(.+?)\s*$/i

/**
 * Parse NCHSAA championship page text (markdown/HTML→text) with Guaranteed Places blocks.
 * Best-effort: annual page layouts change; always review diffs before approve.
 */
export function parseNchsaaGuaranteedPlacesText(
  text: string,
  opts: { year: number; defaultClassification?: string },
): PlacerProposed[] {
  const lines = text.replace(/\r/g, "").split("\n")
  let classification = (opts.defaultClassification || "").trim()
  let weight = ""
  const out: PlacerProposed[] = []
  let inPlaces = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) continue

    // "## 1A 106" or "1A 113"
    const cw = line.match(CLASS_WEIGHT_RE)
    if (cw) {
      classification = cw[1].toUpperCase().replace("1A/2A", "1A/2A")
      if (/^1-4A$/i.test(cw[1])) classification = "1-4A"
      weight = cw[2]
      inPlaces = false
      continue
    }

    // Bare weight before Guaranteed Places (women's blocks)
    if (WEIGHT_ONLY_RE.test(line)) {
      const next = (lines[i + 1] || "").trim()
      const next2 = (lines[i + 2] || "").trim()
      if (/^guaranteed places$/i.test(next) || /^guaranteed places$/i.test(next2)) {
        weight = line
        inPlaces = false
        if (!classification) classification = opts.defaultClassification || "WOMEN"
        continue
      }
    }

    if (/^guaranteed places$/i.test(line)) {
      inPlaces = true
      continue
    }

    if (/^\d+(?:st|nd|rd|th)\s+place match/i.test(line) || /^team scores$/i.test(line)) {
      inPlaces = false
      continue
    }

    if (!inPlaces || !weight || !classification) continue

    const cleaned = line.replace(/^[-•*]\s*/, "")
    const m = cleaned.match(PLACE_LINE_RE)
    if (!m) continue
    const ordMatch = cleaned.match(/^(\d+)(st|nd|rd|th)/i)
    const placeKey = ordMatch
      ? `${ordMatch[1]}${ordMatch[2].toLowerCase()}`
      : ""
    const place = PLACE_ORDINAL[placeKey] ?? Number(m[1])
    const wrestler_name = m[2].trim()
    const school = m[3].replace(/\s+High School$/i, "").trim()
    if (!wrestler_name || !Number.isFinite(place)) continue
    out.push({
      year: opts.year,
      classification,
      weight_class: weight,
      place,
      wrestler_name,
      school,
    })
  }

  // Deduplicate by natural identity (last wins)
  const map = new Map<string, PlacerProposed>()
  for (const r of out) {
    map.set(`${r.year}|${r.classification}|${r.weight_class}|${r.place}`, r)
  }
  return [...map.values()]
}

/** Loose year extraction from URL or label. */
export function inferYearFromText(...parts: Array<string | null | undefined>): number | null {
  for (const p of parts) {
    if (!p) continue
    const m = String(p).match(/\b(20\d{2})\b/)
    if (m) return Number(m[1])
  }
  return null
}
