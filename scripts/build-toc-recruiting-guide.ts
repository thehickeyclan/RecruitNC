/**
 * Builds the printed recruiting guide's payload once, to a committed JSON file.
 *
 * The route used to assemble this per request: eighty wrestlers, each needing a tournament bundle
 * and their qualifier bouts, which is four hundred-odd queries. Fired all at once it saturated the
 * database and the function was killed; run serially it takes ninety-five seconds, which no
 * serverless function will sit through. Batching made it worse — 163 seconds and six silent
 * failures — because the contention is on the database, not in the client's await loop.
 *
 * So it is built here instead. The guide is a book: the field is locked, the results are history,
 * and a snapshot is the honest shape for it. Re-run this whenever schedules change:
 *
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/build-toc-recruiting-guide.ts
 *
 * Serial on purpose. It is slower per wrestler than firing everything at once and it is the only
 * version that finishes without dropping anybody.
 */

import { writeFile } from "node:fs/promises"

import { createClient } from "@supabase/supabase-js"

import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { loadOpponentIndex } from "@/lib/scouting-report"
import { findSignificantWins, type Bout } from "@/lib/significant-wins"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import { getCuratedSignificantWins } from "@/lib/curated-significant-wins"
import { getUpNextEvents } from "@/lib/toc/recruiting-guide-up-next"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import type { TocBracketDraw } from "@/lib/toc/bracket-types"
import {
  formatWin,
  honourPills,
  nchsaaPhrase,
  topSignificantWins,
  tournamentPhrase,
  type NchsaaRow,
  type TournamentRow,
} from "@/lib/toc/recruiting-guide-format"

const OUT = "lib/toc/recruiting-guide-data.json"
const CONTACT_CLASSES = [2027, 2028]
const MAX_WINS = 2

function latestSeasonBouts(rows: { season?: string | null; matches?: unknown }[]): Bout[] {
  if (rows.length === 0) return []
  const sorted = [...rows].sort((a, b) => String(b.season ?? "").localeCompare(String(a.season ?? "")))
  try {
    const raw = sorted[0]?.matches
    const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw ?? "[]"))
    return Array.isArray(parsed) ? (parsed as Bout[]) : []
  } catch {
    return []
  }
}

