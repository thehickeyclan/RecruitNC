import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAthleteIndex, matchAthlete, type MatchableAthlete } from "@/lib/other-tournament-import"
import { NATIONAL_RANKING_SOURCES, type NationalRankingSource } from "@/lib/national-rankings"

/**
 * One way in for a national ranking edition, whoever found it: SI's own cron, Muse's daily check
 * of Flo / SI / MatScouts (POST /api/rankings/ingest), or the CSV script.
 *
 * Same rules everywhere: only North Carolina rows are matched to a profile (that match is what
 * grants five stars), and only against athletes of the edition's gender, so a girls' list never
 * hands a boy a ranking; every row is stored, because out-of-state rows are how a win over a
 * ranked opponent gets its label. The month's edition for that source and gender is replaced,
 * older months are pruned, and ranking_source_status is stamped so staleness is visible.
 */

export type RankingGender = "M" | "F"

/** An edition from a season that has ended: rejected rather than shown as current. */
export class PriorSeasonError extends Error {}

export type RankingScope = "weight" | "p4p" | "big_board"

export type IncomingRankingRow = {
  rank: number
  name: string
  weight?: string | null
  school?: string | null
  state?: string | null
  /** "SR" / "JR" / "SO" / "FR" / "8th", or a graduation year. */
  grade?: string | number | null
}

export type ImportEditionInput = {
  source: NationalRankingSource
  gender: RankingGender
  /** The day the outlet published this edition (YYYY-MM-DD). */
  published: string
  url?: string | null
  /** "weight" lists, a pound-for-pound list, or a recruiting-class board (MatScouts Big Board). */
  scope?: RankingScope
  /**
   * Which recruiting class a board covers. MatScouts publishes a Senior and a Junior Big Board on
   * the same day; an edition used to be identified by (source, gender, month, scope) alone, so
   * loading the junior board would have deleted the senior board it shares those four with.
   */
  classYear?: number | null
  rows: IncomingRankingRow[]
  /** Who reported it: "si-cron", "muse", "csv". */
  checkedBy: string
}

export type ImportEditionResult = {
  status: "imported" | "unchanged"
  source: NationalRankingSource
  gender: RankingGender
  month: string
  /** The class a board covers; 0 for a list that ranks every class at once. */
  classYear: number
  /** Whether its ranks count within a weight group or across the whole list. */
  rankBasis: RankBasis
  rows: number
  ncMatched: string[]
  /**
   * Set when the rows landed but the freshness stamp did not. Reported rather than only logged:
   * a status write that failed in silence once left the table describing a 95-row board that the
   * same import had just deleted, and nothing downstream could tell.
   */
  statusError?: string
}

export type RankBasis = "weight" | "overall"

const GRADE_OFFSET: Record<string, number> = { SR: 0, JR: 1, SO: 2, FR: 3, "8TH": 4, "7TH": 5 }

/**
 * A season runs August-July: an October 2026 list ranks the class of 2027 as seniors, and a July
 * 2026 list is the final word on 2025-26 (it was treated as next season once, and Flo's final
 * 2025-26 girls list labelled three graduated seniors as the class of 2027).
 */
export function seasonEnd(date: Date): number {
  return date.getUTCMonth() >= 7 ? date.getUTCFullYear() + 1 : date.getUTCFullYear()
}

/**
 * Whether a list can be this season's. Outlets leave last season's final list up through
 * August (MatScouts' girls list of 4 Aug 2026 still ranked a 2026 graduate), so a list is
 * current only from 1 September, and never when its own link names an earlier season
 * ("...rankings-for-the-2025-26-season").
 */
function isCurrentSeasonList(published: Date, url: string | null | undefined, now = new Date()): boolean {
  const season = seasonEnd(now)
  const startsCounting = Date.UTC(season - 1, 8, 1) // 1 September
  if (published.getTime() < startsCounting) return false
  const named = String(url ?? "").match(/(20\d{2})[-_](?:20)?(\d{2})(?!\d)/)
  if (named && Number(named[1]) + 1 < season) return false
  return true
}

function classYear(grade: IncomingRankingRow["grade"], published: Date): number | null {
  if (grade == null || grade === "") return null
  const n = Number(grade)
  if (Number.isInteger(n) && n >= 2025 && n <= 2035) return n
  const offset = GRADE_OFFSET[String(grade).trim().toUpperCase()]
  return offset == null ? null : seasonEnd(published) + offset
}

