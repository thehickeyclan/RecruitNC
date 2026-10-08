/**
 * Import Super 32 bouts for North Carolina boys' high school wrestlers.
 *
 * Super 32 was held as a record and a placement in `super32_results` and nothing else, so a
 * profile could say a wrestler went 4-2 without naming anyone he beat. Bouts go in
 * `other_tournament_bouts` under `super32-<year>`, as NHSCA's do; `super32_results` is left alone
 * and stays the source of the record and placement, so rankings do not count the event twice.
 *
 * Only North Carolina wrestlers, and only the boys' high school bracket — see
 * `lib/super32-bout-import.ts` for how that bracket is picked out of a file that does not label
 * divisions. A name is linked only when exactly one NC boy in a high school class matches it.
 *
 * The dry run checks each linked wrestler's record from the bouts against `super32_results`.
 *
 * Usage:
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local \
 *     scripts/import-super32-bouts.ts --file <csv> --year 2025 [--apply]
 */
/**
 * `--all-states` keeps the whole bracket instead of North Carolina alone. See
 * scripts/import-nhsca-nationals-bouts.ts, which carries the same switch and the reasoning: the
 * export is the national field and the wrestlers we dropped are the ones our kids faced. The
 * boys' high school filter stays either way - that one is about divisions, not states, and no
 * middle school result belongs here.
 */
const ALL_STATES = process.argv.includes("--all-states")

import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { highSchoolBracketRows, parseSuper32Csv } from "@/lib/super32-bout-import"

function arg(name: string): string {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]!
  throw new Error(`Missing required --${name}`)
}

