/**
 * Commitment flip-card honor chips (All-American, state honors).
 * Single module so behavior is testable and the UI cannot drift.
 */
import { nchsaaJsonToProfileRows } from "@/lib/nchsaa-results-json"
import { getNhscaResults, getSuper32Results } from "@/lib/tournament-utils"

export const COMMITMENT_CARD_HONOR_ORDER = ["All-American", "State Champion", "State Placer", "State Qualifier"] as const

/** Rows from `all_results.nchsaa` (table + JSON merge) — minimal fields for state chips. */
export type NchsaaHonorRowInput = {
  year?: unknown
  classification?: unknown
  weight_class?: unknown
  place?: unknown
}

/** Rows from merged NHSCA / Super32 tournament tables (API `all_results`). */
export type NationalHonorRowInput = {
  placement?: unknown
  record?: unknown
}

function honorPlaceNum(p: unknown): number {
  if (p == null || p === "") return NaN
  if (typeof p === "string") {
    const t = p.trim()
    if (t === "") return NaN
    const n = Number(t)
    return Number.isNaN(n) ? NaN : n
  }
  const n = Number(p)
  return Number.isNaN(n) ? NaN : n
}

/**
 * State honor chips from merged NCHSAA rows (API `all_results.nchsaa`).
 * Buckets by **calendar year** only: one NC season → one state bracket per athlete, so any `place >= 1`
 * in that year suppresses `place === 0` for that year (duplicate SQ rows, empty `weight_class`,
 * mismatched classification/merge keys). Across years, SQ and champion can both appear.
 */
export function stateHonorsFromNchsaaMergedRows(rows: NchsaaHonorRowInput[]): string[] {
  const byYear = new Map<number, NchsaaHonorRowInput[]>()
  for (const r of rows) {
    const y = Number(r.year)
    if (!Number.isFinite(y)) continue
    const list = byYear.get(y)
    if (list) list.push(r)
    else byYear.set(y, [r])
  }

  const found = new Set<string>()
  for (const list of byYear.values()) {
    let hasChamp = false
    let hasPlacer = false
    let hasSq = false
    for (const r of list) {
      const pn = honorPlaceNum(r.place)
      if (Number.isNaN(pn)) continue
      if (pn === 1) hasChamp = true
      else if (pn >= 2 && pn <= 24) hasPlacer = true
      else if (pn === 0) hasSq = true
    }
    if (hasChamp) found.add("State Champion")
    else if (hasPlacer) found.add("State Placer")
    else if (hasSq) found.add("State Qualifier")
  }

  return (["State Champion", "State Placer", "State Qualifier"] as const).filter((b) => found.has(b))
}

/**
 * Final honor row for the flip card: never show "State Qualifier" alongside a higher state honor.
 * Table/API rows can lag (SQ only) while profile prose or columns already show champ/placer — the badge row should not contradict.
 */
export function mergeCommitmentHonorBadgesForDisplay(profileHonors: string[], serverStateHonors: string[]): string[] {
  const merged = new Set<string>([...profileHonors, ...serverStateHonors])
  if (merged.has("State Champion") || merged.has("State Placer")) {
    merged.delete("State Qualifier")
  }
  return COMMITMENT_CARD_HONOR_ORDER.filter((b) => merged.has(b))
}

/** NHSCA / Super32 top-8 (or explicit All-American text) from merged tournament rows. */
export function allAmericanFromMergedNationalRows(
  nhscaRows: NationalHonorRowInput[],
  super32Rows: NationalHonorRowInput[] = [],
): boolean {
  for (const row of [...nhscaRows, ...super32Rows]) {
    const snippet = String(row.placement ?? "").trim()
    if (!snippet) continue
    const record = row.record != null ? String(row.record) : undefined
    if (barePlacementLooksLikeWinCountFromRecord(snippet, record)) continue
    if (snippetImpliesNationalAllAmerican(snippet, { trustedNationalPlacementColumn: true })) {
      return true
    }
  }
  return false
}

/**
 * Full flip-card honor row: profile columns/JSON + table-backed NCHSAA + NHSCA/Super32 merges.
 * Same pipeline as `/api/wrestling-achievements` → `ProfessionalCommitmentCard`.
 */
export function buildCommitmentCardHonorBadges(params: {
  athlete: Record<string, unknown>
  nchsaaMergedRows?: NchsaaHonorRowInput[]
  nhscaMergedRows?: NationalHonorRowInput[]
  super32MergedRows?: NationalHonorRowInput[]
}): string[] {
  const profileHonors = getCommitmentHonorBadgesForAthlete(params.athlete)
  const serverFound = new Set(stateHonorsFromNchsaaMergedRows(params.nchsaaMergedRows ?? []))
  const serverState = (["State Champion", "State Placer", "State Qualifier"] as const).filter((b) =>
    serverFound.has(b),
  )
  const merged = new Set(mergeCommitmentHonorBadgesForDisplay(profileHonors, [...serverState]))
  if (
    allAmericanFromMergedNationalRows(params.nhscaMergedRows ?? [], params.super32MergedRows ?? [])
  ) {
    merged.add("All-American")
  }
  return COMMITMENT_CARD_HONOR_ORDER.filter((b) => merged.has(b))
}

