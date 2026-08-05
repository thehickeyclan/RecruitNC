import type { SupabaseClient } from "@supabase/supabase-js"
import {
  getFargoForAthlete,
  getNHSCAForAthlete,
  getSuper32ForAthlete,
  type TournamentResultForDisplay,
} from "@/lib/public-profile-data"

/**
 * Club honours, taken from result tables rather than anything a user typed.
 *
 * The first version of this read `athletes.achievements` — free text written by the
 * athletes themselves. That produced honours nobody earned: "Win over state champion
 * Matthew Akins" became a state champion, freestyle titles were listed as NCHSAA ones, and
 * a wrestler who lost the state final was credited with winning it. It also missed real
 * results entirely, because a wrestler who never filled the box in looked like they had
 * done nothing — Jake Amiott is a 2026 Fargo All-American with an empty achievements field.
 *
 * Everything here comes from the same loaders the athlete profiles use, so a club page and
 * a profile can never disagree:
 *   NCHSAA   wrestling_nchsaa_results  (10,450 rows)
 *   NHSCA    nhsca_placements          (1,497)
 *   Super 32 super32_results           (835)
 *   Fargo    fargo_results             (192)
 */

export type ClubTournamentHonour = {
  athleteName: string
  /** "2026", or "2024, 2026" when the same wrestler placed more than once. */
  detail: string
}

export type ClubTournamentHonours = {
  nchsaaChampions: ClubTournamentHonour[]
  nchsaaPlacers: ClubTournamentHonour[]
  nhscaAllAmericans: ClubTournamentHonour[]
  super32Placers: ClubTournamentHonour[]
  fargoAllAmericans: ClubTournamentHonour[]
}

/** NHSCA, Super 32 and Fargo all place the top eight. */
const PODIUM = 8

function placementNumber(value: unknown): number | null {
  const digits = String(value ?? "").replace(/[^\d]/g, "")
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

function podiumYears(rows: TournamentResultForDisplay[]): string[] {
  return rows
    .filter((row) => {
      const place = placementNumber(row.placement)
      return place != null && place <= PODIUM
    })
    .map((row) => `${row.year} (${placementNumber(row.placement)})`)
}

/** Athlete name for display, matching how profiles resolve it. */
function athleteName(athlete: Record<string, any>): string {
  const composed = [athlete.firstName, athlete.lastName].filter(Boolean).join(" ").trim()
  return String(athlete.name ?? "").trim() || composed || "RecruitNC athlete"
}

export async function loadClubTournamentHonours(
  supabase: SupabaseClient,
  athletes: Array<Record<string, any>>,
): Promise<ClubTournamentHonours> {
  const nchsaaChampions: ClubTournamentHonour[] = []
  const nchsaaPlacers: ClubTournamentHonour[] = []
  const nhscaAllAmericans: ClubTournamentHonour[] = []
  const super32Placers: ClubTournamentHonour[] = []
  const fargoAllAmericans: ClubTournamentHonour[] = []

  // NCHSAA is one table lookup for the whole club rather than one per wrestler.
  const names = athletes.map(athleteName).filter(Boolean)
  const nchsaaByName = new Map<string, Array<{ year: number; place: number; classification: string; weight: string }>>()

  if (names.length) {
    const { data: nchsaaRows } = await supabase
      .from("wrestling_nchsaa_results")
      .select("year,place,classification,weight_class,wrestler_name")
      .in("wrestler_name", names)

    for (const row of nchsaaRows ?? []) {
      const r = row as Record<string, any>
      const place = placementNumber(r.place)
      if (place == null) continue
      const key = String(r.wrestler_name ?? "").trim().toLowerCase()
      nchsaaByName.set(key, [
        ...(nchsaaByName.get(key) ?? []),
        { year: Number(r.year), place, classification: String(r.classification ?? ""), weight: String(r.weight_class ?? "") },
      ])
    }
  }

  for (const athlete of athletes) {
    const name = athleteName(athlete)

    const nchsaa = (nchsaaByName.get(name.toLowerCase()) ?? []).sort((a, b) => a.year - b.year)
    const titles = nchsaa.filter((r) => r.place === 1)
    // A title is the stronger claim, so a champion is not also listed as a placer.
    const placings = nchsaa.filter((r) => r.place > 1 && r.place <= PODIUM)

    if (titles.length) {
      nchsaaChampions.push({
        athleteName: name,
        detail: titles.map((r) => `${r.year} ${r.classification} ${r.weight}`.replace(/\s+/g, " ").trim()).join(", "),
      })
    } else if (placings.length) {
      nchsaaPlacers.push({
        athleteName: name,
        detail: placings.map((r) => `${r.year} ${r.classification} ${r.weight} (${r.place})`.replace(/\s+/g, " ").trim()).join(", "),
      })
    }

    // These three each need the athlete's own name variants and school, so they go per
    // wrestler through the profile loaders.
    const [nhsca, super32, fargo] = await Promise.all([
      getNHSCAForAthlete(supabase, athlete).catch(() => [] as TournamentResultForDisplay[]),
      getSuper32ForAthlete(supabase, athlete).catch(() => [] as TournamentResultForDisplay[]),
      getFargoForAthlete(supabase, athlete).catch(() => [] as TournamentResultForDisplay[]),
    ])

    const nhscaYears = podiumYears(nhsca)
    if (nhscaYears.length) nhscaAllAmericans.push({ athleteName: name, detail: nhscaYears.join(", ") })

    const super32Years = podiumYears(super32)
    if (super32Years.length) super32Placers.push({ athleteName: name, detail: super32Years.join(", ") })

    const fargoYears = podiumYears(fargo)
    if (fargoYears.length) fargoAllAmericans.push({ athleteName: name, detail: fargoYears.join(", ") })
  }

  const byName = (a: ClubTournamentHonour, b: ClubTournamentHonour) => a.athleteName.localeCompare(b.athleteName)
  return {
    nchsaaChampions: nchsaaChampions.sort(byName),
    nchsaaPlacers: nchsaaPlacers.sort(byName),
    nhscaAllAmericans: nhscaAllAmericans.sort(byName),
    super32Placers: super32Placers.sort(byName),
    fargoAllAmericans: fargoAllAmericans.sort(byName),
  }
}