/**
 * A class-scoped list's own class year, or 0 for one that is not class-scoped.
 *
 * Only boards are class-scoped, and an outlet publishes one per class on the same day, so this
 * belongs to the edition's identity rather than to its rows. Weight and P4P lists rank every class
 * at once and carry 0.
 */
export function resolveEditionClassYear(
  scope: RankingScope,
  stated: number | null | undefined,
  rows: IncomingRankingRow[],
  published: Date,
): number {
  if (scope !== "big_board") return 0
  const named = Number(stated)
  if (Number.isInteger(named) && named >= 2025 && named <= 2035) return named
  // Unstated: every wrestler on a board is in the class it covers, so the rows can name it.
  const years = new Set(rows.map((r) => classYear(r.grade, published)).filter((y): y is number => y != null))
  if (years.size === 1) return [...years][0]!
  throw new Error(
    "A board must say which class it covers (classYear): an outlet publishes one per class on the same day" +
      (years.size > 1 ? `, and its rows name ${years.size} classes (${[...years].sort().join(", ")})` : ", and its rows name none"),
  )
}

/**
 * Whether a rank counts within a weight group or across the whole list.
 *
 * MatScouts' senior girls board carries each wrestler's rank inside her weight class - the 155 lb
 * seniors are 1,2,3,4,5,6,8,15,18, and the gaps are the juniors ranked above them - so "#8" on its
 * own is meaningless. Their junior board is a single list of 90. Computed rather than declared: a
 * rank that repeats inside an edition can only be a within-weight rank.
 */
export function resolveRankBasis(scope: RankingScope, rows: IncomingRankingRow[]): RankBasis {
  if (scope === "weight") return "weight"
  if (scope === "p4p") return "overall"
  const ranks = rows.map((r) => Number(r.rank))
  return new Set(ranks).size === ranks.length ? "overall" : "weight"
}

async function loadRoster(admin: SupabaseClient, gender: RankingGender): Promise<MatchableAthlete[]> {
  const out: MatchableAthlete[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("athletes")
      .select('id, name, wrestling_name, highschool, "wrestlingClub", graduationyear, gender')
      .range(from, from + 999)
    if (error) throw new Error(`Loading athletes: ${error.message}`)
    for (const a of data ?? []) {
      const g = String((a as { gender?: string | null }).gender ?? "").toLowerCase()
      // Unknown gender stays matchable either way; a known one must agree with the list.
      if (g && (gender === "F" ? !g.startsWith("f") : g.startsWith("f"))) continue
      out.push(a as MatchableAthlete)
    }
    if (!data || data.length < 1000) break
  }
  return out
}

/** A stable fingerprint of an edition's contents, so a re-sent unchanged list is a no-op. */
function fingerprint(rows: IncomingRankingRow[]): string {
  const text = rows
    .map((r) => `${r.weight ?? ""}|${r.rank}|${r.name.trim().toLowerCase()}`)
    .sort()
    .join("\n")
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `${rows.length}:${(h >>> 0).toString(16)}`
}