void (async () => {
  const started = Date.now()
  const admin = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: invitations }, { data: draws }] = await Promise.all([
    admin.from("toc_invitations").select("athlete_id, weight_class, seed").eq("status", "confirmed"),
    admin.from("toc_bracket_draws").select("weight_class, draw"),
  ])
  const invites = invitations ?? []
  const athleteIds = invites.map((row) => row.athlete_id)

  const [{ data: athleteRows }, { data: matchRows }, opponentIndex] = await Promise.all([
    admin.from("athletes").select("*").in("id", athleteIds),
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

  const found: Record<string, unknown>[] = []
  let failures = 0

  for (const invite of invites) {
    const athlete = athleteById.get(String(invite.athlete_id))
    if (!athlete) continue

    /*
     * A failure here is loud, not swallowed.
     *
     * The batched attempt caught six errors into empty arrays, which would have printed wrestlers
     * with no credentials in a book that looked finished. If this cannot read somebody's results,
     * the build says so and the file is not written.
     */
    let bundle
    let qualifierBouts: Bout[] = []
    try {
      bundle = await loadAthleteTournamentBundle(admin, athlete)
      qualifierBouts = await getQualifierSignificantWinBouts(admin, String(athlete.id), "wins")
    } catch (error) {
      failures++
      console.error(`  FAILED ${String(athlete.name)}: ${(error as Error).message}`)
      continue
    }

    const nchsaa = (bundle.nchsaa ?? []) as unknown as NchsaaRow[]
    const nationals = [
      { label: "NHSCA", rows: (bundle.nhsca ?? []) as unknown as TournamentRow[] },
      { label: "Fargo", rows: (bundle.fargo ?? []) as unknown as TournamentRow[] },
      { label: "Super 32", rows: (bundle.super32 ?? []) as unknown as TournamentRow[] },
    ]

    const gradYear = athlete.graduationyear == null ? null : Number(athlete.graduationyear)
    const printsContact = gradYear != null && CONTACT_CLASSES.includes(gradYear)
    const bouts = [...latestSeasonBouts(matchesByAthlete.get(String(invite.athlete_id)) ?? []), ...qualifierBouts]
    const curated = getCuratedSignificantWins(String(athlete.id)).map((win) => `${win.opponent} (${win.credential})`)
    const college = String(athlete.college ?? "").trim()

    found.push({
      athleteId: String(athlete.id),
      weightClass: Number(invite.weight_class),
      seed: invite.seed == null ? null : Number(invite.seed),
      name: String(athlete.name ?? "").trim() || "Unknown",
      gradYear,
      highSchool: String(athlete.highschool ?? "").trim() || null,
      club: String(athlete.wrestlingClub ?? "").trim() || "Unaffiliated",
      committedTo: college && !["Uncommitted", "TBD", "Undecided"].includes(college) ? college : null,
      pills: honourPills(nchsaa, nationals),
      credentials: [
        nchsaaPhrase(nchsaa),
        ...nationals.map((national) => tournamentPhrase(national.label, national.rows)),
      ].filter(Boolean),
      wins: [
        ...topSignificantWins(findSignificantWins(bouts, opponentIndex), MAX_WINS).map(formatWin),
        ...curated,
      ].slice(0, MAX_WINS),
      upNext: getUpNextEvents(String(athlete.id)),
      gpa: athlete.academic_gpa == null ? null : String(athlete.academic_gpa),
      email: printsContact ? String(athlete.contactEmail ?? "").trim() || null : null,
      phone: printsContact ? String(athlete.phone ?? "").trim() || null : null,
    })
    process.stdout.write(".")
  }
  console.log("")

  if (failures > 0) {
    console.error(`\n${failures} wrestler(s) failed to build. Not writing ${OUT}.`)
    process.exit(1)
  }
  if (found.length !== invites.length) {
    console.error(`\nBuilt ${found.length} of ${invites.length}. Not writing ${OUT}.`)
    process.exit(1)
  }

  const drawByWeight = new Map((draws ?? []).map((row) => [Number(row.weight_class), row.draw as TocBracketDraw]))
  const weights = [...TOC_WEIGHT_CLASSES].map((weightClass) => {
    const draw = drawByWeight.get(weightClass)
    const byId = new Map((draw?.participants ?? []).map((p) => [p.athleteId, p]))
    const firstRound = (draw?.bouts ?? [])
      .filter((bout) => bout.side === "winners" && /round 1/i.test(bout.roundLabel))
      .sort((a, b) => a.boutNumber - b.boutNumber)
      .map((bout) => {
        const side = (slot: typeof bout.top) => {
          if (slot.kind !== "athlete") return null
          const p = byId.get(slot.athleteId)
          return p ? { seed: p.seed, name: p.name } : null
        }
        return { boutNumber: bout.boutNumber, top: side(bout.top), bottom: side(bout.bottom) }
      })
    return {
      weightClass,
      locked: Boolean(draw),
      firstRound,
      athletes: found
        .filter((entry) => entry.weightClass === weightClass)
        .sort(
          (a, b) =>
            ((a.seed as number) ?? 99) - ((b.seed as number) ?? 99) ||
            String(a.name).localeCompare(String(b.name)),
        ),
    }
  })

  const clubCounts = new Map<string, number>()
  for (const entry of found) clubCounts.set(String(entry.club), (clubCounts.get(String(entry.club)) ?? 0) + 1)

  const payload = {
    ok: true,
    generatedAt: new Date().toISOString(),
    total: found.length,
    weights,
    committed: found
      .filter((entry) => entry.committedTo)
      .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    clubs: [...clubCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    index: found
      .map((entry) => ({ name: entry.name, weightClass: entry.weightClass, seed: entry.seed }))
      .sort((a, b) => {
        const surname = (value: string) => value.trim().split(/\s+/).slice(-1)[0] ?? value
        return surname(String(a.name)).localeCompare(surname(String(b.name)))
      }),
  }

  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`Wrote ${OUT}: ${found.length} wrestlers in ${Math.round((Date.now() - started) / 1000)}s`)
})()
