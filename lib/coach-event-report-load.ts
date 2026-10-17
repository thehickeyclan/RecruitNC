/**
 * Reads for the coach event report (lib/coach-event-report.ts). Read-only, every one.
 *
 * A wrestler's bouts are read the way his profile reads them - `getOtherTournamentBoutsForAthleteRecord`,
 * by athlete id plus the verified-name fallback - so the email can never show a bout the profile
 * does not. The profile's own finish for the event (Super 32 from the linked result tables when
 * RESULT_LINKS_READ=1, other events from `other_tournament_results`) is loaded beside it so the
 * caller can say where the derived place and the profile disagree.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { getOtherTournamentBoutsForAthleteRecord } from "@/lib/other-tournaments"
import { loadProfileStrengthOfCompetition } from "@/lib/profile/load-profile-strength"
import type { OpponentIndex } from "@/lib/significant-wins"
import { hasBoutsAtEvent, type FieldRow, type ReportAthleteInput, type ReportEvent } from "@/lib/coach-event-report"

/** Every row at the event's source files. Ordered by id: unordered pages skip and repeat rows. */
export async function loadEventField(admin: SupabaseClient, event: ReportEvent): Promise<FieldRow[]> {
  const out: FieldRow[] = []
  for (const source of event.sources) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from("other_tournament_bouts")
        .select("id,event_key,source_file,athlete_name,weight_class,round,bout_order,opponent_name,win,is_bye")
        .eq("event_key", source.eventKey)
        .in("source_file", [...source.sourceFiles])
        .order("id")
        .range(from, from + 999)
      if (error) throw new Error(`other_tournament_bouts: ${error.message}`)
      for (const r of data ?? []) {
        out.push({
          eventKey: String(r.event_key),
          sourceFile: (r.source_file as string) ?? null,
          athleteName: String(r.athlete_name ?? ""),
          weight: String(r.weight_class ?? ""),
          round: String(r.round ?? ""),
          boutOrder: Number(r.bout_order ?? 0),
          opponentName: (r.opponent_name as string) ?? null,
          win: Boolean(r.win),
          isBye: Boolean(r.is_bye),
        })
      }
      if (!data || data.length < 1000) break
    }
  }
  return out
}

export type CoachRecipient = {
  userId: string
  email: string
  name: string | null
  role: unknown
  verified_coach: unknown
  is_admin: unknown
}

export async function loadCoachByEmail(admin: SupabaseClient, email: string): Promise<CoachRecipient | null> {
  const { data } = await admin
    .from("user_profiles")
    .select("user_id,email,full_name,first_name,last_name,role,verified_coach,is_admin")
    .ilike("email", email.trim().replace(/[%_\\]/g, "\\$&"))
    .maybeSingle()
  if (!data) return null
  const name = String(data.full_name ?? "").trim() || [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null
  return {
    userId: String(data.user_id),
    email: String(data.email),
    name,
    role: data.role,
    verified_coach: data.verified_coach,
    is_admin: data.is_admin,
  }
}

/** The athletes a coach has starred. Only the ids: the star rows carry the coach's private notes. */
export async function loadStarredAthleteIds(admin: SupabaseClient, coachUserId: string): Promise<string[]> {
  const { data, error } = await admin.from("college_coach_stars").select("athlete_id").eq("coach_user_id", coachUserId)
  if (error) throw new Error(`college_coach_stars: ${error.message}`)
  return [...new Set((data ?? []).map((r) => String(r.athlete_id)).filter(Boolean))]
}

export type LoadedAthlete = ReportAthleteInput & {
  /** The finish the profile shows for this event, for the cross-check. Null: none shown. */
  profilePlacement: string | null
  profileRecord: string | null
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i]!)
      }
    }),
  )
  return out
}

export async function loadReportAthletes(
  admin: SupabaseClient,
  event: ReportEvent,
  athleteIds: readonly string[],
  options?: {
    profileCheck?: boolean
    concurrency?: number
    /** Compute each wrestler's profile Strength of Competition grade. Default true. */
    strength?: boolean
    /**
     * The opponent index the report already loads (loadSignificantOpponentIndex), so the grade's
     * significant-wins read does not load it again per wrestler.
     */
    opponentIndex?: OpponentIndex | Promise<OpponentIndex> | null
  },
): Promise<{ athletes: LoadedAthlete[]; missing: string[] }> {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < athleteIds.length; i += 100) {
    const { data, error } = await admin.from("athletes").select("*").in("id", athleteIds.slice(i, i + 100))
    if (error) throw new Error(`athletes: ${error.message}`)
    rows.push(...((data ?? []) as Record<string, unknown>[]))
  }
  const byId = new Map(rows.map((r) => [String(r.id), r]))
  const missing = athleteIds.filter((id) => !byId.has(id))
  const present = athleteIds.filter((id) => byId.has(id))

  const athletes = await mapLimit(present, options?.concurrency ?? 8, async (id): Promise<LoadedAthlete> => {
    const row = byId.get(id)!
    const boutsLoad = getOtherTournamentBoutsForAthleteRecord(admin, row)
    const [bouts, bundle, grade] = await Promise.all([
      boutsLoad,
      options?.profileCheck === false || !event.profileSection
        ? Promise.resolve(null)
        : loadAthleteTournamentBundle(admin, row).catch(() => null),
      /*
       * Strength of Competition exactly as his profile shows it today: the profile's own reads and
       * assembly (lib/profile/load-profile-strength.ts). Null when it cannot be computed. Only for
       * a wrestler with bouts at the event: the report shows it on competed cards alone.
       */
      options?.strength === false
        ? Promise.resolve(null)
        : boutsLoad.then(async (b) => {
            if (!hasBoutsAtEvent(event, b)) return null
            const index = await Promise.resolve(options?.opponentIndex ?? undefined).catch(() => undefined)
            return loadProfileStrengthOfCompetition(admin, id, { index: index ?? undefined })
          }),
    ])
    let profilePlacement: string | null = null
    let profileRecord: string | null = null
    let profileResults: Array<{ eventKey: string; weight: string }> | null = null
    if (bundle && event.profileSection?.table === "super32") {
      // One Super 32 per year: its rows stand for every source of the event.
      const year = event.profileSection.year
      const rows = bundle.super32.filter((r) => Number(r.year) === year)
      profilePlacement = rows[0]?.placement?.trim() || null
      profileRecord = rows[0]?.record?.trim() || null
      profileResults = event.sources.flatMap((s) => rows.map((r) => ({ eventKey: s.eventKey, weight: String(r.weight ?? "") })))
    } else if (bundle && event.profileSection?.table === "other") {
      const keys = new Set(event.sources.map((s) => s.eventKey))
      const rows = bundle.other.filter((r) => keys.has(r.eventKey))
      const main = rows.find((r) => event.sources.some((s) => s.placementsCount && s.eventKey === r.eventKey))
      profilePlacement = main?.placement != null ? String(main.placement) : null
      profileRecord = main?.record || null
      profileResults = rows.map((r) => ({ eventKey: r.eventKey, weight: r.weight }))
    }
    const grad = Number(row.graduationyear)
    return {
      id,
      name: String(row.name ?? "").trim() || "Unnamed wrestler",
      gender: (row.gender as string | null) ?? null,
      graduationYear: Number.isFinite(grad) && grad > 0 ? grad : null,
      school: String(row.highschool ?? "").trim() || null,
      bouts,
      profileResults,
      strength: grade ? { grade: grade.label, line: grade.verdict } : null,
      profilePlacement,
      profileRecord,
    }
  })
  return { athletes, missing }
}
