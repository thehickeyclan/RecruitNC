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
  scope?: "weight" | "p4p"
  rows: IncomingRankingRow[]
  /** Who reported it: "si-cron", "muse", "csv". */
  checkedBy: string
}

export type ImportEditionResult = {
  status: "imported" | "unchanged"
  source: NationalRankingSource
  gender: RankingGender
  month: string
  rows: number
  ncMatched: string[]
}

const GRADE_OFFSET: Record<string, number> = { SR: 0, JR: 1, SO: 2, FR: 3, "8TH": 4, "7TH": 5 }

/** A season runs August-July: an October 2026 list ranks the class of 2027 as seniors. */
function seasonEnd(published: Date): number {
  return published.getMonth() >= 6 ? published.getFullYear() + 1 : published.getFullYear()
}

function classYear(grade: IncomingRankingRow["grade"], published: Date): number | null {
  if (grade == null || grade === "") return null
  const n = Number(grade)
  if (Number.isInteger(n) && n >= 2025 && n <= 2035) return n
  const offset = GRADE_OFFSET[String(grade).trim().toUpperCase()]
  return offset == null ? null : seasonEnd(published) + offset
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
  const print = fingerprint(rows)
  const now = new Date().toISOString()

  const { data: status } = await admin
    .from("ranking_source_status")
    .select("fingerprint")
    .eq("source", input.source)
    .eq("gender", input.gender)
    .maybeSingle()
  if (status?.fingerprint === print) {
    await admin
      .from("ranking_source_status")
      .update({ last_checked_at: now, checked_by: input.checkedBy })
      .eq("source", input.source)
      .eq("gender", input.gender)
    return { status: "unchanged", source: input.source, gender: input.gender, month, rows: rows.length, ncMatched: [] }
  }

  const index = buildAthleteIndex(await loadRoster(admin, input.gender))
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
  if (clearError) throw new Error(`Clearing edition: ${clearError.message}`)
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await admin.from("national_rankings").insert(payload.slice(i, i + 500))
    if (error) throw new Error(`Inserting: ${error.message}`)
  }
  await admin.rpc("prune_national_rankings")

  const { error: statusError } = await admin.from("ranking_source_status").upsert(
    {
      source: input.source,
      gender: input.gender,
      last_checked_at: now,
      last_changed_at: now,
      published: input.published,
      edition_url: input.url ?? null,
      row_count: payload.length,
      nc_matched: ncMatched.length,
      fingerprint: print,
      checked_by: input.checkedBy,
    },
    { onConflict: "source,gender" },
  )
  if (statusError) console.error("[rankings] status stamp failed:", statusError.message)

  return { status: "imported", source: input.source, gender: input.gender, month, rows: payload.length, ncMatched }
}

/** Stamp a check that found nothing new (Muse's daily "no change" report). */
export async function markRankingChecked(admin: SupabaseClient, source: NationalRankingSource, gender: RankingGender, checkedBy: string) {
  const now = new Date().toISOString()
  const { error } = await admin
    .from("ranking_source_status")
    .upsert({ source, gender, last_checked_at: now, checked_by: checkedBy }, { onConflict: "source,gender", ignoreDuplicates: false })
  if (error) throw new Error(error.message)
}
