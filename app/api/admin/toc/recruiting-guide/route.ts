import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { loadOpponentIndex } from "@/lib/scouting-report"
import { findSignificantWins, type Bout } from "@/lib/significant-wins"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import type { TocBracketDraw } from "@/lib/toc/bracket-types"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import { getCuratedSignificantWins } from "@/lib/curated-significant-wins"
import {
  formatWin,
  honourPills,
  nchsaaPhrase,
  topSignificantWins,
  tournamentPhrase,
  type NchsaaRow,
  type TournamentRow,
} from "@/lib/toc/recruiting-guide-format"

/**
 * The printed recruiting guide handed to college coaches at the Tournament of Champions.
 *
 * Built for paper: roughly twenty pages, one weight class per page, eight wrestlers to a page.
 * That budget is the whole design. A coach turning pages between bouts wants the seed, who the
 * kid is, and the two or three lines that say whether to keep watching — so every result is
 * condensed to a phrase and match data never appears as a table.
 *
 * Contact detail is decided by the wrestler's graduation year, not by the viewer. That is a
 * departure from `/api/athletes/[id]/scouting-report`, which reads the tier off the coach, and
 * it is deliberate: a spiral-bound book cannot check who is holding it, so the youngest
 * wrestlers' numbers are never printed at all. See CONTACT_CLASSES.
 */

export const dynamic = "force-dynamic"

/** Classes whose contact details are printed. Younger wrestlers appear with school and club only. */
const CONTACT_CLASSES = [2027, 2028]

/** At most two, because the line has to fit beside everything else on an eighth of a page. */
const MAX_WINS = 2

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 as const, error: "Sign in." }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin access required." }
  return { ok: true as const }
}