const HONOR_PLACEMENT_SNIPPET_KEYS = [
  "nhsca_2025_placement",
  "nhsca_2024_placement",
  "nhsca_2023_placement",
  "super_32_2025_placement",
  "super_32_2024_placement",
  "super_32_2023_placement",
] as const

function pushAchievementLines(lines: string[], v: string[] | string | undefined) {
  if (v == null) return
  if (Array.isArray(v)) {
    for (const x of v) {
      const t = String(x).trim()
      if (t) lines.push(t)
    }
  } else if (typeof v === "string" && v.trim()) {
    v.split(/[\n,]+/).forEach((part) => {
      const t = part.trim()
      if (t) lines.push(t)
    })
  }
}

function collectHonorPlacementEntries(
  athlete: Record<string, unknown>,
): { key: (typeof HONOR_PLACEMENT_SNIPPET_KEYS)[number]; snippet: string }[] {
  const out: { key: (typeof HONOR_PLACEMENT_SNIPPET_KEYS)[number]; snippet: string }[] = []
  for (const k of HONOR_PLACEMENT_SNIPPET_KEYS) {
    const v = athlete[k]
    if (v != null && String(v).trim() !== "") out.push({ key: k, snippet: String(v) })
  }
  return out
}

function tournamentRecordKeyForPlacementKey(placementKey: string): string {
  return placementKey.replace(/_placement$/, "_record")
}

/** Placement field equals wins side of same-year W–L record → not a bracket place (common data entry mistake). */
export function barePlacementLooksLikeWinCountFromRecord(snippet: string, recordRaw: string | undefined): boolean {
  const t = String(snippet ?? "").trim()
  const bare = t.match(/^\s*(\d{1,2})\s*$/)
  if (!bare) return false
  const n = Number.parseInt(bare[1], 10)
  const rec = String(recordRaw ?? "").trim().replace(/^\(|\)$/g, "").trim()
  const rm = rec.match(/^(\d{1,2})\s*[-–]\s*\d+$/)
  if (!rm) return false
  const wins = Number.parseInt(rm[1], 10)
  return wins === n
}

function parseBracketPlacementRank(text: string): number | null {
  const t = text.toLowerCase().trim()
  if (!t || t === "-" || t === "—") return null
  if (/^\d+\s*[-–]\s*\d+$/.test(t)) return null
  if (/\b\d{1,2}(?:st|nd|rd|th)\s+grader\b|\b\d{1,2}(?:st|nd|rd|th)\s+grade\b(?!\s*point)/i.test(text)) {
    return null
  }

  if (/\bchampion\b|first\s+place|\b1\s*st\b|^1st\b|\b1\s*st\s+place\b/.test(t)) return 1

  const top = t.match(/\btop\s*(\d{1,2})\b/)
  if (top) {
    const n = Number.parseInt(top[1], 10)
    if (n >= 1 && n <= 8) {
      if (/\btop\s*\d+\b.*\bstate\b/i.test(t) && !/\b(nhsca|super\s*-?\s*32)\b/i.test(t)) return null
      return n
    }
  }

  const ord = t.match(/\b(\d{1,2})(?:st|nd|rd|th)(?:\s+place)?\b/i)
  if (ord) {
    if (/\b\d{1,2}(?:st|nd|rd|th)\s+grader\b/i.test(t)) return null
    const n = Number.parseInt(ord[1], 10)
    if (n >= 1 && n <= 16) return n
  }

  const bare = t.match(/^\s*(\d{1,2})\s*$/)
  if (bare) {
    const n = Number.parseInt(bare[1], 10)
    if (n >= 1 && n <= 8) return n
  }

  return null
}

function numericPlacementLooksStateOrRegionalOnly(low: string): boolean {
  if (
    /\b(at|in|for)\s+state\b|\bstate\s+(champ|championship|championships|final|finals|tournament)\b|\bhigh\s+school\s+state\b/i.test(
      low,
    )
  ) {
    return true
  }
  if (
    /\bnchsaa\b/i.test(low) &&
    !/\bnational|nationals|virginia\s+beach|hs\s+nationals|high\s+school\s+nationals/i.test(low)
  ) {
    return true
  }
  if (/\bregional\b/i.test(low) && !/\b(nhsca|super\s*-?\s*32)\b/i.test(low)) {
    return true
  }
  return false
}

