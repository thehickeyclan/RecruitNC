/**
 * Import NHSCA High School Nationals bouts for North Carolina wrestlers.
 *
 * The board scored NHSCA on a record and a placement and never knew who anybody beat. That is
 * why Carson Worrick finishing 4th and Tobin McNair 5th in 2026 sat side by side with no sign
 * that one had beaten the other — NHSCA, Super 32 and Fargo had no bout-level data at all, and
 * they are the three events the model weights most heavily.
 *
 * Only North Carolina wrestlers are stored. The export is the whole national field, and nothing
 * about a wrestler from another state belongs in this database.
 *
 * Only the boys' high school bracket. The event runs middle school, elementary and girls'
 * divisions at the same venue, on weights the file does not label — so the filter is the
 * wrestler's own graduation year and gender, not the weight printed on the row.
 *
 * Usage:
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local \
 *     scripts/import-nhsca-nationals-bouts.ts --file <csv> --year 2025 [--apply]
 */
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

const EVENT_NAME_PREFIX = "NHSCA High School Nationals"

/** Excel exports every cell as ="value". */
function parseCells(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1 } else inQuotes = !inQuotes
      continue
    }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue }
    cur += ch
  }
  out.push(cur)
  return out.map((cell) => cell.replace(/^=/, "").replace(/^"|"$/g, "").trim())
}

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]!
  if (fallback != null) return fallback
  throw new Error(`Missing required --${name}`)
}

async function main() {
  const file = path.resolve(arg("file"))
  const year = Number(arg("year"))
  const apply = process.argv.includes("--apply")
  const eventKey = `nhsca-nationals-${year}`

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
  const rows = lines.slice(1).map(parseCells).filter((r) => r.length >= 9)

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  /*
   * A wrestler is in the boys' high school bracket if their class puts them in high school in
   * the event's season. The 2025 event drew classes of 2025 through 2028; a 2029 wrestler was in
   * eighth grade that March.
   */
  const hsClasses = new Set([year, year + 1, year + 2, year + 3])
  const { data: athletes, error } = await client
    .from("athletes")
    .select("id,name,wrestling_name,graduationyear,gender")
    .eq("is_nc_athlete", true)
  if (error) throw new Error(`Loading athletes: ${error.message}`)

  const pool = (athletes ?? [])
    .filter((a) => hsClasses.has(Number(a.graduationyear)))
    .filter((a) => String(a.gender ?? "").toLowerCase().startsWith("m"))
    .map((a) => ({ id: String(a.id), keys: [String(a.name ?? ""), String(a.wrestling_name ?? "")].filter(Boolean) }))

  const resolved = new Map<string, string | null>()
  const resolve = (name: string): string | null => {
    const key = name.trim().toLowerCase()
    if (resolved.has(key)) return resolved.get(key)!
    const hits = pool.filter((a) => a.keys.some((k) => namesLikelySamePerson(k, name)))
    // One candidate or none. An ambiguous name is left out rather than guessed at.
    const id = hits.length === 1 ? hits[0]!.id : null
    resolved.set(key, id)
    return id
  }

  const seen = new Set<string>()
  const payload: Record<string, unknown>[] = []
  /*
   * The export is in bracket order, so a wrestler's bouts are already in the sequence they were
   * wrestled. Recording that is more reliable than parsing round labels: NHSCA mixes "Round of
   * 128", "Consi of 64 #2", "Consi-Semis" and "7th Place", and sorting those as text puts the
   * consolation bracket before the championship one.
   */
  const nextOrder = new Map<string, number>()
  let byes = 0
  let outOfState = 0

  for (const row of rows) {
    const [date, weight, round, winner, winnerTeam, result, winType, loser, loserTeam] = row
    if (String(winType ?? "").toUpperCase() === "BYE") { byes += 1; continue }
    const ncIsWinner = winnerTeam === "NC"
    const ncIsLoser = loserTeam === "NC"
    if (!ncIsWinner && !ncIsLoser) { outOfState += 1; continue }

    for (const won of [true, false]) {
      if (won && !ncIsWinner) continue
      if (!won && !ncIsLoser) continue
      const me = won ? winner! : loser!
      const athleteId = resolve(me)
      if (!athleteId) continue
      const opponent = won ? loser! : winner!
      const key = `${athleteId}|${round}|${opponent}|${weight}`
      if (seen.has(key)) continue
      seen.add(key)
      const order = (nextOrder.get(athleteId) ?? 0) + 1
      nextOrder.set(athleteId, order)
      /*
       * Resolve the opponent too when they are also a North Carolina wrestler we hold.
       * `loadQualifierHeadToHead` keys on `opponent_id` and skips any bout without one, so a
       * null here means the meeting never reaches the head-to-head index — Carson Worrick beat
       * Tobin McNair in the 2026 consolation semi-final and neither card showed it.
       */
      const opponentId = (won ? loserTeam : winnerTeam) === "NC" ? resolve(opponent) : null
      payload.push({
        bout_order: order,
        opponent_id: opponentId,
        event_key: eventKey,
        event_name: `${year} ${EVENT_NAME_PREFIX}`,
        year,
        event_date: date ? new Date(date).toISOString().slice(0, 10) : null,
        weight_class: weight,
        round,
        athlete_name: me,
        athlete_id: athleteId,
        opponent_name: opponent,
        opponent_club: won ? loserTeam : winnerTeam,
        win: won,
        is_bye: false,
        win_type: winType,
        score: result,
        source_file: path.basename(file),
      })
    }
  }

  const perAthlete = new Set(payload.map((p) => p.athlete_id))
  console.log(`${rows.length} rows in file`)
  console.log(`  skipped: ${byes} byes, ${outOfState} with no North Carolina wrestler`)
  console.log(`  importing ${payload.length} bouts for ${perAthlete.size} boys' high school athletes`)

  if (!apply) {
    console.log("\nDRY RUN — pass --apply to write")
    for (const p of payload.slice(0, 8)) console.log(`   ${p.athlete_name} ${p.win ? "beat" : "lost to"} ${p.opponent_name} (${p.opponent_club}) ${p.win_type} ${p.score} — ${p.round}`)
    return
  }

  const { error: clearError } = await client.from("other_tournament_bouts").delete().eq("event_key", eventKey)
  if (clearError) throw new Error(`Clearing ${eventKey}: ${clearError.message}`)
  for (let i = 0; i < payload.length; i += 250) {
    const { error: insertError } = await client.from("other_tournament_bouts").insert(payload.slice(i, i + 250))
    if (insertError) throw new Error(`Inserting: ${insertError.message}`)
  }
  const { count } = await client
    .from("other_tournament_bouts")
    .select("*", { count: "exact", head: true })
    .eq("event_key", eventKey)
  console.log(`\nwrote ${count} bouts under ${eventKey}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
