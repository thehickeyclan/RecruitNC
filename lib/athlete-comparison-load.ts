/**
 * Everything the comparison needs about one wrestler, in one place.
 *
 * A coach comparing two recruits is asking a narrow question — who is better, and how do you
 * know — so this loads the evidence that answers it and nothing else. Bouts come from every
 * source we hold, because a comparison that only sees the state tournament will miss the one
 * meeting that settles it.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ComparisonBout, ComparisonSide } from "@/lib/athlete-comparison"

export type ComparisonProfile = ComparisonSide & {
  record: string | null
  statePlacements: string[]
  nationalResults: string[]
  matchCount: number
}

function ordinal(place: number): string {
  if (place === 1) return "Champion"
  const mod = place % 100
  if (mod >= 11 && mod <= 13) return `${place}th`
  const last = place % 10
  return `${place}${last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th"}`
}

export async function loadComparisonProfile(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<ComparisonProfile | null> {
  const { data: athlete } = await supabase
    .from("athletes")
    .select("id,name,highschool,graduationyear,weightclass,prospect_ranking")
    .eq("id", athleteId)
    .maybeSingle()
  if (!athlete) return null

  const [tournamentBouts, seasons, state, other] = await Promise.all([
    supabase
      .from("other_tournament_bouts")
      .select("opponent_name,opponent_id,win,win_type,score,event_name,event_date")
      .eq("athlete_id", athleteId),
    supabase.from("matches").select("season,matches,wins,losses").eq("athlete_id", athleteId),
    supabase.from("wrestling_nchsaa_results").select("year,classification,weight_class,place").eq("athlete_id", athleteId),
    supabase
      .from("other_tournament_results")
      .select("event_short_name,year,weight_class,record,placement")
      .eq("athlete_id", athleteId),
  ])

  const bouts: ComparisonBout[] = []
  for (const row of tournamentBouts.data ?? []) {
    const opponent = String(row.opponent_name ?? "").trim()
    if (!opponent) continue
    bouts.push({
      opponent,
      opponentId: (row.opponent_id as string) ?? null,
      won: Boolean(row.win),
      event: (row.event_name as string) ?? null,
      date: (row.event_date as string) ?? null,
      method: (row.win_type as string) ?? null,
      score: (row.score as string) ?? null,
    })
  }
  /*
   * Season matches carry no opponent id, so they match by name. That is weaker, and it is how
   * most common opponents are found — a wrestler both faced at a mid-season invitational will
   * never have a profile here.
   */
  let wins = 0
  let losses = 0
  for (const row of seasons.data ?? []) {
    wins += Number(row.wins ?? 0)
    losses += Number(row.losses ?? 0)
    for (const raw of (Array.isArray(row.matches) ? row.matches : []) as Array<Record<string, unknown>>) {
      const opponent = String(raw.opponent ?? "").trim()
      if (!opponent) continue
      bouts.push({
        opponent,
        won: String(raw.win_loss ?? "").toUpperCase() === "W",
        event: (raw.venue as string) ?? null,
        date: (raw.date as string) ?? null,
        method: (raw.result as string) ?? null,
      })
    }
  }

  const statePlacements = (state.data ?? [])
    .filter((r) => Number(r.place) >= 1)
    .sort((a, b) => Number(b.year) - Number(a.year))
    .map((r) => `${r.year} ${r.classification} ${r.weight_class} — ${ordinal(Number(r.place))}`)

  const nationalResults = (other.data ?? [])
    .sort((a, b) => Number(b.year) - Number(a.year))
    .map((r) => {
      const place = Number(r.placement)
      const bits = [
        Number.isFinite(place) && place >= 1 ? ordinal(place) : null,
        String(r.record ?? "").trim() || null,
      ].filter(Boolean)
      return `${r.year} ${r.event_short_name}${r.weight_class ? ` (${r.weight_class})` : ""}${bits.length ? ` — ${bits.join(", ")}` : ""}`
    })

  return {
    id: String(athlete.id),
    name: String(athlete.name),
    school: (athlete.highschool as string) ?? null,
    graduationYear: athlete.graduationyear == null ? null : Number(athlete.graduationyear),
    weight: (athlete.weightclass as string) ?? null,
    rank: athlete.prospect_ranking == null ? null : Number(athlete.prospect_ranking),
    record: wins + losses > 0 ? `${wins}-${losses}` : null,
    statePlacements,
    nationalResults,
    matchCount: bouts.length,
    bouts,
  }
}
