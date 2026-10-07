/**
 * Dated bouts for the profile's "last competed" weight: duals and in-season events included.
 *
 * The profile used to look only at tournament results, so a wrestler whose last outing was the
 * Ultimate Club Duals or a regular-season dual read as last competing at Fargo or States, at
 * that weight (Matt, 7 October 2026). The bout table holds every dual we import with the day and
 * the weight wrestled; `matches` holds the in-season record the same way. Same sources as the
 * directory column (lib/prospect-last-competed.ts), so the two agree.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { LastCompetedWeightCandidate } from "@/lib/last-competed-weight"
import { canonicalEventLabel, isoDay } from "@/lib/prospect-last-competed"
import { isHighSchoolEvent } from "@/lib/high-school-window"
import { isYouthDivisionEntry } from "@/lib/nhsca-national-duals-import"

/** Above every result-table priority: a dated bout that ties on the day is the fuller record. */
const BOUT_PRIORITY = 60

export async function loadDatedBoutCandidates(
  supabase: SupabaseClient,
  athlete: { id: string; graduationyear?: unknown },
): Promise<LastCompetedWeightCandidate[]> {
  const grad = Number(athlete.graduationyear) || null
  const [bouts, seasons] = await Promise.all([
    supabase
      .from("other_tournament_bouts")
      .select("event_name, event_date, weight_class, athlete_club")
      .eq("athlete_id", athlete.id)
      .not("event_date", "is", null)
      .order("event_date", { ascending: false })
      .limit(200),
    supabase.from("matches").select("matches").eq("athlete_id", athlete.id),
  ])

  const out: LastCompetedWeightCandidate[] = []
  const add = (event: string, rawDate: unknown, weight: unknown) => {
    const date = isoDay(rawDate)
    if (!date) return
    const year = Number(date.slice(0, 4))
    // No middle school results anywhere (1 October 2026).
    if (!isHighSchoolEvent({ graduationYear: grad, year, event, eventDate: date })) return
    out.push({ year, date, weight: weight as string | number | null, event: canonicalEventLabel(event), priority: BOUT_PRIORITY })
  }
  for (const r of (bouts.data ?? []) as Array<Record<string, unknown>>) {
    // A youth bracket entrant linked to a high schooler by name is somebody else.
    if (isYouthDivisionEntry(r.athlete_club as string | null)) continue
    add(String(r.event_name ?? "Tournament"), r.event_date, r.weight_class)
  }
  for (const row of (seasons.data ?? []) as Array<{ matches: unknown }>) {
    if (!Array.isArray(row.matches)) continue
    for (const bout of row.matches as Array<Record<string, unknown>>) {
      add(String(bout.venue ?? bout.tournament ?? "").trim() || "Dual", bout.date, bout.weight)
    }
  }
  return out
}
