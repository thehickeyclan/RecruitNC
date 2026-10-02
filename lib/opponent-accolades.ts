import type { SupabaseClient } from "@supabase/supabase-js"
import { accoladeLineWithRank, findSignificantWins } from "@/lib/significant-wins"
import { loadStatePlacerIndex } from "@/lib/state-placers"

/**
 * Accolades for opponents in a bout list: "2026 FL 1A State Champion" beside the name, on wins and
 * losses alike. Same index and evidence rules as Significant wins (lib/significant-wins.ts), so a
 * name is never labelled here that would not be credited there. Each bout is judged on its own club
 * or state line: two rows naming the same opponent can differ when only one carries the evidence.
 *
 * Shared by the web's bout tables (/api/opponent-accolades) and the phone's profile endpoint.
 */

export type AccoladeBout = { name: string; club: string | null; year: number | null; weight: string | number | null }

/** The key a label is looked up by. Kept in step with components/profile/tournament-accordion.tsx. */
export function accoladeKey(name: string, club: string | null, year: number | null) {
  return `${name.trim().toLowerCase()}|${(club ?? "").trim().toLowerCase()}|${year ?? ""}`
}

export async function labelOpponents(admin: SupabaseClient, bouts: AccoladeBout[]): Promise<Record<string, string>> {
  if (!bouts.length) return {}
  const index = {
    tocField: [],
    ranked: [],
    // National rankings ride along with outOfState, each checked against the bout's evidence.
    ...(await loadStatePlacerIndex(admin, new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    }))),
  }
  const labels: Record<string, string> = {}
  for (const bout of bouts) {
    const name = bout.name.trim()
    if (!name) continue
    const key = accoladeKey(name, bout.club, bout.year)
    if (key in labels) continue
    // Treated as a win only so the finder looks at it; the outcome plays no part in an accolade.
    // Mid-March places a bout in the season of its own year, close enough for the four-season check.
    const [found] = findSignificantWins(
      [{ opponent: name, opponent_school: bout.club, win_loss: "W", date: bout.year ? `${bout.year}-03-01` : null, weight: bout.weight }],
      index,
    )
    const line = found ? accoladeLineWithRank(found) : null
    if (line) labels[key] = line
  }
  return labels
}
