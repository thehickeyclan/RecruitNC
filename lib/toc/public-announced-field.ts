import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

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
  /**
   * Short result lines, e.g. "2024-25 · 59-1 · 30 pins", "2026 NHSCA 4th".
   */
  results: string[]
  /** One-paragraph write-up assembled by {@link buildAthleteSummary}. Empty when there is nothing to say. */
  summary: string
}

/**
 * A short paragraph about the wrestler, in the same register as a Data Dawg write-up: who they train with,
 * what they have done, where they are headed. Assembled from structured fields only — never from `bio`, which
 * names the school.
 */
export function buildAthleteSummary(input: {
  name: string
  graduationYear: number | null
  club: string | null
  collegeCommit: string | null
  achievements: string[]
  results: string[]
}): string {
  const { name, graduationYear, club, collegeCommit, achievements, results } = input
  const first = name.trim().split(/\s+/)[0] || name
  const sentences: string[] = []

  const classPart = graduationYear ? `a Class of ${graduationYear} wrestler` : "a wrestler"
  sentences.push(club ? `${name} is ${classPart} who competes with ${club}.` : `${name} is ${classPart}.`)

  // "accomplishments include" stays grammatical whatever an admin typed, unlike trying to inflect each entry.
  if (achievements.length > 0) {
    const list =
      achievements.length === 1
        ? achievements[0]
        : `${achievements.slice(0, -1).join(", ")} and ${achievements[achievements.length - 1]}`
    sentences.push(`${first}'s accomplishments include ${list}.`)
  }

  if (results.length > 0) {
    sentences.push(`Recent results: ${results.join("; ")}.`)
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
    const text = entry.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "")
    if (!text || SCHOOL_MENTION_RE.test(text)) continue
    out.push(text)
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
 * National-event finishes from `nhsca_placements`, newest first.
 *
 * Two columns on that table are off limits and must never enter the select: `high_school`, for the same reason
 * as everywhere else on this page, and `seed` — an NHSCA seed is still a seed, and this page states the TOC
 * field is unseeded. Only rows with an actual placement are published; a losing record is not a "result" worth
 * putting under an athlete's photo.
 */
async function fetchNhscaLinesByAthleteId(athleteIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (athleteIds.length === 0) return out

  const admin = createAdminClient()
  // No `high_school`, and no `seed` — an NHSCA seed is still a seed on a page that says unseeded.
  const { data, error } = await admin
    .from("nhsca_placements")
    .select("athlete_id, year, placement, record")
    .in("athlete_id", athleteIds)

  if (error) {
    console.warn("[toc-public-field] NHSCA lookup failed:", error.message)
    return out
  }

  type Row = { athlete_id?: string | null; year?: number | null; placement?: string | number | null; record?: string | null }
  const byAthlete = new Map<string, Row[]>()
  for (const raw of (data ?? []) as Row[]) {
    const id = typeof raw.athlete_id === "string" ? raw.athlete_id : ""
    if (!id) continue
    byAthlete.set(id, [...(byAthlete.get(id) ?? []), raw])
  }

  for (const [id, rows] of byAthlete) {
    const lines = rows
      .slice()
      .sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0))
      .map((r) => {
        const year = Number(r.year) || null
        const prefix = `${year ? `${year} ` : ""}NHSCA`
        const placement =
          typeof r.placement === "number" ? String(r.placement) : (r.placement ?? "").toString().trim()
        // A placing is the headline; otherwise the tournament record still shows they were on the national stage.
        if (placement) return `${prefix} ${formatPlacement(placement)}`
        const record = (r.record ?? "").trim()
        return record ? `${prefix} ${record}` : null
      })
      .filter((l): l is string => Boolean(l))
    if (lines.length > 0) out.set(id, lines)
  }

  return out
}

/**
 * Most recent season record from `matches` — the line that actually says something about a wrestler
 * ("2024-25 · 59-1 · 30 pins").
 *
 * `matches` also carries `high_school` and `grade`; neither is selected. `wrestler_id` is a name-and-season slug
 * and is not needed either.
 */
async function fetchSeasonRecordByAthleteId(athleteIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
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
    const season = (row.season ?? "").trim()
    const pins = Number(row.pins)
    const parts = [season || null, `${wins}-${losses}`, Number.isFinite(pins) && pins > 0 ? `${pins} pins` : null]
    out.set(id, parts.filter(Boolean).join(" · "))
  }

  return out
}

/**
 * Public result lines per athlete, best-first: season record, then national tournament lines. Capped at
 * {@link MAX_PUBLIC_RESULTS} so the card stays a summary.
 */
async function fetchPublicResultsByAthleteId(athleteIds: string[]): Promise<Map<string, string[]>> {
  const [seasons, nhsca] = await Promise.all([
    fetchSeasonRecordByAthleteId(athleteIds),
    fetchNhscaLinesByAthleteId(athleteIds),
  ])

  const out = new Map<string, string[]>()
  for (const id of athleteIds) {
    const lines: string[] = []
    const season = seasons.get(id)
    if (season) lines.push(season)
    lines.push(...(nhsca.get(id) ?? []))
    if (lines.length > 0) out.set(id, lines.slice(0, MAX_PUBLIC_RESULTS))
  }
  return out
}

export type PublicAnnouncedWeight = {
  weightClass: number
  announcedAt: string
  athletes: PublicFieldAthlete[]
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
async function fetchPublicAthletesForWeight(weightClass: number): Promise<PublicFieldAthlete[]> {
  const admin = createAdminClient()

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

  const publicResults = await fetchPublicResultsByAthleteId(athleteIds)

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
    const results = publicResults.get(id) ?? buildPublicResults(record)

    out.push({
      athleteId: id,
      name,
      graduationYear: typeof row.graduationyear === "number" ? row.graduationyear : null,
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
        results,
      }),
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
export async function getPublicAnnouncedWeight(weightClassInput: number): Promise<PublicAnnouncedWeight | null> {
  const weightClass = Number(weightClassInput)
  if (!Number.isFinite(weightClass) || !isValidWeight(weightClass)) return null

  const announced = await fetchAnnouncedAtByWeight()
  const announcedAt = announced.get(weightClass)
  if (!announcedAt) return null

  return {
    weightClass,
    announcedAt,
    athletes: await fetchPublicAthletesForWeight(weightClass),
  }
}

/** True when at least one weight has been released — lets the hub show a pre-release state. */
export async function hasAnyAnnouncedWeight(): Promise<boolean> {
  const announced = await fetchAnnouncedAtByWeight()
  return announced.size > 0
}
