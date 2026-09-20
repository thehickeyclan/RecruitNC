/**
 * Puts the Tournament of Champions into the same two tables every other event lives in, so a
 * profile shows TOC through the same path as Super 32 Early Entry rather than a bespoke section.
 *
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/import-toc-to-tournament-results.ts <csv> [--apply]
 *
 * Source is the scoring table's export, not our own bout results: it carries the fall and tech
 * times ("10-4 5:32") that `toc_bout_results` has nowhere to store.
 *
 * Wrestlers are linked by athlete id, taken from the TOC field rather than matched on name, so a
 * profile's results are the same rows the bracket was built from. Opponents link the same way,
 * which makes every TOC bout a documented head-to-head on both profiles.
 *
 * Dry run by default. Nothing is written without --apply.
 */
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

const EVENT = {
  key: "toc-2026",
  name: "NC United Tournament of Champions",
  shortName: "Tournament of Champions",
  state: "NC",
  date: "2026-09-18",
  year: 2026,
}

const file = process.argv[2]
const apply = process.argv.includes("--apply")
if (!file) throw new Error("usage: <csv> [--apply]")

function cells(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === "," && !quoted) {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.replace(/^=/, "").trim())
}

const key = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "")

/** The order bouts actually happened in, so a profile reads down the tournament. */
const ROUND_ORDER: Record<string, number> = {
  "quarter-finals": 1,
  "consi of 4": 2,
  "semi-finals": 3,
  "consi-semis": 4,
  "3rd place": 5,
  finals: 6,
}

