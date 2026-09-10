import "server-only"

import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteCredentialsBatch, ordinal } from "@/lib/credentials/athlete-credentials"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { MAX_COACHES_PER_ATHLETE } from "@/lib/toc/coach-designation"

/**
 * Public read model for announced TOC weight classes — the ONLY path that may feed a public page.
 *
 * Security rules, in order of importance:
 *
 * 1. A weight is public only when `toc_field_publication_status.announced_at` is set. Locking a field
 *    (`athlete_field_locked`) means staff finished it, NOT that media released it. Never gate on the lock.
 * 2. Every select here is an explicit allowlist. `toc_invitations` rows carry `seed`, `medical_notes`,
 *    `jacket_size` and acknowledgment flags on the same row, and {@link import("./field-board").TocFieldAthlete}
 *    additionally carries AI seeding and head-to-head scouting evidence. None of that may ever be serialized
 *    toward a browser — so no `select("*")`, and this module deliberately does not import the field-board types.
 * 3. Athletes are not identified by school. TOC wrestlers compete unattached; club and class year only.
 * 4. A photo is published only when the athlete accepted the photo release on their confirmation.
 * 5. Ordering is alphabetical, applied here on the server. The public field is not seeded, and seed order
 *    must not be inferable from row order.
 *
 * Callers are server components. There is intentionally no public API route wrapping this — an endpoint
 * would be enumerable by weight, and the drip release depends on unannounced weights being unreachable.
 */

/** Exactly what a visitor may see. Adding a field here makes it public — treat changes as a security review. */
export type PublicFieldAthlete = {
  athleteId: string
  name: string
  graduationYear: number | null
  club: string | null
  /** Null when the athlete has no photo or did not accept the photo release. */
  photoUrl: string | null
  /** College name, only once staff approved the commitment. */
  collegeCommit: string | null
  /** Official published RecruitNC class ranking. Null means the athlete is not publicly ranked. */
  /**
   * Short result lines, e.g. "2024-25 · 59-1 · 30 pins", "2026 NHSCA 4th".
   */
  results: string[]
  /** One-paragraph write-up assembled by {@link buildAthleteSummary}. Empty when there is nothing to say. */
  summary: string
  /** Credential pills, strongest first. Mirrors the admin field board's badges. */
  credentials: PublicCredential[]
  /** Structured counts behind both the card pills and field rollups. */
  accolades: {
    stateTitles: number
    stateFinalistFinishes: number
    statePlacements: number
    allAmericanHonors: number
    /** A college is recorded for the athlete; the name remains hidden until staff approves it. */
    collegeCommitRecorded: boolean
  }
  /**
   * Corner coaches NC United has approved for this wrestler, at most two.
   *
   * `hasCredential` says whether that coach has bought his weekend credential. Both states are
   * shown: a coach who is approved but has not bought is one purchase from a green light, and
   * seeing that is a stronger nudge than being absent from the page and never knowing.
   *
   * Declined designations never appear, and pending ones do not either — those are a family's
   * submission that staff have not reviewed.
   */
  coaches: { name: string; hasCredential: boolean }[]
}

/**
 * The three credentials a public card carries. Narrowed deliberately: "State Qualifier" was a
 * fourth pill, and it appeared only on the wrestlers who had nothing else to show. Everyone in
 * this field qualified, so it marked them out rather than flattering them.
 */
export type PublicCredentialKind = "all-american" | "state-champion" | "state-placer"

export type PublicCredential = {
  kind: PublicCredentialKind
  /** Short pill text, e.g. "2x State Champ". */
  label: string
  /** Longer text for a tooltip, e.g. "2025 3A state champion · 2026 6A state champion". */
  detail: string
}

/** Per-weight totals for the field header — the same shape of question the admin rollup answers. */
export type PublicFieldRollup = {
  athletes: number
  allAmericans: number
  stateChampions: number
  /** Athletes with at least one first- or second-place state finish (includes champions). */
  stateFinalists: number
  /** Athletes with at least one state placement (includes champions). */
  statePlacers: number
  /** Total state placement finishes across all represented seasons. */
  statePlacements: number
  stateTitles: number
  collegeCommits: number
  allAmericanHonors: number
}

export type SeasonRecord = { season: string | null; wins: number; losses: number; pins: number | null }

export type AthleteResultData = {
  seasonRecord: SeasonRecord | null
  /** Most recent year the athlete placed top eight at NHSCA or Fargo. */
  allAmericanYear: number | null
  allAmericanEvent?: "NHSCA" | "Fargo" | null
  allAmericanHonors: number
  lines: string[]
}

/** Top eight at NHSCA earns All-American status. */
const NHSCA_ALL_AMERICAN_PLACES = 8

export function formatSeasonRecord(r: SeasonRecord): string {
  return [r.season, `${r.wins}-${r.losses}`, r.pins ? `${r.pins} pins` : null].filter(Boolean).join(" · ")
}

/**
 * Credential patterns in descending prestige. Matched against the curated `achievements` entries, which is where
 * state results live — an admin typed "2026 State Champion" or "4th at states in 7A".
 */
const STATE_CREDENTIALS = [
  { key: "state-champion", re: /state\s+champ/i },
  { key: "state-placer", re: /state\s+(placer|runner)|placed?\b[^.]*\bstate|\b\d+(?:st|nd|rd|th)\b[^.]*\bstates?\b/i },
  { key: "state-qualifier", re: /state\s+qualifier|qualified\b[^.]*\bstate/i },
] as const

