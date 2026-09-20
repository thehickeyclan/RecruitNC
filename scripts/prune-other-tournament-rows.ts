/**
 * Keeps only the imported tournament rows a profile can actually use, and drops placements a
 * source cannot support.
 *
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/prune-other-tournament-rows.ts [--apply]
 *
 * A bracket export carries the whole event. Importing Georgia's Super 32 Early Entry to show seven
 * North Carolina wrestlers also stored 476 wrestlers nobody here will ever look up, most of them
 * minors from another state. What earns its place:
 *
 * - **Bouts**: one side of the mat has to be ours. A Virginia wrestler against another Virginia
 *   wrestler is never drawn on any page here.
 * - **Results**: ours, or an opponent of ours. An opponent's row is what lets a profile say the win
 *   was over a wrestler who placed second — see `buildStrengthOfWins`. Without it the win still
 *   shows, just with nothing behind it.
 *
 * It also clears placements in any event-and-weight that reports more than one champion. Virginia's
 * export runs boys and girls under one weight number, so both champions landed on the same weight
 * and one of them was about to be printed as the other's.
 *
 * Dry run by default. Nothing is deleted without --apply.
 */
import { createClient } from "@supabase/supabase-js"

const apply = process.argv.includes("--apply")
const nameKey = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z]/g, "")

async function readAll(admin: ReturnType<typeof createClient>, table: string, columns: string) {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...((data ?? []) as Record<string, unknown>[]))
    if ((data ?? []).length < 1000) break
  }
  return rows
}

void (async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const ourNames = new Set<string>()
  for (const row of await readAll(admin, "athletes", "id,name")) ourNames.add(nameKey(row.name))

  const bouts = await readAll(
    admin,
    "other_tournament_bouts",
    "id,event_key,athlete_id,athlete_name,opponent_id,opponent_name,opponent_club",
  )
  const results = await readAll(admin, "other_tournament_results", "id,event_key,athlete_id,athlete_name,club,weight_class,placement")

  const ours = (id: unknown, name: unknown) => Boolean(id) || ourNames.has(nameKey(name))

  // Bouts: keep when either wrestler is ours.
  const boutsToDelete = bouts.filter(
    (bout) => !ours(bout.athlete_id, bout.athlete_name) && !ours(bout.opponent_id, bout.opponent_name),
  )

  // Results: keep ours, and anyone ours actually wrestled (their row is the credential behind a win).
  const opponentsOfOurs = new Set<string>()
  for (const bout of bouts) {
    if (!ours(bout.athlete_id, bout.athlete_name)) continue
    opponentsOfOurs.add(`${bout.event_key}|${nameKey(bout.opponent_name)}`)
  }
  const resultsToDelete = results.filter(
    (row) =>
      !ours(row.athlete_id, row.athlete_name) &&
      !opponentsOfOurs.has(`${row.event_key}|${nameKey(row.athlete_name)}`),
  )

  // Placements that cannot be trusted: more than one champion in an event's weight.
  const champions = new Map<string, number>()
  for (const row of results) {
    if (Number(row.placement) !== 1) continue
    const key = `${row.event_key}|${row.weight_class}`
    champions.set(key, (champions.get(key) ?? 0) + 1)
  }
  const ambiguous = [...champions.entries()].filter(([, count]) => count > 1).map(([key]) => key)
  const placementsToClear = results.filter(
    (row) => row.placement != null && ambiguous.includes(`${row.event_key}|${row.weight_class}`),
  )

  const byEvent = (rows: Record<string, unknown>[]) => {
    const out: Record<string, number> = {}
    for (const row of rows) out[String(row.event_key)] = (out[String(row.event_key)] ?? 0) + 1
    return out
  }
  console.log(`bouts: ${bouts.length} → keeping ${bouts.length - boutsToDelete.length}`, byEvent(boutsToDelete))
  console.log(`results: ${results.length} → keeping ${results.length - resultsToDelete.length}`, byEvent(resultsToDelete))
  console.log(`placements to clear (${placementsToClear.length}) in weights with two champions:`, ambiguous)

  if (!apply) {
    console.log("dry run — nothing written. Re-run with --apply.")
    return
  }

  for (const [table, rows] of [
    ["other_tournament_bouts", boutsToDelete],
    ["other_tournament_results", resultsToDelete],
  ] as const) {
    for (let i = 0; i < rows.length; i += 200) {
      const ids = rows.slice(i, i + 200).map((row) => row.id as string)
      const { error } = await admin.from(table).delete().in("id", ids)
      if (error) throw new Error(`${table}: ${error.message}`)
    }
    console.log(`deleted ${rows.length} from ${table}`)
  }

  for (let i = 0; i < placementsToClear.length; i += 200) {
    const ids = placementsToClear.slice(i, i + 200).map((row) => row.id as string)
    const { error } = await admin.from("other_tournament_results").update({ placement: null, qualified: false }).in("id", ids)
    if (error) throw new Error(`clear placements: ${error.message}`)
  }
  console.log(`cleared ${placementsToClear.length} unsupported placements`)
})()