async function main() {
  const file = path.resolve(arg("file"))
  const year = Number(arg("year"))
  const apply = process.argv.includes("--apply")
  const eventKey = `super32-${year}`

  const all = parseSuper32Csv(fs.readFileSync(file, "utf8"))
  const hs = highSchoolBracketRows(all)

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Super 32 runs in late October, so the season it opens is year-(year+1): seniors are the
  // class of year+1 and freshmen year+4.
  const hsClasses = new Set([year + 1, year + 2, year + 3, year + 4])
  const { data: athletes, error } = await client
    .from("athletes")
    .select("id,name,wrestling_name,graduationyear,gender")
    .eq("is_nc_athlete", true)
  if (error) throw new Error(`Loading athletes: ${error.message}`)
  const pool = (athletes ?? [])
    .filter((a) => hsClasses.has(Number(a.graduationyear)))
    // Boys' brackets: leave out girls, not profiles with no gender recorded (most of them).
    .filter((a) => !String(a.gender ?? "").toLowerCase().startsWith("f"))
    .map((a) => ({
      id: String(a.id),
      name: String(a.name ?? ""),
      keys: [String(a.name ?? ""), String(a.wrestling_name ?? "")].filter(Boolean),
    }))

  // A profile not flagged NC (Jack Harty) still links on an exact full name and an HS class:
  // the bout already says NC, so a same-named out-of-state profile cannot be the one meant.
  const { data: everyone } = await client.from("athletes").select("id,name,wrestling_name,graduationyear,gender")
  const exact = new Map<string, Set<string>>()
  for (const a of everyone ?? []) {
    if (!hsClasses.has(Number(a.graduationyear)) || String(a.gender ?? "").toLowerCase().startsWith("f")) continue
    for (const n of [a.name, a.wrestling_name]) {
      if (!n) continue
      const k = String(n).trim().toLowerCase()
      exact.set(k, new Set([...(exact.get(k) ?? []), String(a.id)]))
    }
  }

  const resolved = new Map<string, string | null>()
  const ambiguous = new Set<string>()
  const resolve = (name: string): string | null => {
    const key = name.trim().toLowerCase()
    if (resolved.has(key)) return resolved.get(key)!
    const hits = pool.filter((a) => a.keys.some((k) => namesLikelySamePerson(k, name)))
    if (hits.length > 1) ambiguous.add(`${name} → ${hits.map((h) => h.name).join(" / ")}`)
    const fallback = hits.length === 0 ? exact.get(key) : undefined
    const id = hits.length === 1 ? hits[0]!.id : fallback?.size === 1 ? [...fallback][0]! : null
    resolved.set(key, id)
    return id
  }

  const payload: Record<string, unknown>[] = []
  const seen = new Set<string>()
  // Bracket order as exported; see import-nhsca-nationals-bouts.ts for why not the round label.
  const nextOrder = new Map<string, number>()
  const unlinked = new Set<string>()
  const ncEntrants = new Set<string>()

  for (const row of hs) {
    if (row.winnerTeam === "NC") ncEntrants.add(`${row.winner}|${row.weight}`)
    if (row.loserTeam === "NC") ncEntrants.add(`${row.loser}|${row.weight}`)
    if (row.winType.toUpperCase() === "BYE" || !row.loser) continue
    for (const won of [true, false]) {
      const myTeam = won ? row.winnerTeam : row.loserTeam
      if (!ALL_STATES && myTeam !== "NC") continue
      const me = won ? row.winner : row.loser
      if (!me) continue
      // Unresolved under --all-states is kept: null athlete_id, state in athlete_club.
      // Only a North Carolina entrant can be one of our profiles. Under --all-states this resolved
      // every state's wrestlers by name: Nebraska's 190-pound Riley Johnson landed on Parkwood's girl.
      const athleteId = myTeam === "NC" ? resolve(me) : null
      if (!athleteId) { unlinked.add(`${me} (${row.weight})`); if (!ALL_STATES) continue }
      const opponent = won ? row.loser : row.winner
      const opponentTeam = won ? row.loserTeam : row.winnerTeam
      const who = athleteId ?? `${me.toLowerCase()}|${String(myTeam ?? "").toUpperCase()}`
      const key = `${who}|${row.round}|${opponent}|${row.weight}`
      if (seen.has(key)) continue
      seen.add(key)
      const order = (nextOrder.get(who) ?? 0) + 1
      nextOrder.set(who, order)
      payload.push({
        bout_order: order,
        // Head-to-head keys on opponent_id, so an NC opponent we hold is linked too.
        opponent_id: opponentTeam === "NC" ? resolve(opponent) : null,
        event_key: eventKey,
        event_name: `${year} Super 32`,
        year,
        event_date: row.date ? new Date(row.date).toISOString().slice(0, 10) : null,
        weight_class: row.weight,
        round: row.round,
        athlete_name: me,
        athlete_id: athleteId,
        athlete_club: myTeam,
        opponent_name: opponent,
        opponent_club: opponentTeam,
        win: won,
        is_bye: false,
        win_type: row.winType,
        score: row.result,
        source_file: path.basename(file),
      })
    }
  }

  const linked = new Set(payload.filter((p) => p.athlete_id).map((p) => p.athlete_id))
  console.log(`${all.length} rows in file, ${hs.length} in the boys' high school brackets`)
  console.log(`  NC entrants in those brackets: ${ncEntrants.size}`)
  console.log(`  importing ${payload.length} wrestler-rows`)
  if (ALL_STATES) {
    const byName = new Set(payload.filter((p) => !p.athlete_id).map((p) => `${String(p.athlete_name).toLowerCase()}|${p.athlete_club}`))
    const states = new Set(payload.map((p) => String(p.athlete_club ?? "").toUpperCase()).filter(Boolean))
    console.log(`    on a profile we hold : ${linked.size}`)
    console.log(`    name and state only  : ${byName.size} across ${states.size} states`)
  } else {
    console.log(`    for ${linked.size} linked athletes`)
    // Naming them is useful for NC only; under --all-states it is every other state's field.
    if (unlinked.size) console.log(`  not linked (no single NC HS boy by that name): ${[...unlinked].join(", ")}`)
  }
  if (ambiguous.size) console.log(`  ambiguous, left out: ${[...ambiguous].join("; ")}`)

  // The record the bouts give against the record already on file.
  const { data: onFile } = await client
    .from("super32_results")
    .select("athlete_name,weight_class,record,gender")
    .eq("year", year)
  const byName = new Map<string, { w: number; l: number; weight: string }>()
  for (const p of payload) {
    const name = String(p.athlete_name)
    const r = byName.get(name) ?? { w: 0, l: 0, weight: String(p.weight_class) }
    if (p.win) r.w += 1; else r.l += 1
    byName.set(name, r)
  }
  const mismatches: string[] = []
  const missingOnFile: string[] = []
  for (const [name, r] of byName) {
    const row = (onFile ?? []).find((o) => namesLikelySamePerson(String(o.athlete_name), name))
    if (!row) { missingOnFile.push(`${name} ${r.weight} ${r.w}-${r.l}`); continue }
    if (row.record !== `${r.w}-${r.l}` || String(row.weight_class) !== r.weight) {
      mismatches.push(`${name}: bouts ${r.weight} ${r.w}-${r.l}, on file ${row.weight_class} ${row.record}`)
    }
  }
  console.log(`\n  records agreeing with super32_results: ${byName.size - mismatches.length - missingOnFile.length}/${byName.size}`)
  if (mismatches.length) console.log(`  differ:\n    ${mismatches.join("\n    ")}`)
  if (missingOnFile.length) console.log(`  not in super32_results:\n    ${missingOnFile.join("\n    ")}`)

  if (!apply) {
    console.log("\nDRY RUN — pass --apply to write")
    for (const p of payload.slice(0, 8)) {
      console.log(`   ${p.athlete_name} ${p.win ? "beat" : "lost to"} ${p.opponent_name} (${p.opponent_club}) ${p.win_type} ${p.score} — ${p.round}`)
    }
    return
  }

  /*
   * This file's own rows only, and never a bout another import already holds - the girls' Super 32
   * brackets arrive separately and land under the same event key. Deleting by event key alone
   * erased them; inserting over them aborts on the table's unique key. Same two traps as NHSCA.
   */
  const { error: clearError } = await client
    .from("other_tournament_bouts")
    .delete()
    .eq("event_key", eventKey)
    .eq("source_file", path.basename(file))
  if (clearError) throw new Error(`Clearing ${eventKey}: ${clearError.message}`)

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