/**
 * The single credential the paragraph should open with, strongest first: NHSCA All-American, then state
 * champion, placer, qualifier, then a winning season. Returns the lead phrase plus whichever achievement entry
 * it consumed, so the same fact is not repeated later in the paragraph.
 */
export function pickHeadlineCredential(input: {
  achievements: string[]
  allAmericanYear: number | null
  allAmericanEvent?: "NHSCA" | "Fargo" | null
  seasonRecord: SeasonRecord | null
}): { phrase: string; usedAchievement: string | null; usedSeasonRecord: boolean; isTitle: boolean } | null {
  const { achievements, allAmericanYear, allAmericanEvent = "NHSCA", seasonRecord } = input

  if (allAmericanYear) {
    return {
      phrase: `a ${allAmericanYear} ${allAmericanEvent ?? "NHSCA"} All-American`,
      usedAchievement: null,
      usedSeasonRecord: false,
      isTitle: true,
    }
  }

  for (const { re } of STATE_CREDENTIALS) {
    const hit = achievements.find((a) => re.test(a))
    if (hit) {
      // Use the admin's own wording. Short title-style entries ("2026 State Champion") take an article and read
      // inline; longer prose ("4th at regionals and 4th at states in 7A") becomes its own sentence instead.
      const isTitle = /^\d|^[A-Z]/.test(hit) && hit.split(/\s+/).length <= 5
      return { phrase: isTitle ? `a ${hit}` : hit, usedAchievement: hit, usedSeasonRecord: false, isTitle }
    }
  }

  if (seasonRecord && seasonRecord.wins > seasonRecord.losses) {
    const season = seasonRecord.season ? `${seasonRecord.season} ` : ""
    return {
      phrase: `coming off a ${season}${seasonRecord.wins}-${seasonRecord.losses} season`,
      usedAchievement: null,
      usedSeasonRecord: true,
      isTitle: false,
    }
  }

  return null
}

/**
 * A short paragraph about the wrestler, in the same register as a Data Dawg write-up: name and club, then the
 * strongest credential the athlete holds (All-American, state champion, state placer, state qualifier, winning
 * season — in that order), then remaining accomplishments, results and commitment.
 *
 * Structured fields only; never `bio`, which names the school.
 */
export function buildAthleteSummary(input: {
  name: string
  graduationYear: number | null
  club: string | null
  collegeCommit: string | null
  achievements: string[]
  results: AthleteResultData
}): string {
  const { name, graduationYear, club, collegeCommit, achievements, results } = input
  const first = name.trim().split(/\s+/)[0] || name
  const sentences: string[] = []

  const headline = pickHeadlineCredential({
    achievements,
    allAmericanYear: results.allAmericanYear,
    allAmericanEvent: results.allAmericanEvent,
    seasonRecord: results.seasonRecord,
  })

  const classPart = graduationYear ? `a Class of ${graduationYear} wrestler` : "a wrestler"
  const clubPart = club ? ` who competes with ${club}` : ""

  // Club first, then the strongest credential — identity, then why they matter.
  if (headline?.isTitle) {
    sentences.push(`${name} is ${classPart}${clubPart}, and ${headline.phrase}.`)
  } else if (headline?.usedSeasonRecord) {
    sentences.push(`${name} is ${classPart}${clubPart}, ${headline.phrase}.`)
  } else if (headline) {
    // Prose credential stands alone rather than colliding with the sentence's own "and".
    sentences.push(`${name} is ${classPart}${clubPart}.`)
    sentences.push(`${first} went ${headline.phrase}.`)
  } else {
    sentences.push(`${name} is ${classPart}${clubPart}.`)
  }

  const remainingAchievements = achievements.filter((a) => a !== headline?.usedAchievement)
  if (remainingAchievements.length > 0) {
    const list =
      remainingAchievements.length === 1
        ? remainingAchievements[0]
        : `${remainingAchievements.slice(0, -1).join(", ")} and ${remainingAchievements[remainingAchievements.length - 1]}`
    sentences.push(`${first}'s accomplishments include ${list}.`)
  }

  const seasonLine = results.seasonRecord ? formatSeasonRecord(results.seasonRecord) : null
  const remainingLines = results.lines.filter((l) => !(headline?.usedSeasonRecord && l === seasonLine))
  if (remainingLines.length > 0) {
    sentences.push(`Recent results: ${remainingLines.join("; ")}.`)
  }

  if (collegeCommit) {
    sentences.push(`${first} is committed to ${collegeCommit}.`)
  }

  return sentences.join(" ")
}



/**
 * Prose columns that must never be used on this page: they embed the athlete's school in free text — real data
 * reads "Liam Myles is a wrestler at Union Pines High School…". TOC wrestlers compete unattached, so anything
 * school-identifying is out, and full prose cannot be sanitized reliably.
 *
 * `achievements` is deliberately NOT on this list. It is a curated array of short accomplishment strings
 * ("2026 State Champion", "2x Regional Champion") rather than narrative, so it carries the substance a reader
 * wants without the school. Entries are still screened by {@link SCHOOL_MENTION_RE} before publishing.
 */
export const FORBIDDEN_SUMMARY_COLUMNS = ["bio", "bio_headline"] as const