export async function importNationalEdition(admin: SupabaseClient, input: ImportEditionInput): Promise<ImportEditionResult> {
  if (!(input.source in NATIONAL_RANKING_SOURCES)) throw new Error(`Unknown source ${input.source}`)
  const published = new Date(`${input.published}T12:00:00Z`)
  if (Number.isNaN(published.getTime())) throw new Error(`Bad published date ${input.published}`)
  const month = input.published.slice(0, 7)
  const rankingMonth = `${month}-01`
  const scope = input.scope ?? "weight"
  const rows = input.rows.filter((r) => r && r.name?.trim() && Number(r.rank) > 0)
  const editionClassYear = resolveEditionClassYear(scope, input.classYear, rows, published)
  const rankBasis = resolveRankBasis(scope, rows)
  const print = fingerprint(rows)
  const now = new Date().toISOString()

  /*
   * Freshness is recorded per list type, not per source.
   *
   * It used to track weight lists only, on the reasoning that boards and P4P ride along with them.
   * MatScouts' girls board is the only girls list they publish, so it rode along with nothing: its
   * published date was never stamped and a board posted that morning reported as "no new edition
   * in ∞ days". One row per (source, gender, scope) lets each list answer for itself.
   */
  const { data: status } = await admin
    .from("ranking_source_status")
    .select("fingerprint")
    .eq("source", input.source)
    .eq("gender", input.gender)
    .eq("scope", scope)
    .eq("edition_class_year", editionClassYear)
    .maybeSingle()
  // Same list as last time, and still on file: just record the check. (The fingerprint alone was
  // trusted once, and a re-sent Flo girls list was skipped after its rows had been pruned away.)
  const { count: held } =
    status?.fingerprint === print
      ? await admin
          .from("national_rankings")
          .select("id", { count: "exact", head: true })
          .eq("source", input.source)
          .eq("gender", input.gender)
          .eq("ranking_month", rankingMonth)
          .eq("scope", scope)
          .eq("edition_class_year", editionClassYear)
      : { count: 0 }
  if (status?.fingerprint === print && (held ?? 0) > 0) {
    await admin
      .from("ranking_source_status")
      .update({ last_checked_at: now, checked_by: input.checkedBy })
      .eq("source", input.source)
      .eq("gender", input.gender)
      .eq("scope", scope)
      .eq("edition_class_year", editionClassYear)
    return {
      status: "unchanged",
      source: input.source,
      gender: input.gender,
      month,
      classYear: editionClassYear,
      rankBasis,
      rows: rows.length,
      ncMatched: [],
    }
  }

  // Only this season's lists count as current rankings. Until an outlet publishes its 2026-27
  // list, the newest one it has is last season's final - Flo's girls list in October 2026 - and
  // that ranks seniors who have since graduated.
  const currentSeason = seasonEnd(new Date())
  if (!isCurrentSeasonList(published, input.url)) {
    throw new PriorSeasonError(
      `This looks like a ${currentSeason - 2}-${String(currentSeason - 1).slice(2)} list (published ${input.published}); ` +
        `send it once the ${currentSeason - 1}-${String(currentSeason).slice(2)} list is out`,
    )
  }

  // A graduate is never linked to a current ranking, whatever the list says.
  const roster = (await loadRoster(admin, input.gender)).filter((a) => {
    const year = Number((a as { graduationyear?: unknown }).graduationyear)
    return !Number.isFinite(year) || year === 0 || year >= currentSeason
  })
  const index = buildAthleteIndex(roster)
  const ncMatched: string[] = []
  const payload = rows.map((row) => {
    const state = String(row.state ?? "").trim().toUpperCase() || null
    const isNc = state === "NC" || !state
    const outcome = isNc ? matchAthlete(row.name.trim(), row.school ?? "", index) : ({ status: "unmatched" } as const)
    const athleteId = outcome.status === "matched" ? outcome.athlete.id : null
    if (athleteId) ncMatched.push(`#${row.rank} ${row.name.trim()}${row.weight ? ` (${row.weight})` : ""}`)
    return {
      source: input.source,
      gender: input.gender,
      ranking_month: rankingMonth,
      athlete_id: athleteId,
      athlete_name: row.name.trim(),
      rank: Number(row.rank),
      scope,
      edition_class_year: editionClassYear,
      rank_basis: rankBasis,
      weight_class: row.weight ? String(row.weight).trim() : null,
      class_year: classYear(row.grade, published),
      high_school: row.school?.trim() || null,
      state,
      source_url: input.url ?? null,
    }
  })

  const { error: clearError } = await admin
    .from("national_rankings")
    .delete()
    .eq("source", input.source)
    .eq("gender", input.gender)
    .eq("ranking_month", rankingMonth)
    .eq("scope", scope)
    .eq("edition_class_year", editionClassYear)
  if (clearError) throw new Error(`Clearing edition: ${clearError.message}`)
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await admin.from("national_rankings").insert(payload.slice(i, i + 500))
    if (error) throw new Error(`Inserting: ${error.message}`)
  }
  await pruneEditions(admin, input.source, input.gender)
  await archiveEdition(admin, payload, input.published, null)

  const { error: statusError } = await admin.from("ranking_source_status").upsert(
    {
      source: input.source,
      gender: input.gender,
      scope,
      edition_class_year: editionClassYear,
      last_checked_at: now,
      last_changed_at: now,
      published: input.published,
      edition_url: input.url ?? null,
      row_count: payload.length,
      nc_matched: ncMatched.length,
      fingerprint: print,
      checked_by: input.checkedBy,
    },
    { onConflict: "source,gender,scope,edition_class_year" },
  )
  if (statusError) console.error("[rankings] status stamp failed:", statusError.message)

  return {
    statusError: statusError?.message,
    status: "imported",
    source: input.source,
    gender: input.gender,
    month,
    classYear: editionClassYear,
    rankBasis,
    rows: payload.length,
    ncMatched,
  }
}

/**
 * Copy an edition into national_rankings_archive, which is never pruned (Matt, 8 October 2026).
 *
 * The live table keeps three months because it answers "ranked now". The archive answers "was the
 * opponent ranked when they wrestled". A failure here never fails the import: until the archive
 * table is created (scripts/create-national-rankings-archive.sql) this logs and carries on.
 */
