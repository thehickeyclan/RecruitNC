/**
 * Import a bracket bout CSV into `other_tournament_results` + `other_tournament_bouts`.
 *
 * Built for the Super 32 Early Entry / qualifier series (NC, GA, VA, ...). Early Entry is a
 * SEPARATE tournament from Super 32 — nothing here touches `super32_results`.
 *
 *   npx tsx scripts/import-other-tournament-csv.ts \
 *     --file scripts/data/nc-super32-early-entry-2026.csv \
 *     --event-key super32-early-entry-nc-2026 \
 *     --event-name "NC Super 32 Early Entry" \
 *     --short-name "Super 32 Early Entry" \
 *     --event-state NC --event-date 2026-09-05 --gender M \
 *     [--dry-run] [--report path.json]
 *
 * Re-running is safe: rows for the event key are replaced, so a corrected CSV can just be
 * re-imported.
 */

import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"
import {
  applyClubCorrections,
  buildAthleteIndex,
  matchAthlete,
  parseTournament,
  tidy,
  type MatchableAthlete,
  type SourceBoutRow,
} from "../lib/other-tournament-import"

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const eq = line.indexOf("=")
      if (eq < 1 || line.trimStart().startsWith("#")) continue
      const key = line.slice(0, eq).trim()
      if (process.env[key]) continue
      process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    }
  }
}

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]!
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required --${name}`)
}

const DRY_RUN = process.argv.includes("--dry-run")

/**
 * Trackwrestling exports wrap every cell as `="value"` so spreadsheets keep the leading
 * zeros. Strip that, then parse as ordinary CSV.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (char !== "\r") {
      cell += char
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

function unwrap(cell: string): string {
  return tidy(cell.replace(/^=/, "").replace(/^"|"$/g, ""))
}

function toSourceRows(csvPath: string): SourceBoutRow[] {
  const grid = parseCsv(fs.readFileSync(csvPath, "utf8"))
  const header = (grid.shift() ?? []).map(unwrap)
  const at = (row: string[], column: string) => {
    const index = header.findIndex((h) => h.toLowerCase() === column.toLowerCase())
    return index >= 0 ? unwrap(row[index] ?? "") : ""
  }
  return grid.map((row) => ({
    date: at(row, "Date"),
    weight: at(row, "Weight"),
    round: at(row, "Round"),
    winningWrestler: at(row, "Winning Wrestler"),
    winningTeam: at(row, "Winning Team"),
    result: at(row, "Result"),
    winType: at(row, "Win Type"),
    losingWrestler: at(row, "Losing Wrestler"),
    losingTeam: at(row, "Losing Team"),
    city: at(row, "City"),
    state: at(row, "State"),
    event: at(row, "Event"),
  }))
}

async function main() {
  loadEnv()

  const file = arg("file")
  const eventKey = arg("event-key")
  const eventName = arg("event-name")
  const shortName = arg("short-name", eventName)
  const eventState = arg("event-state", "")
  const eventDate = arg("event-date", "")
  const gender = arg("gender", "M")
  const reportPath = process.argv.includes("--report") ? arg("report") : ""

  const sourceRows = applyClubCorrections(toSourceRows(file), eventKey)
  const year = Number(arg("year", String(new Date(eventDate || sourceRows[0]?.date || "").getFullYear())))
  if (!Number.isFinite(year)) throw new Error("Could not determine event year — pass --year")

  const parsed = parseTournament(sourceRows)
  console.log(`Parsed ${sourceRows.length} bout rows → ${parsed.athletes.length} athletes, ${parsed.bouts.length} bout sides`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: roster, error: rosterError } = await supabase
    .from("athletes")
    .select('id, name, wrestling_name, highschool, "wrestlingClub", graduationyear')
  if (rosterError) throw new Error(`Loading athletes: ${rosterError.message}`)
  const index = buildAthleteIndex((roster ?? []) as MatchableAthlete[])

  // Resolve every entrant once; bouts reuse the same decision so an athlete's own row and
  // their opponents' rows always point at the same profile.
  const resolved = new Map<string, { id: string | null; highSchool: string | null; name: string }>()
  const ambiguous: Array<{ entrant: string; club: string; candidates: string[] }> = []
  const matchedNames: Array<{ entrant: string; club: string; profile: string; tier: string }> = []

  for (const athlete of parsed.athletes) {
    const key = `${athlete.athleteName.toLowerCase()}|${athlete.club.toLowerCase()}`
    const outcome = matchAthlete(athlete.athleteName, athlete.club, index)
    if (outcome.status === "matched") {
      resolved.set(key, {
        id: outcome.athlete.id,
        highSchool: outcome.athlete.highschool ?? null,
        name: outcome.athlete.name ?? athlete.athleteName,
      })
      matchedNames.push({
        entrant: athlete.athleteName,
        club: athlete.club,
        profile: `${outcome.athlete.name} (${outcome.athlete.highschool ?? "no school"}, ${outcome.athlete.graduationyear ?? "?"})`,
        tier: outcome.tier,
      })
    } else if (outcome.status === "ambiguous") {
      resolved.set(key, { id: null, highSchool: null, name: athlete.athleteName })
      ambiguous.push({
        entrant: athlete.athleteName,
        club: athlete.club,
        candidates: outcome.candidates.map((c) => `${c.name} / ${c.highschool ?? "?"} / ${c.graduationyear ?? "?"}`),
      })
    } else {
      resolved.set(key, { id: null, highSchool: null, name: athlete.athleteName })
    }
  }

  const lookup = (name: string, club: string) => resolved.get(`${name.toLowerCase()}|${club.toLowerCase()}`)

  console.log(`Matched ${matchedNames.length} of ${parsed.athletes.length} entrants to profiles`)
  console.log(`  ambiguous (left unlinked): ${ambiguous.length}`)
  for (const row of ambiguous) console.log(`    ? ${row.entrant} [${row.club}] → ${row.candidates.join(" | ")}`)
  for (const row of matchedNames) console.log(`    ✓ ${row.entrant} [${row.club}] → ${row.profile} (${row.tier})`)

  const resultRows = parsed.athletes.map((athlete) => {
    const match = lookup(athlete.athleteName, athlete.club)
    return {
      event_key: eventKey,
      event_name: eventName,
      event_short_name: shortName,
      event_state: eventState || null,
      event_date: eventDate || null,
      year,
      athlete_name: athlete.athleteName,
      athlete_id: match?.id ?? null,
      club: athlete.club,
      // Only ever the school from our own athletes table — never the source's team or city.
      high_school: match?.highSchool ?? null,
      gender,
      weight_class: athlete.weightClass,
      wins: athlete.wins,
      losses: athlete.losses,
      byes: athlete.byes,
      record: athlete.record,
      placement: athlete.placement,
      qualified: athlete.qualified,
      entrants: athlete.entrants || parsed.entrantsByWeight[athlete.weightClass] || null,
      source_file: path.basename(file),
    }
  })

  const boutRows = parsed.bouts.map((bout) => {
    const self = lookup(bout.athleteName, bout.athleteClub)
    const opponent = bout.opponentName ? lookup(bout.opponentName, bout.opponentClub ?? "") : undefined
    return {
      event_key: eventKey,
      event_name: eventName,
      event_date: eventDate || null,
      year,
      weight_class: bout.weightClass,
      round: bout.round,
      source_round: bout.sourceRound,
      bout_order: bout.boutOrder,
      athlete_name: bout.athleteName,
      athlete_id: self?.id ?? null,
      athlete_club: bout.athleteClub,
      opponent_name: bout.opponentName,
      opponent_id: opponent?.id ?? null,
      opponent_club: bout.opponentClub,
      win: bout.win,
      is_bye: bout.isBye,
      win_type: bout.winType,
      score: bout.score,
      source_file: path.basename(file),
    }
  })

  if (reportPath) {
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ eventKey, matched: matchedNames, ambiguous, results: resultRows }, null, 2),
    )
    console.log(`Report written to ${reportPath}`)
  }

  if (DRY_RUN) {
    console.log(`\nDRY RUN — would write ${resultRows.length} results and ${boutRows.length} bout rows.`)
    return
  }

  for (const table of ["other_tournament_bouts", "other_tournament_results"]) {
    const { error } = await supabase.from(table).delete().eq("event_key", eventKey)
    if (error) throw new Error(`Clearing ${table}: ${error.message}`)
  }

  const insert = async (table: string, rows: unknown[]) => {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).insert(rows.slice(i, i + 500))
      if (error) throw new Error(`Inserting into ${table}: ${error.message}`)
    }
  }
  await insert("other_tournament_results", resultRows)
  await insert("other_tournament_bouts", boutRows)

  console.log(`\nWrote ${resultRows.length} results and ${boutRows.length} bout rows for ${eventKey}.`)
  console.log(`Linked to profiles: ${resultRows.filter((r) => r.athlete_id).length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