/** Drops any achievement line that names a school, since the field is free text an admin typed. */
const SCHOOL_MENTION_RE = /high school|middle school|\bh\.?s\.?\b|\bacademy\b|\bprep\b/i

/** Accomplishment lines an admin curated, screened for school mentions and trimmed. */
export function publicAchievementLines(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? [raw] : []
  const out: string[] = []
  for (const entry of list) {
    if (typeof entry !== "string") continue
    // Admins sometimes put several facts in one entry ("45-8 as a freshman. 4th at states in 7A"). Split them so
    // each can be ranked and quoted on its own instead of one blob headlining the paragraph.
    for (const piece of entry.split(/(?<=\.)\s+/)) {
      const text = piece.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "")
      if (!text || SCHOOL_MENTION_RE.test(text)) continue
      out.push(text)
    }
  }
  return out
}

/**
 * Per-athlete placement columns on `athletes`. Kept as a fallback because they are unpopulated for the current
 * field — the live data lives in `nhsca_placements` — but they cost nothing and some older rows carry them.
 */
const PLACEMENT_COLUMNS = [
  { column: "nhsca_2026_placement", label: "2026 NHSCA" },
  { column: "super_32_2025_placement", label: "2025 Super 32" },
  { column: "nhsca_2025_placement", label: "2025 NHSCA" },
  { column: "super_32_2024_placement", label: "2024 Super 32" },
  { column: "nhsca_2024_placement", label: "2024 NHSCA" },
] as const

/**
 * The only columns the credential matcher may read, and an allowlist for the same reason every
 * other select in this file is one: `athletes` has 100 columns, among them GPA, contact email,
 * phone, birthdate and staff evaluation notes. A `select("*")` here would put all of that one
 * careless spread away from a public card.
 *
 * These are what {@link loadAthleteCredentials} needs to tell two wrestlers with one name apart.
 * Removing one does not break the build — it quietly weakens every match on the page, which is
 * the failure this whole change exists to end. `firstName` and `lastName` are camelCase in
 * Postgres and must stay quoted or they resolve lowercased and 404.
 */
const IDENTITY_COLUMNS = [
  "id",
  "name",
  "wrestling_name",
  '"firstName"',
  '"lastName"',
  "highschool",
  "graduationyear",
  "nhsca_results",
  "super32_results",
] as const

/** At most this many result lines per athlete — the card is a summary, not a résumé. */
const MAX_PUBLIC_RESULTS = 3

/** "4" reads as a stray number under a photo; "4th" reads as a finish. */
export function formatPlacement(raw: string): string {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 99) return raw
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"
  return `${n}${suffix}`
}

function buildPublicResults(row: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const { column, label } of PLACEMENT_COLUMNS) {
    if (out.length >= MAX_PUBLIC_RESULTS) break
    const raw = row[column]
    const value = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : ""
    if (!value) continue
    out.push(`${label} ${value}`)
  }
  return out
}

/**
 * State-tournament credentials from `wrestling_nchsaa_results`.
 *
 * That table has no `athlete_id` — only `wrestler_name` and `school` — so rows are matched by name. Two guards
 * keep that honest: generational suffixes are stripped (the table stores "Kristopher Kerr", the roster stores
 * "Kristopher Kerr Jr"), and results are constrained to seasons the athlete could plausibly have wrestled, so a
 * namesake from a different era cannot be credited.
 *
 * `school` is never selected. These are the athlete's accomplishments, not their affiliation.
 */
const STATE_PLACE_LABELS: Record<number, string> = { 1: "state champion", 2: "state runner-up" }

/** Latest season a class-of-N wrestler could compete, and how many years back to allow. */
const HS_SEASON_SPAN = 4

export function normalizeNameForStateMatch(name: string): string {
  // Drop a quoted nickname before anything else. State results record the legal name, while a
  // roster often carries the name people use — Amanuel "Manny" Kahsai has state results under
  // Amanuel Kahsai and was matching none of them. Removing the decoration is not a claim that two
  // records are the same person; it is the same name with the quotes taken off.
  // The quote must open a whole token, so an apostrophe inside a surname is untouched: two of them
  // in one name ("D'Angelo O'Brien") would otherwise look like a quoted nickname and take the
  // middle of the name with it.
  const withoutNickname = name.replace(
    /(^|\s)["'\u2018\u2019\u201c\u201d][^"'\u2018\u2019\u201c\u201d]+["'\u2018\u2019\u201c\u201d](?=\s|$)/g,
    " ",
  )
  const parts = withoutNickname.trim().split(/\s+/).filter(Boolean)
  while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1]!.toLowerCase())) parts.pop()
  return parts.join(" ")
}

export function formatStateCredential(row: { year: number; place: number | null; classification: string | null }): string | null {
  const { year, place, classification } = row
  if (!year) return null
  const cls = (classification ?? "").trim()
  const prefix = [String(year), cls].filter(Boolean).join(" ")
  if (place == null) return `${prefix} state qualifier`
  const label = STATE_PLACE_LABELS[place] ?? `state ${formatPlacement(String(place))} place`
  return `${prefix} ${label}`
}

/** Parsed state result, kept structured so credentials can be counted rather than string-matched. */
export type StateResult = { year: number; place: number | null; classification: string | null }

/** A placement deep enough to count as placing at state. */
const STATE_PLACER_MAX = 8

