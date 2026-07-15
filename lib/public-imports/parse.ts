import type { DualTeamProposed, PlacerProposed } from "./types"
import { canonicalizeWrestlerName } from "./normalize"

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
      const weight_class = normalizePlacerWeightClass(asStr(w.weight ?? w.weight_class ?? w.class))
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
/** "## Women’s 100-Pound" / "Women's 107" (2024 combined pages). */
const WOMENS_WEIGHT_HEADER_RE =
  /^(?:#{1,6}\s*)?women[’']?s\s+(\d{2,3})(?:\s*-?\s*pounds?)?\s*$/i
const WEIGHT_ONLY_RE = /^\s*(\d{2,3})\s*$/
const PLACE_LINE_RE =
  /(\d+)(?:st|nd|rd|th)\s+Place\s*[–—-]\s*(.+?)\s+of\s+(.+?)\s*$/i

/** Canonical weight token for SoR: "106lbs" / "106-Pound" → "106". */
export function normalizePlacerWeightClass(weight: string | null | undefined): string {
  const digits = String(weight ?? "")
    .trim()
    .match(/(\d{2,3})/)
  return digits?.[1] ?? String(weight ?? "").trim()
}

/**
 * Parse NCHSAA championship page text (markdown/HTML→text) with Guaranteed Places blocks.
 * Also supports 2024-style lists: class/weight header then "1st Place – Name of School"
 * without a Guaranteed Places label.
 * Best-effort: annual page layouts change; always review diffs before approve.
 */
export function parseNchsaaGuaranteedPlacesText(
  text: string,
  opts: { year: number; defaultClassification?: string; gender?: "M" | "F" | null },
): PlacerProposed[] {
  const lines = text.replace(/\r/g, "").split("\n")
  let classification = (opts.defaultClassification || "").trim()
  let weight = ""
  let rowGender: "M" | "F" | null = opts.gender ?? null
  const out: PlacerProposed[] = []
  let inPlaces = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) continue

    const womenHdr = line.match(WOMENS_WEIGHT_HEADER_RE)
    if (womenHdr) {
      classification = opts.defaultClassification || "WOMEN"
      weight = normalizePlacerWeightClass(womenHdr[1])
      rowGender = opts.gender ?? "F"
      inPlaces = true
      continue
    }

    // "## 1A 106" / "## 1A 106-Pound" / "1A 113"
    const cw = line.match(CLASS_WEIGHT_RE)
    if (cw) {
      classification = cw[1].toUpperCase().replace("1A/2A", "1A/2A")
      if (/^1-4A$/i.test(cw[1])) classification = "1-4A"
      weight = normalizePlacerWeightClass(cw[2])
      // Keep source gender when set; do not invent "M" (would double-key vs finals with null).
      rowGender = opts.gender ?? null
      // 2024 lists placers immediately under the weight header (no Guaranteed Places label).
      inPlaces = true
      continue
    }

    // Bare weight before Guaranteed Places (women's blocks)
    if (WEIGHT_ONLY_RE.test(line)) {
      const next = (lines[i + 1] || "").trim()
      const next2 = (lines[i + 2] || "").trim()
      if (/^guaranteed places$/i.test(next) || /^guaranteed places$/i.test(next2)) {
        weight = normalizePlacerWeightClass(line)
        inPlaces = false
        if (!classification) classification = opts.defaultClassification || "WOMEN"
        rowGender = opts.gender ?? "F"
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
    const wrestler_name = canonicalizeWrestlerName(m[2].trim())
    const school = m[3].replace(/\s+High School$/i, "").trim()
    if (!wrestler_name || !Number.isFinite(place)) continue
    out.push({
      year: opts.year,
      classification,
      weight_class: weight,
      place,
      wrestler_name,
      school,
      gender: rowGender,
    })
  }

  // Deduplicate by natural identity (last wins)
  const map = new Map<string, PlacerProposed>()
  for (const r of out) {
    map.set(
      `${r.year}|${r.classification}|${r.weight_class}|${r.place}|${r.gender ?? ""}|${r.wrestler_name.toLowerCase()}`,
      r,
    )
  }
  return [...map.values()]
}

const FINALS_HEADER_RE =
  /^((?:1A\/2A)|(?:1-4A)|(?:[1-8]A))\s+(\d{2,3})\s*$/i
/** Winner (School) 41-1 won … over Loser (School) … */
const FINALS_MATCH_RE =
  /^(.+?)\s+\(([^)]+)\)\s+\d[\d\-]*\s+won\b[\s\S]*?\bover\s+(.+?)\s+\(([^)]+)\)/i