function snippetImpliesNationalAllAmerican(snippet: string, opts?: { trustedNationalPlacementColumn?: boolean }): boolean {
  const trusted = opts?.trustedNationalPlacementColumn === true
  const raw = String(snippet ?? "").trim()
  if (!raw) return false
  const low = raw.toLowerCase()

  if (/\ball[\s-]?american\b|\ball\s+american\b/.test(low)) return true
  if (/\bnational\s+finalist\b|\bnational\s+placer\b/.test(low)) return true

  const hasNationalTournamentContext =
    /\ball[\s-]?american\b|\ball\s+american\b|\bnational\s+finalist\b|\bnational\s+placer\b|\b(nhsca|super\s*-?\s*32)\b/.test(low)

  if (
    /\bstate\s+(final|finals|finalist|champ|championship|tournament|qual|qualifier)\b/.test(low) &&
    !hasNationalTournamentContext
  ) {
    return false
  }

  if (/\bnchsaa\s+state\b|\bstate\s+series\b/i.test(low) && !hasNationalTournamentContext) {
    return false
  }

  const rank = parseBracketPlacementRank(raw)
  if (rank != null && rank >= 1 && rank <= 8) {
    if (numericPlacementLooksStateOrRegionalOnly(low)) return false
    if (!trusted) return false
    return true
  }

  if (
    /\b(nhsca|super\s*-?\s*32)\b/.test(low) &&
    /\b(finalist|semifinal|semis)\b/.test(low) &&
    /\b(nationals?|national\s+final|hs\s+nationals|high\s+school\s+nationals|virginia\s+beach|all[\s-]?american)\b/i.test(
      low,
    )
  ) {
    return true
  }

  return false
}

function applyNationalBracketTop8FromSnippets(
  found: Set<string>,
  entries: { key: (typeof HONOR_PLACEMENT_SNIPPET_KEYS)[number] | string; snippet: string }[],
  athlete: Record<string, unknown>,
) {
  for (const { key, snippet } of entries) {
    const recordKey = tournamentRecordKeyForPlacementKey(String(key))
    const pairedRecord = athlete[recordKey]
    if (barePlacementLooksLikeWinCountFromRecord(snippet, pairedRecord != null ? String(pairedRecord) : undefined)) {
      continue
    }
    if (snippetImpliesNationalAllAmerican(snippet, { trustedNationalPlacementColumn: true })) {
      found.add("All-American")
      return
    }
  }
}

function applyNchsaaJsonStateHonors(found: Set<string>, raw: unknown) {
  const rows = nchsaaJsonToProfileRows(raw, "")
  for (const row of rows) {
    const p = row.place
    if (p === 1) found.add("State Champion")
    else if (p != null && p >= 2 && p <= 24) found.add("State Placer")
  }
}

/**
 * Removed: state honours used to be inferred from the athlete's own achievements prose.
 *
 * That is how a typed line became a STATE CHAMPION badge on the commitment card. All-American
 * was already fenced off here for the same reason ("avoids RankWrestler false positives");
 * state honours never were. They now come from wrestling_nchsaa_results via
 * applyNchsaaJsonStateHonors, which is populated by RecruitNC and covers girls as well as
 * boys since the 2026 women's results were labelled.
 */

/**
 * Honor labels for the commitment card back (order preserved).
 * All-American from profile placement columns, nhsca_results / super32_results JSON, and (via
 * `buildCommitmentCardHonorBadges`) merged NHSCA/Super32 tournament tables. Achievements prose
 * never adds All-American (avoids RankWrestler false positives).
 */
export function getCommitmentHonorBadgesForAthlete(athlete: Record<string, unknown>): string[] {
  try {
    const found = new Set<string>()

    const placementEntries = collectHonorPlacementEntries(athlete)
    applyNationalBracketTop8FromSnippets(found, placementEntries, athlete)
    applyNchsaaJsonStateHonors(found, athlete.nchsaa_results)

    const nhscaFromProfile = getNhscaResults(athlete).map((r) => ({
      placement: r.placement,
      record: r.record,
    }))
    const super32FromProfile = getSuper32Results(athlete).map((r) => ({
      placement: r.placement,
      record: r.record,
    }))
    if (allAmericanFromMergedNationalRows(nhscaFromProfile, super32FromProfile)) {
      found.add("All-American")
    }

    if (found.has("State Champion") || found.has("State Placer")) {
      found.delete("State Qualifier")
    }

    return COMMITMENT_CARD_HONOR_ORDER.filter((b) => found.has(b))
  } catch (e) {
    console.error("[RecruitNC] getCommitmentHonorBadgesForAthlete:", e)
    return []
  }
}