export function buildCredentials(input: {
  stateResults: StateResult[]
  allAmericanYear: number | null
  allAmericanEvent?: "NHSCA" | "Fargo" | null
  allAmericanHonors?: number
}): PublicCredential[] {
  const { stateResults, allAmericanYear, allAmericanEvent = "NHSCA", allAmericanHonors = allAmericanYear ? 1 : 0 } = input
  const out: PublicCredential[] = []

  if (allAmericanYear) {
    out.push({
      kind: "all-american",
      label: allAmericanHonors > 1 ? `${allAmericanHonors}x All-American` : "All-American",
      detail: `${allAmericanYear} ${allAmericanEvent ?? "NHSCA"} All-American`,
    })
  }

  const titles = stateResults.filter((r) => r.place === 1)
  const placements = stateResults.filter((r) => r.place != null && r.place > 1 && r.place <= STATE_PLACER_MAX)

  if (titles.length > 0) {
    out.push({
      kind: "state-champion",
      label: titles.length > 1 ? `${titles.length}x State Champ` : "State Champ",
      detail: titles.map((r) => formatStateCredential(r)).filter(Boolean).join(" · "),
    })
  }
  if (placements.length > 0) {
    out.push({
      kind: "state-placer",
      label: placements.length > 1 ? `${placements.length}x State Placer` : "State Placer",
      detail: placements.map((r) => formatStateCredential(r)).filter(Boolean).join(" · "),
    })
  }
  /*
   * Three credentials, and no more — All-American, state champion, state placer.
   * A card with nothing to show shows nothing: "State Qualifier" was a pill for having entered,
   * shown only to the wrestlers with the least to say, which marks them out rather than
   * flattering them. Everyone in this field qualified.
   */

  return out
}

export function buildFieldRollup(athletes: PublicFieldAthlete[]): PublicFieldRollup {
  return {
    athletes: athletes.length,
    allAmericans: athletes.filter((a) => a.credentials.some((c) => c.kind === "all-american")).length,
    stateChampions: athletes.filter((a) => a.credentials.some((c) => c.kind === "state-champion")).length,
    stateFinalists: athletes.filter((a) => a.accolades.stateFinalistFinishes > 0).length,
    statePlacers: athletes.filter((a) =>
      a.credentials.some((c) => c.kind === "state-champion" || c.kind === "state-placer"),
    ).length,
    statePlacements: athletes.reduce((total, athlete) => total + athlete.accolades.statePlacements, 0),
    stateTitles: athletes.reduce((total, athlete) => total + athlete.accolades.stateTitles, 0),
    collegeCommits: athletes.filter((athlete) => athlete.accolades.collegeCommitRecorded).length,
    allAmericanHonors: athletes.reduce((total, athlete) => total + athlete.accolades.allAmericanHonors, 0),
  }
}

/**
 * State and national credentials, from the one engine every surface shares.
 *
 * This used to be three hand-rolled lookups. State results already went through the shared
 * matcher, but NHSCA and Fargo were `.in("athlete_id", ids)` queries straight against
 * `nhsca_placements` and `fargo_results` — and 60 of the 106 All-American rows in that first
 * table have no `athlete_id`, because a 2025 import glued the first word of each school onto the
 * wrestler's name. The field page therefore showed 8 All-Americans where the athlete actually
 * held 11, and which three vanished depended on nothing a reader could see.
 *
 * {@link loadAthleteCredentialsBatch} reconciles a name against the school and the plausible
 * seasons, exactly as an athlete profile does, so the field and the profile can no longer
 * disagree about the same wrestler.
 *
 * Identity rows are read here and never published. The school is what tells two wrestlers with
 * one name apart; rule 3 at the top of this file governs what reaches a visitor, not what the
 * server may look at to decide whose result is whose.
 */
async function fetchFieldCredentials(
  identityRows: Array<Record<string, unknown>>,
): Promise<{ state: Map<string, StateResult[]>; results: Map<string, AthleteResultData> }> {
  const state = new Map<string, StateResult[]>()
  const results = new Map<string, AthleteResultData>()
  if (identityRows.length === 0) return { state, results }

  const admin = createAdminClient()
  const ids = identityRows.map((row) => String(row.id ?? "")).filter(Boolean)
  const [credentials, seasons] = await Promise.all([
    loadAthleteCredentialsBatch(admin, identityRows),
    fetchSeasonRecordByAthleteId(ids),
  ])

  for (const id of ids) {
    const held = credentials.get(id)
    const seasonRecord = seasons.get(id) ?? null

    if (held && held.state.length) {
      state.set(
        id,
        held.state.map((row) => ({ year: row.year, place: row.place, classification: row.classification })),
      )
    }

    /*
     * Presentation is unchanged on purpose: an NHSCA trip that produced only a record still earns
     * a line, placings render as ordinals, and Fargo follows NHSCA. Only the source of the facts
     * moved, so the diff across the field is the credentials that were missing and nothing else.
     */
    const lines: string[] = []
    if (seasonRecord) lines.push(formatSeasonRecord(seasonRecord))
    for (const trip of held?.national ?? []) {
      const finish =
        trip.place != null ? ordinal(trip.place) : trip.placementText || trip.record || null
      if (finish) lines.push(`${trip.year} ${trip.event} ${finish}`)
    }

    const newest = held?.allAmerican[0] ?? null
    results.set(id, {
      seasonRecord,
      allAmericanYear: newest?.year ?? null,
      allAmericanEvent: newest?.event ?? null,
      allAmericanHonors: held?.allAmerican.length ?? 0,
      lines: lines.slice(0, MAX_PUBLIC_RESULTS),
    })
  }

  return { state, results }
}