/** The newest season's bouts. Older seasons are dropped rather than merged — see MAX_WINS. */
function latestSeasonBouts(rows: { season?: string | null; matches?: unknown }[]): Bout[] {
  if (rows.length === 0) return []
  const sorted = [...rows].sort((a, b) => String(b.season ?? "").localeCompare(String(a.season ?? "")))
  const raw = sorted[0]?.matches
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw ?? "[]"))
    return Array.isArray(parsed) ? (parsed as Bout[]) : []
  } catch {
    return []
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  try {
    const [{ data: invitations }, { data: draws }] = await Promise.all([
      admin.from("toc_invitations").select("athlete_id, weight_class, seed").eq("status", "confirmed"),
      admin.from("toc_bracket_draws").select("weight_class, draw"),
    ])

    const invites = invitations ?? []
    const athleteIds = invites.map((row) => row.athlete_id)
    if (athleteIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No confirmed wrestlers." }, { status: 404 })
    }

    const [{ data: athleteRows }, { data: matchRows }, opponentIndex] = await Promise.all([
      admin.from("athletes").select("*").in("id", athleteIds),
      // One query for the whole field. Per-athlete would be eighty round trips for a page that
      // exists to be printed once.
      admin.from("matches").select("athlete_id, season, matches").in("athlete_id", athleteIds),
      loadOpponentIndex(admin),
    ])

    const athleteById = new Map((athleteRows ?? []).map((row) => [String(row.id), row as Record<string, unknown>]))
    const matchesByAthlete = new Map<string, { season?: string | null; matches?: unknown }[]>()
    for (const row of matchRows ?? []) {
      const list = matchesByAthlete.get(String(row.athlete_id)) ?? []
      list.push(row)
      matchesByAthlete.set(String(row.athlete_id), list)
    }

    const entries = await Promise.all(
      invites.map(async (invite) => {
        const athlete = athleteById.get(String(invite.athlete_id))
        if (!athlete) return null

        const bundle = await loadAthleteTournamentBundle(admin, athlete)
        const gradYear = athlete.graduationyear == null ? null : Number(athlete.graduationyear)
        const printsContact = gradYear != null && CONTACT_CLASSES.includes(gradYear)

        const nchsaa = (bundle.nchsaa ?? []) as unknown as NchsaaRow[]
        /*
         * Fargo counts, and leaving it out was a hole.
         *
         * A quarter of this field wrestles it, and for some of them the Fargo All-American is the
         * best credential they own — Devin Hord's only result of any kind is 5th at 16U freestyle.
         */
        const nationals = [
          { label: "NHSCA", rows: (bundle.nhsca ?? []) as unknown as TournamentRow[] },
          { label: "Fargo", rows: (bundle.fargo ?? []) as unknown as TournamentRow[] },
          { label: "Super 32", rows: (bundle.super32 ?? []) as unknown as TournamentRow[] },
        ]

        const credentials = [
          nchsaaPhrase(nchsaa),
          ...nationals.map((national) => tournamentPhrase(national.label, national.rows)),
        ].filter((line): line is string => Boolean(line))

        const pills = honourPills(nchsaa, nationals)

        /*
         * Wins come from everywhere the profile looks, not just the high-school season.
         *
         * The season table holds duals and tournaments; the qualifier bouts hold Super 32 Early
         * Entry and the like, which is where several of these wrestlers met somebody worth naming.
         * Curated wins are hand-entered where our import has no bout at all.
         */
        const [qualifierBouts] = await Promise.all([
          getQualifierSignificantWinBouts(admin, String(athlete.id), "wins").catch(() => [] as Bout[]),
        ])
        const bouts = [...latestSeasonBouts(matchesByAthlete.get(String(invite.athlete_id)) ?? []), ...qualifierBouts]

        const curated = getCuratedSignificantWins(String(athlete.id)).map(
          (win) => `${win.opponent} (${win.credential})`,
        )
        const wins = [
          ...topSignificantWins(findSignificantWins(bouts, opponentIndex), MAX_WINS).map(formatWin),
          ...curated,
        ].slice(0, MAX_WINS)

        const college = String(athlete.college ?? "").trim()
        const committedTo = college && !["Uncommitted", "TBD", "Undecided"].includes(college) ? college : null

        return {
          athleteId: String(athlete.id),
          weightClass: Number(invite.weight_class),
          seed: invite.seed == null ? null : Number(invite.seed),
          name: String(athlete.name ?? "").trim() || "Unknown",
          gradYear,
          highSchool: String(athlete.highschool ?? "").trim() || null,
          // Never blank on the page: an empty club line reads as a mistake, and thirteen of the
          // field genuinely have none on file.
          club: String(athlete.wrestlingClub ?? "").trim() || "Unaffiliated",
          committedTo,
          pills,
          credentials,
          wins,
          gpa: athlete.academic_gpa == null ? null : String(athlete.academic_gpa),
          email: printsContact ? String(athlete.contactEmail ?? "").trim() || null : null,
          phone: printsContact ? String(athlete.phone ?? "").trim() || null : null,
        }
      }),
    )

    const found = entries.filter((entry): entry is NonNullable<typeof entry> => entry != null)

    // The bracket thumbnail: first-round pairings only. Later rounds print as blank lines for a
    // coach to fill in, which is what the page is for — the consolation side does not shrink to
    // this size legibly and is left to the app.
    const drawByWeight = new Map((draws ?? []).map((row) => [Number(row.weight_class), row.draw as TocBracketDraw]))
    const weights = [...TOC_WEIGHT_CLASSES].map((weightClass) => {
      const draw = drawByWeight.get(weightClass)
      const nameBySeed = new Map((draw?.participants ?? []).map((p) => [p.athleteId, p]))
      const firstRound = (draw?.bouts ?? [])
        .filter((bout) => bout.side === "winners" && /round 1/i.test(bout.roundLabel))
        .sort((a, b) => a.boutNumber - b.boutNumber)
        .map((bout) => {
          const side = (slot: typeof bout.top) => {
            if (slot.kind !== "athlete") return null
            const participant = nameBySeed.get(slot.athleteId)
            return participant ? { seed: participant.seed, name: participant.name } : null
          }
          return { boutNumber: bout.boutNumber, top: side(bout.top), bottom: side(bout.bottom) }
        })

      return {
        weightClass,
        locked: Boolean(draw),
        firstRound,
        athletes: found
          .filter((entry) => entry.weightClass === weightClass)
          .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99) || a.name.localeCompare(b.name)),
      }
    })

    const clubCounts = new Map<string, number>()
    for (const entry of found) clubCounts.set(entry.club, (clubCounts.get(entry.club) ?? 0) + 1)

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      total: found.length,
      weights,
      committed: found
        .filter((entry) => entry.committedTo)
        .sort((a, b) => a.name.localeCompare(b.name)),
      clubs: [...clubCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      index: found
        .map((entry) => ({ name: entry.name, weightClass: entry.weightClass, seed: entry.seed }))
        .sort((a, b) => {
          const surname = (value: string) => value.trim().split(/\s+/).slice(-1)[0] ?? value
          return surname(a.name).localeCompare(surname(b.name)) || a.name.localeCompare(b.name)
        }),
    })
  } catch (error) {
    console.error("[toc recruiting guide]", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not build the guide." },
      { status: 500 },
    )
  }
}