/** 2024 place-match lines: Winner (School) 52-1, Fr. over Loser (School) … (no "won"). */
const FINALS_MATCH_OVER_ONLY_RE =
  /^(.+?)\s+\(([^)]+)\)\s+\d[\d\-]*(?:,\s*[^)]+?)?\s+over\s+(.+?)\s+\(([^)]+)\)/i

function cleanSchool(s: string): string {
  return s
    .replace(/\s+High School$/i, "")
    .replace(/\s+Middle and High School$/i, "")
    .replace(/\s+Academy$/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeClassificationLabel(raw: string): string {
  const t = raw.trim()
  if (/^1-4A$/i.test(t)) return "1-4A"
  if (/^1A\/2A$/i.test(t)) return "1A/2A"
  return t.toUpperCase()
}

/**
 * Parse NCHSAA "Championship Finals" blocks (common on 2026 classification pages).
 * Yields place 1 (winner) and place 2 (finalist) per weight.
 * 2024 "1st Place Match" lines (no "won") are accepted only under that header so 3rd-place
 * matches never overwrite champions.
 */
export function parseNchsaaChampionshipFinalsText(
  text: string,
  opts: { year: number; defaultClassification?: string; gender?: "M" | "F" | null },
): PlacerProposed[] {
  const lines = text.replace(/\r/g, "").split("\n")
  let classification = (opts.defaultClassification || "").trim()
  let weight = ""
  const out: PlacerProposed[] = []
  let inFirstPlaceMatch = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (/^team champions/i.test(line) || /^most outstanding/i.test(line)) {
      weight = ""
      inFirstPlaceMatch = false
      continue
    }
    if (/^championship finals$/i.test(line)) {
      inFirstPlaceMatch = true
      continue
    }

    const placeMatchHdr = line.match(/^(\d+)(?:st|nd|rd|th)\s+place\s+match/i)
    if (placeMatchHdr) {
      inFirstPlaceMatch = placeMatchHdr[1] === "1"
      continue
    }

    const womenHdr = line.match(WOMENS_WEIGHT_HEADER_RE)
    if (womenHdr) {
      classification = opts.defaultClassification || "WOMEN"
      weight = normalizePlacerWeightClass(womenHdr[1])
      inFirstPlaceMatch = false
      continue
    }

    const hdr = line.match(FINALS_HEADER_RE) || line.match(CLASS_WEIGHT_RE)
    if (hdr) {
      classification = normalizeClassificationLabel(hdr[1])
      weight = normalizePlacerWeightClass(hdr[2])
      inFirstPlaceMatch = false
      continue
    }

    if (!weight || !classification) continue
    if (!/\bover\b/i.test(line)) continue

    const cleaned = line.replace(/^[-•*]\s*/, "")
    const hasWon = /\bwon\b/i.test(cleaned)
    // Require "won" for free-floating finals; allow 2024 "… over …" only in 1st Place Match.
    if (!hasWon && !inFirstPlaceMatch) continue

    const m = cleaned.match(FINALS_MATCH_RE) || (inFirstPlaceMatch ? cleaned.match(FINALS_MATCH_OVER_ONLY_RE) : null)
    if (!m) continue
    const champ = m[1].trim()
    const champSchool = cleanSchool(m[2])
    const runner = m[3].trim()
    const runnerSchool = cleanSchool(m[4])
    if (!champ || !champSchool) continue

    out.push({
      year: opts.year,
      classification,
      weight_class: weight,
      place: 1,
      wrestler_name: canonicalizeWrestlerName(champ),
      school: champSchool,
      gender: opts.gender ?? null,
    })
    if (runner && runnerSchool) {
      out.push({
        year: opts.year,
        classification,
        weight_class: weight,
        place: 2,
        wrestler_name: canonicalizeWrestlerName(runner),
        school: runnerSchool,
        gender: opts.gender ?? null,
      })
    }
  }

  const map = new Map<string, PlacerProposed>()
  for (const r of out) {
    map.set(
      `${r.year}|${r.classification}|${r.weight_class}|${r.place}|${r.gender ?? ""}`,
      r,
    )
  }
  return [...map.values()]
}

/**
 * Prefer Guaranteed Places (1–6) when present; fill missing slots from Championship Finals (1–2).
 */
export function parseNchsaaIndividualStatesText(
  text: string,
  opts: { year: number; defaultClassification?: string; gender?: "M" | "F" | null },
): PlacerProposed[] {
  const fromPlaces = parseNchsaaGuaranteedPlacesText(text, opts)
  const fromFinals = parseNchsaaChampionshipFinalsText(text, opts)
  const map = new Map<string, PlacerProposed>()
  for (const r of fromFinals) {
    map.set(
      `${r.year}|${r.classification}|${r.weight_class}|${r.place}|${r.gender ?? ""}`,
      r,
    )
  }
  // Guaranteed Places overwrite finals for the same slot (more complete when available)
  for (const r of fromPlaces) {
    map.set(
      `${r.year}|${r.classification}|${r.weight_class}|${r.place}|${r.gender ?? ""}`,
      r,
    )
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

const MASCOT_SUFFIX_RE =
  /\s+(Hawks|Bears|Eagles|War Eagles|Crusaders|Vikings|Bulldogs|Wildcats|Hilltoppers|Buccaneers|Rams|Tigers|Panthers|Cavaliers|Spartans|Warriors|Raiders|Knights|Cardinals|Trojans|Mustangs|Indians|Pirates|Falcons|Hornets|Cougars|Jaguars|Gators|Wolves|Owls)\s*$/i

function normalizeDualSchool(name: string): string {
  return name
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+Middle and High School$/i, "")
    .replace(/\s+High School$/i, "")
    .replace(/\s+Academy$/i, "")
    .replace(MASCOT_SUFFIX_RE, "")
    .replace(/^the\s+/i, "")
    .trim()
}

function schoolMentions(a: string, b: string): boolean {
  const na = normalizeDualSchool(a).toLowerCase()
  const nb = normalizeDualSchool(b).toLowerCase()
  if (!na || !nb) return false
  return na === nb || na.startsWith(nb) || nb.startsWith(na) || na.includes(nb) || nb.includes(na)
}

function parseScorePair(
  leftSchool: string,
  leftScore: number,
  rightSchool: string,
  rightScore: number,
  championSchool: string,
): { runner_up_school: string; champion_score: number; runner_up_score: number } {
  if (schoolMentions(leftSchool, championSchool)) {
    return {
      runner_up_school: normalizeDualSchool(rightSchool),
      champion_score: leftScore,
      runner_up_score: rightScore,
    }
  }
  if (schoolMentions(rightSchool, championSchool)) {
    return {
      runner_up_school: normalizeDualSchool(leftSchool),
      champion_score: rightScore,
      runner_up_score: leftScore,
    }
  }
  // Default: first school listed is champion (NCHSAA State Championship Match lines)
  return {
    runner_up_school: normalizeDualSchool(rightSchool),
    champion_score: leftScore,
    runner_up_score: rightScore,
  }
}

type DualDraft = {
  division: string
  champion_school: string
  runner_up_school?: string | null
  champion_score?: number | null
  runner_up_score?: number | null
}

/**
 * Parse NCHSAA Dual Team Championship result pages (2026 structured + 2024/2025 article styles).
 * Returns year×division champion rows for staging — never publishes.
 */
export function parseNchsaaDualTeamChampionshipsText(
  text: string,
  opts: { year: number },
): DualTeamProposed[] {
  const year = opts.year
  const structured = parseDualTeamStructuredBlocks(text)
  const narrative = parseDualTeamNarrativeBlocks(text)
  const byDiv = new Map<string, DualDraft>()

  // Prefer structured (explicit State Champion lines); fill gaps from narrative
  for (const r of structured) byDiv.set(r.division.toUpperCase().replace(/\s+/g, ""), r)
  for (const r of narrative) {
    const key = r.division.toUpperCase().replace(/\s+/g, "")
    const existing = byDiv.get(key)
    if (!existing) {
      byDiv.set(key, r)
      continue
    }
    if (!existing.runner_up_school && r.runner_up_school) existing.runner_up_school = r.runner_up_school
    if (existing.champion_score == null && r.champion_score != null) {
      existing.champion_score = r.champion_score
      existing.runner_up_score = r.runner_up_score ?? null
    }
  }

  return [...byDiv.values()]
    .filter((r) => r.division && r.champion_school)
    .map((r) => ({
      year,
      division: r.division.replace(/\s+/g, ""),
      champion_school: normalizeDualSchool(r.champion_school),
      runner_up_school: r.runner_up_school ? normalizeDualSchool(r.runner_up_school) : null,
      champion_score: r.champion_score ?? null,
      runner_up_score: r.runner_up_score ?? null,
      held: true,
      is_vacated: false,
    }))
    .sort((a, b) => a.division.localeCompare(b.division, undefined, { numeric: true }))
}

/** 2026-style: "State Champion: School" + "SchoolA 58, SchoolB 24" */
function parseDualTeamStructuredBlocks(text: string): DualDraft[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const classQueue: string[] = []
  const out: DualDraft[] = []
  let current: DualDraft | null = null
  let expectScore = false

  const flush = () => {
    if (current?.champion_school && current.division) out.push(current)
    current = null
    expectScore = false
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Bare classification nav links (1A … 8A) before champion blocks
    if (/^[1-8]A(?:\s*\/\s*[1-8]A)?$/i.test(line)) {
      classQueue.push(line.replace(/\s+/g, "").toUpperCase())
      continue
    }

    const withClass = line.match(
      /^([1-8]A(?:\s*\/\s*[1-8]A)?)\s+Classification\s*[–\-—:]?\s*State Champion:\s*(.+)$/i,
    )
    if (withClass) {
      flush()
      const division = withClass[1].replace(/\s+/g, "").toUpperCase()
      // Drop matching queued class if present
      const qi = classQueue.findIndex((c) => c === division)
      if (qi >= 0) classQueue.splice(qi, 1)
      current = {
        division,
        champion_school: normalizeDualSchool(withClass[2]),
      }
      continue
    }

    const champOnly = line.match(/^State Champion:\s*(.+)$/i)
    if (champOnly) {
      flush()
      const division = classQueue.shift() || ""
      current = {
        division,
        champion_school: normalizeDualSchool(champOnly[1]),
      }
      continue
    }

    if (/^State Championship Match:?$/i.test(line)) {
      expectScore = true
      continue
    }

    const inlineMatch = line.match(
      /^State Championship Match:\s*(.+?)\s+(\d+)\s*,\s*(.+?)\s+(\d+)\s*$/i,
    )
    if (inlineMatch && current) {
      const scored = parseScorePair(
        inlineMatch[1],
        Number(inlineMatch[2]),
        inlineMatch[3],
        Number(inlineMatch[4]),
        current.champion_school,
      )
      Object.assign(current, scored)
      expectScore = false
      continue
    }

    if (expectScore && current) {
      const scoreLine = line.match(/^(.+?)\s+(\d+)\s*,\s*(.+?)\s+(\d+)\s*$/)
      if (scoreLine) {
        const scored = parseScorePair(
          scoreLine[1],
          Number(scoreLine[2]),
          scoreLine[3],
          Number(scoreLine[4]),
          current.champion_school,
        )
        Object.assign(current, scored)
        expectScore = false
      }
    }
  }
  flush()

  // Drop incomplete drafts without division (could not assign from queue)
  return out.filter((r) => Boolean(r.division))
}

/**
 * 2024/2025 article style: headlines + "defeated X 48-15" / "win against Y".
 */
function parseDualTeamNarrativeBlocks(text: string): DualDraft[] {
  const cleaned = text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ")
  const pending: DualDraft[] = []
  const seenChamp = new Set<string>()

  const pushPending = (draft: DualDraft) => {
    const champKey = normalizeDualSchool(draft.champion_school).toLowerCase()
    if (!champKey || seenChamp.has(champKey)) return
    seenChamp.add(champKey)
    pending.push({
      ...draft,
      division: draft.division ? draft.division.replace(/\s+/g, "").toUpperCase() : "",
      champion_school: normalizeDualSchool(draft.champion_school),
      runner_up_school: draft.runner_up_school
        ? normalizeDualSchool(draft.runner_up_school)
        : null,
    })
  }

  // Explicit: "earned the NCHSAA 3A Dual Team Championship with a 36-21 win against Union Pines"
  const explicitWin = [
    ...cleaned.matchAll(
      /(?:they\s+)?earned(?:\s+the)?\s+NCHSAA\s+([1-8]A(?:\s*\/\s*[1-8]A)?)\s+Dual Team(?:\s+Wrestling)?\s+Championship[^.]{0,120}?with a\s+(\d+)\s*[-–]\s*(\d+)\s+win against(?: the)?\s+([^.]+?)(?:\.|,|\s+on\s+)/gi,
    ),
  ]
  for (const m of explicitWin) {
    const before = cleaned.slice(Math.max(0, m.index! - 160), m.index!)
    const schoolMatch =
      before.match(
        /(?:The\s+)?([A-Z][A-Za-z0-9.'’\- ]+?(?:Charter|County|Guilford|Pines|Gibbons|Central|Rowan|Hough|Academy)?)\s+(?:Eagles|Wildcats|Crusaders|Vikings|Bulldogs|Hilltoppers|Hawks)?\s+(?:picked|dropped|earned|won)/i,
      ) || before.match(/([A-Z][A-Za-z0-9.'’\- ]{2,40})\s+(?:picked|dropped|earned|won)/i)
    if (!schoolMatch) continue
    pushPending({
      division: m[1],
      champion_school: schoolMatch[1],
      runner_up_school: m[4],
      champion_score: Number(m[2]),
      runner_up_score: Number(m[3]),
    })
  }

  const headlineRes = [
    /^(.{3,60}?)\s+(?:three-peats|wins(?:\s+\w+)?|claims|earns|takes)\s+.*?\bas\s+([1-8]A(?:\s*\/\s*[1-8]A)?)\s+Champion/i,
    /^(.{3,60}?)\s+wins\s+.*?\bin\s+([1-8]A(?:\s*\/\s*[1-8]A)?)\s+Championship/i,
    /^(.{3,60}?)\s+Claims\s+First\s+Dual Team(?:\s+Wrestling)?\s+Championship/i,
    /^(.{3,60}?)\s+Wins\s+(?:First|Back-to-back)\s+Dual Team(?:\s+(?:Wrestling\s+)?(?:Titles?|Crown|Wrestling Title))?/i,
    /^(.{3,60}?)\s+Wins\s+First\s+Dual Team\s+Crown/i,
    /^(.{3,60}?)\s+Earns\s+First\s+Title(?:\s+Since\s+\d+)?/i,
    /^(.{3,60}?)\s+breaks through(?:\s+for\s+first\s+title)?/i,
    /^(.{3,60}?)\s+wins first Dual Team Wrestling Title/i,
  ]

  const lines = cleaned.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const classQueue: string[] = []
  for (const line of lines) {
    if (/^[1-8]A(?:\s*\/\s*[1-8]A)?$/i.test(line)) {
      classQueue.push(line.replace(/\s+/g, "").toUpperCase())
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let champion: string | null = null
    let division: string | null = null

    for (const re of headlineRes) {
      const m = line.match(re)
      if (!m) continue
      champion = m[1]
        .replace(/\s+wins\s+thriller.*/i, "")
        .replace(/\s+three-peats.*/i, "")
        .replace(/\s+breaks\s+through.*/i, "")
        .trim()
      division = m[2] ? m[2].replace(/\s+/g, "").toUpperCase() : null
      break
    }

    if (!champion) continue

    const window = lines.slice(i, i + 12).join(" ")
    if (!division) {
      const d =
        window.match(/\bNCHSAA\s+([1-8]A(?:\s*\/\s*[1-8]A)?)\b/i) ||
        window.match(/\bin\s+the\s+([1-8]A(?:\s*\/\s*[1-8]A)?)\s+Championship\b/i) ||
        window.match(/\bwinners of the\s+([1-8]A(?:\s*\/\s*[1-8]A)?)\s+Wrestling\b/i)
      if (d) division = d[1].replace(/\s+/g, "").toUpperCase()
    }

    let runner: string | null = null
    let cScore: number | null = null
    let rScore: number | null = null

    const defeated = window.match(/defeated(?: the)?\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)\b/i)
    const edged = window.match(/edged past(?: the)?\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)\b/i)
    const beat = window.match(/beat(?: the)?\s+(.+?)\s+(\d+)\s*[-–]\s*(\d+)\b/i)
    const winAgainst = window.match(
      /with a\s+(\d+)\s*[-–]\s*(\d+)\s+win against(?: the)?\s+([^.]+?)(?:\.|,|\s+on\s+)/i,
    )
    const simpleWin = window.match(
      /with a\s+(\d+)\s*[-–]\s*(\d+)\s+win(?:\s+against(?: the)?\s+([^.]+?))?(?:\.|,|\s+on\s+|$)/i,
    )

    if (defeated) {
      runner = defeated[1]
      cScore = Number(defeated[2])
      rScore = Number(defeated[3])
    } else if (edged) {
      runner = edged[1]
      cScore = Number(edged[2])
      rScore = Number(edged[3])
    } else if (beat) {
      runner = beat[1]
      cScore = Number(beat[2])
      rScore = Number(beat[3])
    } else if (winAgainst) {
      cScore = Number(winAgainst[1])
      rScore = Number(winAgainst[2])
      runner = winAgainst[3]
    } else if (simpleWin) {
      cScore = Number(simpleWin[1])
      rScore = Number(simpleWin[2])
      runner = simpleWin[3] || null
      if (!runner) {
        const both = window.match(
          /\bboth\s+([A-Z][A-Za-z.'’\- ]+?)\s+and\s+([A-Z][A-Za-z.'’\- ]+?)\s+were\b/i,
        )
        if (both) {
          const a = normalizeDualSchool(both[1])
          const b = normalizeDualSchool(both[2])
          const champ = normalizeDualSchool(champion)
          runner = schoolMentions(a, champ) ? b : a
        }
      }
    }

    pushPending({
      division: division || "",
      champion_school: champion,
      runner_up_school: runner,
      champion_score: cScore,
      runner_up_score: rScore,
    })
  }

  // Assign missing divisions from nav class queue in appearance order (1A→4A / 1A→8A)
  const used = new Set(pending.filter((p) => p.division).map((p) => p.division))
  const unusedQueue = classQueue.filter((c) => !used.has(c))
  for (const p of pending) {
    if (!p.division && unusedQueue.length) {
      p.division = unusedQueue.shift()!
      used.add(p.division)
    }
  }

  const out: DualDraft[] = []
  const seenDiv = new Set<string>()
  for (const p of pending) {
    if (!p.division || seenDiv.has(p.division)) continue
    seenDiv.add(p.division)
    out.push(p)
  }
  return out
}