/**
 * Most recent season record from `matches` — the line that actually says something about a wrestler
 * ("2024-25 · 59-1 · 30 pins").
 *
 * `matches` also carries `high_school` and `grade`; neither is selected. `wrestler_id` is a name-and-season slug
 * and is not needed either.
 */
async function fetchSeasonRecordByAthleteId(athleteIds: string[]): Promise<Map<string, SeasonRecord>> {
  const out = new Map<string, SeasonRecord>()
  if (athleteIds.length === 0) return out

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("matches")
    .select("athlete_id, season, wins, losses, pins")
    .in("athlete_id", athleteIds)

  if (error) {
    console.warn("[toc-public-field] season record lookup failed:", error.message)
    return out
  }

  type Row = {
    athlete_id?: string | null
    season?: string | null
    wins?: number | null
    losses?: number | null
    pins?: number | null
  }

  const bestByAthlete = new Map<string, Row>()
  for (const raw of (data ?? []) as Row[]) {
    const id = typeof raw.athlete_id === "string" ? raw.athlete_id : ""
    if (!id) continue
    const current = bestByAthlete.get(id)
    // Seasons are "2024-25" strings, so a lexical compare picks the latest correctly.
    if (!current || String(raw.season ?? "") > String(current.season ?? "")) bestByAthlete.set(id, raw)
  }

  for (const [id, row] of bestByAthlete) {
    const wins = Number(row.wins)
    const losses = Number(row.losses)
    if (!Number.isFinite(wins) || !Number.isFinite(losses) || wins + losses === 0) continue
    const pins = Number(row.pins)
    out.set(id, {
      season: (row.season ?? "").trim() || null,
      wins,
      losses,
      pins: Number.isFinite(pins) && pins > 0 ? pins : null,
    })
  }

  return out
}

export type PublicAnnouncedWeight = {
  weightClass: number
  announcedAt: string
  athletes: PublicFieldAthlete[]
  rollup: PublicFieldRollup
}

export type PublicWeightTile = {
  weightClass: number
  announced: boolean
  /** Null unless announced. */
  announcedAt: string | null
  /** Count of announced athletes; 0 unless announced. Never a capacity or "x of 12" figure. */
  athleteCount: number
}

/** Statuses that represent an athlete actually in the field. */
const PUBLIC_STATUSES = ["confirmed"] as const

function isValidWeight(weightClass: number): boolean {
  return (TOC_WEIGHT_CLASSES as readonly number[]).includes(weightClass)
}

/**
 * Weight classes with `announced_at` set. Returns an empty set rather than throwing when the column or
 * table is missing, so a migration gap keeps the public page empty instead of publishing everything.
 */
async function fetchAnnouncedAtByWeight(): Promise<Map<number, string>> {
  const admin = createAdminClient()
  const out = new Map<number, string>()

  const { data, error } = await admin
    .from("toc_field_publication_status")
    .select("weight_class, announced_at")
    .not("announced_at", "is", null)

  if (error) {
    console.warn("[toc-public-field] announced_at lookup failed — treating every weight as unannounced:", error.message)
    return out
  }

  for (const raw of data ?? []) {
    const row = raw as { weight_class?: number | null; announced_at?: string | null }
    const w = Number(row.weight_class)
    if (!Number.isFinite(w) || !isValidWeight(w)) continue
    if (!row.announced_at) continue
    out.set(w, row.announced_at)
  }
  return out
}

/** Suffixes that are not the surname — "Kristopher Kerr Jr" sorts under Kerr, not Jr. */
const NAME_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"])

/**
 * Surname, then given name. Sorting the whole name string would order the field by first name, which does not
 * read as alphabetical on a roster — the page states the field is alphabetical, so this has to match a reader's
 * expectation of it.
 */
export function surnameSortKey(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]!.toLowerCase()

  let lastIdx = parts.length - 1
  while (lastIdx > 0 && NAME_SUFFIXES.has(parts[lastIdx]!.toLowerCase())) {
    lastIdx -= 1
  }
  const surname = parts[lastIdx]!.toLowerCase()
  const given = parts.slice(0, lastIdx).join(" ").toLowerCase()
  return `${surname} ${given}`.trim()
}

function comparePublicNames(a: PublicFieldAthlete, b: PublicFieldAthlete): number {
  return surnameSortKey(a.name).localeCompare(surnameSortKey(b.name), "en", { sensitivity: "base" })
}

/**
 * Confirmed athletes for one announced weight, alphabetical. Reads invitations and athletes with explicit
 * column lists and drops anything the visitor may not see before returning.
 */
/** "Rivera" and "rivera" and "Alexander  Moody" all land on the same key. */
function coachAthleteKey(name: string): string {
  return name.toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
}

/**
 * Approved corner coaches, keyed by the athlete's name, each marked paid or not.
 *
 * A credential shows as a green dot and an approved coach without one as amber. The amber is
 * deliberate: a coach left off the page entirely never learns he is missing, while one shown a
 * step short of his colleagues has a reason to finish.
 *
 * Designations record the athlete by name and weight rather than by id, so this matches on a
 * normalised name within the weight. A purchase reaches a coach by the email or phone the family
 * gave us, or by a link an admin made by hand.
 */
