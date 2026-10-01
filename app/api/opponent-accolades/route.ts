import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { accoladeLine, findSignificantWins } from "@/lib/significant-wins"
import { loadStatePlacerIndex } from "@/lib/state-placers"

/**
 * Accolades for the opponents in a profile's bout tables: "2026 FL 1A State Champion" beside the
 * name, on wins and losses alike - a coach reads a 7-1 loss to a state finalist differently from
 * one to nobody in particular.
 *
 * Same index and the same evidence rules as Significant wins (lib/significant-wins.ts), so a name
 * is never labelled here that would not be credited there. Each bout is judged on its own club or
 * state line: two rows naming the same opponent can differ when only one carries the evidence.
 *
 * Takes the bouts rather than an athlete id because the tables draw from five sources (NCHSAA,
 * NHSCA, Super 32, TOC, other events) and already hold exactly what they show.
 */

export const dynamic = "force-dynamic"

type BoutIn = { name?: unknown; club?: unknown; year?: unknown }

/** The key the client looks a label up by. Kept in step with components/profile/tournament-accordion.tsx. */
function boutKey(name: string, club: string | null, year: number | null) {
  return `${name.trim().toLowerCase()}|${(club ?? "").trim().toLowerCase()}|${year ?? ""}`
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { bouts?: BoutIn[] } | null
  const bouts = (Array.isArray(body?.bouts) ? body!.bouts : []).slice(0, 500)
  if (!bouts.length) return NextResponse.json({ labels: {} })

  const index = {
    tocField: [],
    ranked: [],
    ...(await loadStatePlacerIndex(createAdminClient(), new Date(), { outOfState: true }).catch(() => ({
      statePlacers: [],
      stateSchools: [],
      fargoAllAmericans: [],
    }))),
  }

  const labels: Record<string, string> = {}
  for (const raw of bouts) {
    const name = typeof raw.name === "string" ? raw.name.trim() : ""
    if (!name) continue
    const club = typeof raw.club === "string" ? raw.club : null
    const year = Number.isFinite(Number(raw.year)) ? Number(raw.year) : null
    const key = boutKey(name, club, year)
    if (key in labels) continue
    // Treated as a win only so the finder looks at it; the outcome plays no part in an accolade.
    // Mid-March places a bout in the season of its own year, close enough for the four-season check.
    const [found] = findSignificantWins(
      [{ opponent: name, opponent_school: club, win_loss: "W", date: year ? `${year}-03-01` : null }],
      index,
      { stateOnly: true },
    )
    const line = found ? accoladeLine(found) : null
    if (line) labels[key] = line
  }
  return NextResponse.json({ labels })
}