void (async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const lines = readFileSync(file, "utf8").trim().split(/\r?\n/)
  const header = cells(lines[0])
  const col = (n: string) => header.indexOf(n)
  const [iW, iR, iWin, iWinTeam, iRes, iType, iLose, iLoseTeam] = [
    "Weight", "Round", "Winning Wrestler", "Winning Team", "Result", "Win Type", "Losing Wrestler", "Losing Team",
  ].map(col)

  const rows = lines.slice(1).map((line) => {
    const c = cells(line)
    return {
      weight: Number(c[iW]),
      round: c[iR],
      winner: c[iWin],
      winnerClub: c[iWinTeam],
      loser: c[iLose],
      loserClub: c[iLoseTeam],
      result: c[iRes],
      winType: c[iType].toUpperCase(),
    }
  }).filter((r) => TOC_WEIGHT_CLASSES.includes(r.weight as never) && r.winType !== "BYE")

  // The field, by id: name, club and school come from the athlete record, not the export.
  const { data: invites } = await admin
    .from("toc_invitations")
    .select('athlete_id, weight_class, athletes(id, name, "wrestlingClub", highschool, gender)')
    .eq("status", "confirmed")
  const field = (invites ?? []).map((row: any) => ({
    athleteId: String(row.athlete_id),
    weight: Number(row.weight_class),
    name: String(row.athletes?.name ?? ""),
    club: row.athletes?.wrestlingClub ?? null,
    highSchool: row.athletes?.highschool ?? null,
    gender: row.athletes?.gender ?? null,
  }))
  const byName = new Map(field.map((a) => [key(a.name), a]))
  const entrantsByWeight = new Map<number, number>()
  for (const a of field) entrantsByWeight.set(a.weight, (entrantsByWeight.get(a.weight) ?? 0) + 1)

  type Tally = { wins: number; losses: number; placement: number | null }
  const tally = new Map<string, Tally>()
  const boutRows: Record<string, unknown>[] = []
  const unmatched: string[] = []

  for (const row of rows) {
    const winner = byName.get(key(row.winner))
    const loser = byName.get(key(row.loser))
    if (!winner || !loser) {
      unmatched.push(`${row.weight} ${row.round}: ${row.winner} over ${row.loser}`)
      continue
    }
    const order = ROUND_ORDER[row.round.toLowerCase()] ?? 9

    for (const [athlete, opponent, won] of [
      [winner, loser, true],
      [loser, winner, false],
    ] as const) {
      const t = tally.get(athlete.athleteId) ?? { wins: 0, losses: 0, placement: null }
      if (won) t.wins++
      else t.losses++
      tally.set(athlete.athleteId, t)

      boutRows.push({
        event_key: EVENT.key,
        event_name: EVENT.name,
        year: EVENT.year,
        event_date: EVENT.date,
        weight_class: String(row.weight),
        round: row.round,
        source_round: row.round,
        bout_order: order,
        athlete_name: athlete.name,
        athlete_id: athlete.athleteId,
        athlete_club: athlete.club,
        opponent_name: opponent.name,
        opponent_id: opponent.athleteId,
        opponent_club: opponent.club,
        win: won,
        is_bye: false,
        win_type: row.winType,
        score: row.result,
        source_file: file.split("/").pop() ?? null,
      })
    }

    // Placement comes from the two bouts that decide it, never from a win count.
    const place = (id: string, n: number) => {
      const t = tally.get(id) ?? { wins: 0, losses: 0, placement: null }
      t.placement = n
      tally.set(id, t)
    }
    // Matched exactly: "Quarter-Finals" contains "finals", and a loose test made every
    // quarter-finalist a champion.
    const round = row.round.trim().toLowerCase()
    if (round === "finals") {
      place(winner.athleteId, 1)
      place(loser.athleteId, 2)
    }
    if (round === "3rd place") {
      place(winner.athleteId, 3)
      place(loser.athleteId, 4)
    }
  }

  const resultRows = field
    .filter((a) => tally.has(a.athleteId))
    .map((a) => {
      const t = tally.get(a.athleteId)!
      return {
        event_key: EVENT.key,
        event_name: EVENT.name,
        event_short_name: EVENT.shortName,
        event_state: EVENT.state,
        event_date: EVENT.date,
        year: EVENT.year,
        athlete_name: a.name,
        athlete_id: a.athleteId,
        club: a.club,
        high_school: a.highSchool,
        state: "NC",
        gender: a.gender ?? "M",
        weight_class: String(a.weight),
        wins: t.wins,
        losses: t.losses,
        byes: 0,
        record: `${t.wins}-${t.losses}`,
        placement: t.placement,
        // Placing at TOC earns nothing at Super 32; that flag belongs to the qualifiers.
        qualified: false,
        entrants: entrantsByWeight.get(a.weight) ?? null,
        source_file: file.split("/").pop() ?? null,
        verification_status: "verified",
      }
    })

  console.log(`${boutRows.length} bout rows (${boutRows.length / 2} bouts) · ${resultRows.length} wrestler results`)
  console.log("placers:", resultRows.filter((r) => r.placement).sort((a, b) => Number(a.weight_class) - Number(b.weight_class) || (a.placement ?? 9) - (b.placement ?? 9)).map((r) => `${r.weight_class} ${r.placement}. ${r.athlete_name} (${r.record})`).join(" | "))
  if (unmatched.length) console.log(`UNMATCHED (${unmatched.length}):\n  ${unmatched.join("\n  ")}`)
  if (!apply) {
    console.log("dry run — nothing written. Re-run with --apply.")
    return
  }

  // Re-runnable: clear this event first, so a corrected export replaces rather than duplicates.
  for (const table of ["other_tournament_bouts", "other_tournament_results"]) {
    const { error } = await admin.from(table).delete().eq("event_key", EVENT.key)
    if (error) throw new Error(`clear ${table}: ${error.message}`)
  }
  for (let i = 0; i < boutRows.length; i += 200) {
    const { error } = await admin.from("other_tournament_bouts").insert(boutRows.slice(i, i + 200))
    if (error) throw new Error(`bouts: ${error.message}`)
  }
  const { error: resErr } = await admin.from("other_tournament_results").insert(resultRows)
  if (resErr) throw new Error(`results: ${resErr.message}`)
  console.log(`wrote ${boutRows.length} bouts and ${resultRows.length} results`)
})()