async function fetchApprovedCoachesByAthlete(): Promise<Map<string, { name: string; hasCredential: boolean }[]>> {
  const admin = createAdminClient()
  const byAthlete = new Map<string, { name: string; hasCredential: boolean }[]>()

  const [{ data, error }, { data: tickets, error: ticketError }] = await Promise.all([
    /**
     * Not scoped by weight: five approved designations carry no weight_class, and filtering on it
     * silently dropped those coaches from every page. The athlete's name is the join.
     */
    admin
      .from("toc_coach_designations")
      .select("athlete_name, coach_name, coach_email, coach_phone, coach_phone_key, coach_key, status"),
    admin.from("toc_coach_ticket_purchases").select("email, linked_coach_key, first_name, last_name, status"),
  ])

  if (error) {
    console.warn("[toc-public-field] coach designation lookup failed:", error.message)
    return byAthlete
  }
  if (ticketError) {
    // Every coach would show as unpaid, which is worse than showing nobody: it would mark coaches
    // who have paid as though they had not.
    console.warn("[toc-public-field] coach ticket lookup failed:", ticketError.message)
    return byAthlete
  }

  type Row = {
    athlete_name?: string | null
    coach_name?: string | null
    coach_email?: string | null
    coach_phone?: string | null
    coach_phone_key?: string | null
    coach_key?: string | null
    status?: string | null
  }
  const rows = (data ?? []) as Row[]

  /**
   * A credential belongs to a person, not to a row.
   *
   * One coach can hold several designations under several keys — Nick Kostoff arrived as a phone
   * from one family, an email from another and an account from a third. His ticket is linked to
   * one of those keys, so checking a designation against its own key alone showed him paid beside
   * one wrestler and unpaid beside another. Identities are collapsed on the phone number, which is
   * the detail every one of his rows shared, then every alias that person is known by counts.
   */
  const personOf = (row: Row): string => {
    const phone = String(row.coach_phone_key ?? row.coach_phone ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
    if (phone) return `tel:${phone}`
    const email = String(row.coach_email ?? "").trim().toLowerCase()
    if (email) return `mail:${email}`
    return `key:${String(row.coach_key ?? "").trim()}`
  }

  const aliasesByPerson = new Map<string, { emails: Set<string>; keys: Set<string>; names: Set<string> }>()
  for (const row of rows) {
    const person = personOf(row)
    const bucket =
      aliasesByPerson.get(person) ?? { emails: new Set<string>(), keys: new Set<string>(), names: new Set<string>() }
    const email = String(row.coach_email ?? "").trim().toLowerCase()
    if (email) bucket.emails.add(email)
    const key = String(row.coach_key ?? "").trim()
    if (key) bucket.keys.add(key)
    const name = coachAthleteKey(String(row.coach_name ?? ""))
    if (name) bucket.names.add(name)
    aliasesByPerson.set(person, bucket)
  }

  const paidPeople = new Set<string>()
  for (const raw of tickets ?? []) {
    const ticket = raw as {
      email?: string | null
      linked_coach_key?: string | null
      first_name?: string | null
      last_name?: string | null
      status?: string | null
    }
    /**
     * A transferred order stays on the buyer's row with its status changed. Crediting them would
     * show a green card for a credential they handed to somebody else.
     */
    const ticketStatus = String(ticket.status ?? "").trim().toLowerCase()
    if (ticketStatus && ticketStatus !== "active") continue
    const email = String(ticket.email ?? "").trim().toLowerCase()
    const linked = String(ticket.linked_coach_key ?? "").trim()
    /**
     * The buyer's name, where GoFan collected it.
     *
     * The reason this route exists: a coach who checked out under a club account or a spouse's
     * address matched on nothing, and every one of them had to be linked by hand. A name places
     * them without anyone intervening. Only used when it is a full name, so a lone first name
     * cannot sweep in several coaches at once.
     */
    const buyerName =
      ticket.first_name && ticket.last_name
        ? coachAthleteKey(`${ticket.first_name} ${ticket.last_name}`)
        : ""

    for (const [person, aliases] of aliasesByPerson) {
      const matched =
        (email && aliases.emails.has(email)) ||
        (linked && aliases.keys.has(linked)) ||
        (buyerName && aliases.names.has(buyerName))
      if (matched) paidPeople.add(person)
    }
  }

  for (const row of rows) {
    if (row.status !== "approved") continue
    const athlete = coachAthleteKey(String(row.athlete_name ?? ""))
    const coach = String(row.coach_name ?? "").trim()
    if (!athlete || !coach) continue

    const list = byAthlete.get(athlete) ?? []
    if (!list.some((existing) => existing.name.toLowerCase() === coach.toLowerCase())) {
      list.push({ name: coach, hasCredential: paidPeople.has(personOf(row)) })
    }
    byAthlete.set(athlete, list)
  }
  return byAthlete
}

async function fetchPublicAthletesForWeight(weightClass: number): Promise<PublicFieldAthlete[]> {
  const admin = createAdminClient()
  const coachesByAthlete = await fetchApprovedCoachesByAthlete()

  const { data: invites, error } = await admin
    .from("toc_invitations")
    .select("athlete_id, status, photo_release_accepted")
    .eq("weight_class", weightClass)
    .in("status", PUBLIC_STATUSES as unknown as string[])

  if (error) {
    console.warn("[toc-public-field] invitation lookup failed:", error.message)
    return []
  }

  const releaseByAthleteId = new Map<string, boolean>()
  for (const raw of invites ?? []) {
    const row = raw as { athlete_id?: string | null; photo_release_accepted?: boolean | null }
    const id = typeof row.athlete_id === "string" ? row.athlete_id.trim() : ""
    if (!id) continue
    releaseByAthleteId.set(id, row.photo_release_accepted === true)
  }

  const athleteIds = [...releaseByAthleteId.keys()]
  if (athleteIds.length === 0) return []

  // No `highschool` here, and none of FORBIDDEN_SUMMARY_COLUMNS: the public field never identifies an athlete
  // by school, and the prose bio fields embed the school name.
  // `wrestlingClub` is camelCase in Postgres and must stay quoted, otherwise it resolves lowercased and 404s.
  const { data: athletes, error: athleteError } = await admin
    .from("athletes")
    .select(
      [
        "id",
        "name",
        "graduationyear",
        '"wrestlingClub"',
        "photourl",
        "headshot_url",
        "college",
        "commitment_approved",
        "achievements",
        ...PLACEMENT_COLUMNS.map((p) => p.column),
      ].join(", "),
    )
    .in("id", athleteIds)

  if (athleteError) {
    console.warn("[toc-public-field] athlete lookup failed:", athleteError.message)
    return []
  }

  /**
   * Identity rows: a second read, used only to decide whose result is whose.
   *
   * The publishable select above deliberately omits `highschool` and the prose bio fields, and it
   * stays that way — the row that becomes a card cannot leak a school because it never holds one.
   * But the matcher does need the school, and reading it from the same query as the card is how
   * it would eventually reach a visitor. So identity stays in its own variable that no branch
   * below writes into `out`.
   *
   * The previous version tried to have it both ways and lost: it built `rosterForState` expecting
   * `highschool`, from a select that never asked for it, so every state lookup on this page has
   * been running with the school blank.
   */
  const { data: identityRows, error: identityError } = await admin
    .from("athletes")
    .select(IDENTITY_COLUMNS.join(", "))
    .in("id", athleteIds)

  if (identityError) {
    console.warn("[toc-public-field] identity lookup failed:", identityError.message)
  }

  const { state: stateByAthlete, results: publicResults } = await fetchFieldCredentials(
    (identityRows ?? []) as unknown as Array<Record<string, unknown>>,
  )

  const out: PublicFieldAthlete[] = []
  for (const raw of athletes ?? []) {
    const row = raw as {
      id?: string | null
      name?: string | null
      graduationyear?: number | null
      wrestlingClub?: string | null
      photourl?: string | null
      headshot_url?: string | null
    }
    const id = typeof row.id === "string" ? row.id : ""
    const name = typeof row.name === "string" ? row.name.trim() : ""
    if (!id || !name) continue

    const photoReleased = releaseByAthleteId.get(id) === true
    const headshot = typeof row.headshot_url === "string" ? row.headshot_url.trim() : ""
    const profilePhoto = typeof row.photourl === "string" ? row.photourl.trim() : ""
    // Prefer a purpose-shot headshot when one exists; fall back to the profile photo.
    const rawPhoto = headshot || profilePhoto
    const club = typeof row.wrestlingClub === "string" ? row.wrestlingClub.trim() : ""

    const record = raw as unknown as Record<string, unknown>
    const collegeRaw = typeof record.college === "string" ? record.college.trim() : ""
    // An unapproved commitment is a claim staff have not verified — do not publish it.
    const collegeCommit = record.commitment_approved === true && collegeRaw ? collegeRaw : null
    const resultData: AthleteResultData = publicResults.get(id) ?? {
      seasonRecord: null,
      allAmericanYear: null,
      allAmericanEvent: null,
      allAmericanHonors: 0,
      lines: [],
    }
    const graduationYear = typeof row.graduationyear === "number" ? row.graduationyear : null
    const stateResults = stateByAthlete.get(id) ?? []
    const statePlacements = stateResults.filter((result) => result.place != null && result.place <= STATE_PLACER_MAX)
    const results = resultData.lines.length > 0 ? resultData.lines : buildPublicResults(record)

    out.push({
      athleteId: id,
      name,
      graduationYear,
      club: club || null,
      photoUrl: photoReleased && rawPhoto ? rawPhoto : null,
      collegeCommit,
      results,
      summary: buildAthleteSummary({
        name,
        graduationYear: typeof row.graduationyear === "number" ? row.graduationyear : null,
        club: club || null,
        collegeCommit,
        achievements: publicAchievementLines(record.achievements),
        results: { ...resultData, lines: results },
      }),
      credentials: buildCredentials({
        stateResults,
        allAmericanYear: resultData.allAmericanYear,
        allAmericanEvent: resultData.allAmericanEvent,
        allAmericanHonors: resultData.allAmericanHonors ?? 0,
      }),
      accolades: {
        stateTitles: stateResults.filter((result) => result.place === 1).length,
        stateFinalistFinishes: stateResults.filter((result) => result.place != null && result.place <= 2).length,
        statePlacements: statePlacements.length,
        allAmericanHonors: resultData.allAmericanHonors ?? 0,
        collegeCommitRecorded: Boolean(collegeRaw),
      },
      coaches: (coachesByAthlete.get(coachAthleteKey(name)) ?? []).slice(0, MAX_COACHES_PER_ATHLETE),
    })
  }

  return out.sort(comparePublicNames)
}

/**
 * One tile per weight class for the public hub — every weight is listed, but only announced weights
 * carry a date or a count. Unannounced tiles expose nothing about how the field is being built.
 */
export async function listPublicWeightTiles(): Promise<PublicWeightTile[]> {
  const announced = await fetchAnnouncedAtByWeight()

  const tiles = await Promise.all(
    TOC_WEIGHT_CLASSES.map(async (weightClass) => {
      const announcedAt = announced.get(weightClass) ?? null
      if (!announcedAt) {
        return { weightClass, announced: false, announcedAt: null, athleteCount: 0 }
      }
      const athletes = await fetchPublicAthletesForWeight(weightClass)
      return { weightClass, announced: true, announcedAt, athleteCount: athletes.length }
    }),
  )

  return tiles.sort((a, b) => a.weightClass - b.weightClass)
}

/**
 * Full public field for one weight, or null when the weight is invalid or has not been announced.
 * Callers must treat null as {@link import("next/navigation").notFound} — never as an empty field.
 */
/**
 * Cached per weight, and it has to be.
 *
 * Credentials now come from the shared engine, which reconciles each wrestler by name rather than
 * looking them up by id — that is the whole point, and it costs a handful of queries per athlete
 * instead of three batched ones per weight. Uncached, `/api/toc/field` asks for every announced
 * weight at once and took 86 seconds to answer, which on a phone is not slow, it is broken: the
 * bracket screen spun forever and showed nothing.
 *
 * The field changes when staff announce a weight or release the brackets, not otherwise, so this
 * is exactly the kind of read that should be cached. {@link TOC_PUBLIC_FIELD_TAG} is revalidated
 * at both of those moments, so an announcement is still immediate — the cache never stands
 * between staff pressing a button and the public seeing it.
 */
export const TOC_PUBLIC_FIELD_TAG = "toc-public-field"

const loadAnnouncedWeight = unstable_cache(
  async (weightClass: number): Promise<PublicAnnouncedWeight | null> => {
    const announced = await fetchAnnouncedAtByWeight()
    const announcedAt = announced.get(weightClass)
    if (!announcedAt) return null
    const athletes = await fetchPublicAthletesForWeight(weightClass)
    return { weightClass, announcedAt, athletes, rollup: buildFieldRollup(athletes) }
  },
  ["toc-public-announced-weight", "v2-shared-credential-engine"],
  /*
   * A day, and in practice for ever — correctness comes from the tag, not the clock.
   *
   * Announcing a weight and releasing the brackets both drop {@link TOC_PUBLIC_FIELD_TAG}, and
   * those are the only two things that change this field. So the window controls nothing except
   * how often somebody pays the cold cost, and the cold cost is the problem: a full rebuild takes
   * about thirty seconds and the phone gives up at twenty. On a half-hour window that meant the
   * first person to open the field after every lapse got "fetch failed" — the app looked broken
   * twice an hour, to whoever happened to be first.
   *
   * The underlying slowness is the name reconciliation: getFargoFromTable and its siblings try an
   * exact name, then a last-first form, then each spelling variant, awaiting one before starting
   * the next. That is the thing actually worth fixing, and it is not a job for the night before
   * the brackets drop.
   */
  { revalidate: 86400, tags: [TOC_PUBLIC_FIELD_TAG] },
)

/**
 * Rebuild every announced weight's cache entry, now.
 *
 * Call this straight after {@link TOC_PUBLIC_FIELD_TAG} is revalidated. Dropping the tag without
 * rebuilding just moves the thirty-second cold read onto whichever parent opens the app next —
 * and the moment staff press announce or release is exactly when people are looking. Staff wait
 * instead, on a request that is already a deliberate action.
 */
export async function warmPublicAnnouncedField(): Promise<void> {
  const announced = await fetchAnnouncedAtByWeight()
  await Promise.all([...announced.keys()].map((weight) => loadAnnouncedWeight(weight)))
}

export async function getPublicAnnouncedWeight(weightClassInput: number): Promise<PublicAnnouncedWeight | null> {
  const weightClass = Number(weightClassInput)
  if (!Number.isFinite(weightClass) || !isValidWeight(weightClass)) return null
  return loadAnnouncedWeight(weightClass)
}

/** Aggregate every public weight without exposing any athlete from an unreleased weight. */
export async function getPublicAnnouncedFieldRollup(): Promise<PublicFieldRollup> {
  const announced = await fetchAnnouncedAtByWeight()
  const fields = await Promise.all([...announced.keys()].map((weight) => fetchPublicAthletesForWeight(weight)))
  const unique = new Map<string, PublicFieldAthlete>()
  for (const athlete of fields.flat()) unique.set(athlete.athleteId, athlete)
  return buildFieldRollup([...unique.values()])
}

/** True when at least one weight has been released — lets the hub show a pre-release state. */
export async function hasAnyAnnouncedWeight(): Promise<boolean> {
  const announced = await fetchAnnouncedAtByWeight()
  return announced.size > 0
}
