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
      if ((won ? row.winnerTeam : row.loserTeam) !== "NC") continue
      const me = won ? row.winner : row.loser
      const athleteId = resolve(me)
      if (!athleteId) { unlinked.add(`${me} (${row.weight})`); continue }
      const opponent = won ? row.loser : row.winner
      const opponentTeam = won ? row.loserTeam : row.winnerTeam
      const key = `${athleteId}|${row.round}|${opponent}|${row.weight}`
      if (seen.has(key)) continue
      seen.add(key)
      const order = (nextOrder.get(athleteId) ?? 0) + 1
      nextOrder.set(athleteId, order)
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

  const linked = new Set(payload.map((p) => p.athlete_id))
  console.log(`${all.length} rows in file, ${hs.length} in the boys' high school brackets`)
  console.log(`  NC entrants in those brackets: ${ncEntrants.size}`)
  console.log(`  importing ${payload.length} bouts for ${linked.size} linked athletes`)
  if (unlinked.size) console.log(`  not linked (no single NC HS boy by that name): ${[...unlinked].join(", ")}`)
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