export async function archiveEdition(
  admin: SupabaseClient,
  rows: ReadonlyArray<Record<string, unknown>>,
  publishedOn: string,
  sourceFile: string | null,
): Promise<number> {
  if (!rows.length) return 0
  const archived = rows.map((r) => ({
    source: r.source,
    gender: r.gender,
    published_on: publishedOn,
    ranking_month: r.ranking_month,
    scope: r.scope ?? "weight",
    edition_class_year: r.edition_class_year ?? 0,
    rank_basis: r.rank_basis ?? "weight",
    rank: r.rank,
    athlete_name: r.athlete_name,
    athlete_id: r.athlete_id ?? null,
    weight_class: r.weight_class ?? null,
    class_year: r.class_year ?? null,
    high_school: r.high_school ?? null,
    state: r.state ?? null,
    source_url: r.source_url ?? null,
    source_file: sourceFile,
  }))
  let written = 0
  for (let i = 0; i < archived.length; i += 500) {
    const { error } = await admin.from("national_rankings_archive").upsert(archived.slice(i, i + 500), {
      onConflict: "source,gender,published_on,scope,edition_class_year,athlete_name,weight_class",
    })
    if (error) {
      console.warn(`[national-rankings] archive skipped: ${error.message}`)
      return written
    }
    written += Math.min(500, archived.length - i)
  }
  return written
}

/**
 * Keep the three newest months of one source and gender, drop the rest. The old SQL prune kept the
 * three newest months across every source at once - fine when one person loaded one outlet a
 * month, fatal once outlets publish on their own clocks: Flo girls (dated July) was deleted
 * seconds after Muse first posted it, by the next import's prune.
 */
export async function pruneEditions(admin: SupabaseClient, source: string, gender: RankingGender) {
  const months = new Set<string>()
  for (let from = 0; months.size < 4; from += 1000) {
    const { data } = await admin
      .from("national_rankings")
      .select("ranking_month")
      .eq("source", source)
      .eq("gender", gender)
      .order("ranking_month", { ascending: false })
      .range(from, from + 999)
    for (const r of data ?? []) months.add(String(r.ranking_month))
    if (!data || data.length < 1000) break
  }
  const keep = [...months].sort().reverse().slice(0, 3)
  if (months.size <= 3 || !keep.length) return
  await admin
    .from("national_rankings")
    .delete()
    .eq("source", source)
    .eq("gender", gender)
    .lt("ranking_month", keep[keep.length - 1]!)
}

/** Stamp a check that found nothing new (Muse's daily "no change" report). */
export async function markRankingChecked(
  admin: SupabaseClient,
  source: NationalRankingSource,
  gender: RankingGender,
  checkedBy: string,
  /* Which list was checked. An outlet can publish several, and each goes stale on its own. */
  scope: RankingScope = "weight",
  /* Which class, for a board: 0 for a list that ranks every class at once. */
  editionClassYear = 0,
) {
  const now = new Date().toISOString()
  const { error } = await admin
    .from("ranking_source_status")
    .upsert(
      { source, gender, scope, edition_class_year: editionClassYear, last_checked_at: now, checked_by: checkedBy },
      { onConflict: "source,gender,scope,edition_class_year", ignoreDuplicates: false },
    )
  if (error) throw new Error(error.message)
}

/**
 * Record that an outlet's newest list is last season's, without storing it.
 *
 * The rows are deliberately not kept: a ranking is a statement about a wrestler now, five stars
 * are gated on simply holding a matched row, and last season's final ranks seniors who have since
 * graduated - storing it would hand them a current five-star. What is worth keeping is the one
 * fact, that they have published nothing for this season yet and when their last list went up.
 * Without it, an outlet sitting on last season's final and an outlet that publishes nothing at all
 * are the same empty row.
 */
export async function markPriorSeasonSeen(
  admin: SupabaseClient,
  source: NationalRankingSource,
  gender: RankingGender,
  checkedBy: string,
  published: string,
  url: string | null,
  scope: RankingScope = "weight",
  editionClassYear = 0,
) {
  const { error } = await admin.from("ranking_source_status").upsert(
    {
      source,
      gender,
      scope,
      edition_class_year: editionClassYear,
      last_checked_at: new Date().toISOString(),
      prior_season_published: published,
      prior_season_url: url,
      checked_by: checkedBy,
    },
    { onConflict: "source,gender,scope,edition_class_year", ignoreDuplicates: false },
  )
  if (error) throw new Error(error.message)
}
