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

/**
 * Keep the whole national field, not just North Carolina.
 *
 * The export has always carried every state - 5,729 wrestlers across 52 states in 2026 - and we
 * stored the 500 from North Carolina and dropped the rest. That is why an out-of-state wrestler
 * our kids actually faced exists here only as a name on somebody else's bout, with no record, no
 * grade and nothing to join on. Off by default: turning it on multiplies this table by roughly
 * ten and is a decision about what the database is for.
 */
const ALL_STATES = process.argv.includes("--all-states")

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

  /*
   * Two shapes reach this importer, so the header decides rather than the column order.
   *
   * The Trackwrestling export is positional, every cell written ="value". The collected files are
   * an ordinary CSV with names — `tournament,weight,round,bout_number,winner_name,winner_team,
   * loser_name,loser_team,result_type,score,time` — which is what the 2023 brackets, Super 32's
   * and the girls' files all use. Read positionally, a named file puts the bout number where the
   * winner's name belongs and imports nothing recognisable.
   */
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)
  const header = parseCells(lines[0] ?? "").map((h) => h.toLowerCase().trim())
  const at = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n)
      if (i >= 0) return i
    }
    return -1
  }
  const iWinner = at("winner_name", "winning wrestler")
  const iLoser = at("loser_name", "losing wrestler")
  const named = iWinner >= 0 && iLoser >= 0
  const cols = named
    ? {
        date: at("date", "event_date"),
        weight: at("weight", "weight_class"),
        round: at("round"),
        winner: iWinner,
        winnerTeam: at("winner_team", "winner_state", "winning team"),
        result: at("score", "result"),
        winType: at("result_type", "win type", "win_type"),
        loser: iLoser,
        loserTeam: at("loser_team", "loser_state", "losing team"),
        time: at("time"),
      }
    : null
  const rows = lines
    .slice(1)
    .map(parseCells)
    .filter((r) => r.length >= (named ? 6 : 9))
    .map((r) => {
      if (!cols) return r
      const pick = (i: number) => (i >= 0 ? (r[i] ?? "") : "")
      // The score and the clock read as one field on a profile line, as they do elsewhere.
      const score = [pick(cols.result), pick(cols.time)].map((x) => x.trim()).filter(Boolean).join(" ")
      return [
        pick(cols.date), pick(cols.weight), pick(cols.round), pick(cols.winner), pick(cols.winnerTeam),
        score, pick(cols.winType), pick(cols.loser), pick(cols.loserTeam),
      ]
    })

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
    if (!ALL_STATES && !ncIsWinner && !ncIsLoser) { outOfState += 1; continue }

    for (const won of [true, false]) {
      if (!ALL_STATES && won && !ncIsWinner) continue
      if (!ALL_STATES && !won && !ncIsLoser) continue
      const me = won ? winner! : loser!
      if (!me) continue
      const myTeam = (won ? winnerTeam : loserTeam) ?? null
      /*
       * `resolve` only knows North Carolina, because North Carolina is the only state we hold
       * profiles for. Under --all-states a wrestler we cannot resolve is still recorded, with a
       * null `athlete_id` and her state in `athlete_club` - the same shape an opponent already
       * has. The row is evidence waiting for an identity, which is what the matcher is for; the
       * alternative is what we did until now, which was to delete her.
       */
      const athleteId = resolve(me)
      if (!athleteId && !ALL_STATES) continue
      const opponent = won ? loser! : winner!
      // Identity for ordering and de-duplication: the profile where we have one, else name+state.
      const who = athleteId ?? `${me.toLowerCase()}|${String(myTeam ?? "").toUpperCase()}`
      const key = `${who}|${round}|${opponent}|${weight}`
      if (seen.has(key)) continue
      seen.add(key)
      const order = (nextOrder.get(who) ?? 0) + 1
      nextOrder.set(who, order)
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
        athlete_club: myTeam,
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

  const linked = new Set(payload.filter((p) => p.athlete_id).map((p) => p.athlete_id))
  const unlinked = new Set(payload.filter((p) => !p.athlete_id).map((p) => `${String(p.athlete_name).toLowerCase()}|${p.athlete_club}`))
  const states = new Set(payload.map((p) => String(p.athlete_club ?? "").toUpperCase()).filter(Boolean))
  console.log(`${rows.length} rows in file`)
  console.log(`  skipped: ${byes} byes, ${outOfState} with no North Carolina wrestler`)
  console.log(`  importing ${payload.length} wrestler-rows`)
  console.log(`    on a profile we hold : ${linked.size}`)
  console.log(`    name and state only  : ${unlinked.size}${ALL_STATES ? ` across ${states.size} states` : ""}`)

  if (!apply) {
    console.log("\nDRY RUN — pass --apply to write")
    for (const p of payload.slice(0, 8)) console.log(`   ${p.athlete_name} ${p.win ? "beat" : "lost to"} ${p.opponent_name} (${p.opponent_club}) ${p.win_type} ${p.score} — ${p.round}`)
    // Every wrestler with his bout count, so a re-run can be compared with what is stored.
    if (process.argv.includes("--list")) {
      const counts = new Map<string, number>()
      for (const p of payload) counts.set(`${p.athlete_id}\t${p.athlete_name}`, (counts.get(`${p.athlete_id}\t${p.athlete_name}`) ?? 0) + 1)
      for (const [k, n] of [...counts].sort()) console.log(`LIST\t${k}\t${n}`)
    }
    return
  }

  /*
   * Clear this file's own rows, not the whole event.
   *
   * The event key is shared: the girls' brackets arrive in their own export and land under the
   * same `nhsca-nationals-<year>`, written by scripts/import-girls-bouts.ts. Deleting by event key
   * alone took them with it - a re-run of the boys' import silently erased every girl's NHSCA
   * matches, which is exactly the absence that sent us looking in the first place.
   */
  const { error: clearError } = await client
    .from("other_tournament_bouts")
    .delete()
    .eq("event_key", eventKey)
    .eq("source_file", path.basename(file))
  if (clearError) throw new Error(`Clearing ${eventKey}: ${clearError.message}`)

  /*
   * Yield to bouts another importer already holds.
   *
   * The national export is the whole venue - the girls' and middle school divisions wrestle it too
   * - so under --all-states it reaches bouts that arrived earlier in their own curated file, where
   * both wrestlers' states are recorded rather than just the team text. Those rows are the better
   * record, and the table's unique key (event, weight, round, athlete, opponent) refuses the
   * duplicate anyway: without this the whole insert aborts on the first one.
   */
  const held = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("other_tournament_bouts")
      .select("weight_class,round,athlete_name,opponent_name")
      .eq("event_key", eventKey)
      .order("id", { ascending: true })
      .range(from, from + 999)
    if (error) throw new Error(`Reading ${eventKey}: ${error.message}`)
    for (const r of data ?? []) held.add(`${r.weight_class}|${r.round}|${r.athlete_name}|${r.opponent_name}`)
    if (!data || data.length < 1000) break
  }
  const fresh = payload.filter((p) => !held.has(`${p.weight_class}|${p.round}|${p.athlete_name}|${p.opponent_name}`))
  if (fresh.length !== payload.length) {
    console.log(`  ${payload.length - fresh.length} bouts already held by another import, left alone`)
  }

  for (let i = 0; i < fresh.length; i += 250) {
    const { error: insertError } = await client.from("other_tournament_bouts").insert(fresh.slice(i, i + 250))
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
