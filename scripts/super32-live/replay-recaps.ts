/**
 * Replays a Flo export as Saturday's uploads arrive: a growing file, cut by event progress, some
 * cuts mid-round. Prints each upload's recap and checks its record against the bouts. Read-only.
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/super32-live/replay-recaps.ts
 */
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { parseFloExport, splitDivisions, summarizeEntrants, type SeedRow } from "@/lib/super32-live/engine"
import { roundProgress } from "@/lib/super32-live/rounds"
import { computeSnapshot, type SnapshotData } from "@/lib/super32-live/snapshot"

async function main() {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const csv = fs.readFileSync("scripts/data/super32-2025-flo-export.csv", "utf8")
  const lines = csv.split(/\r?\n/).filter(Boolean)
  const header = lines[0]!
  const rows = lines.slice(1)
  const parsed = parseFloExport(csv)
  const { data: girls } = await c.from("other_tournament_bouts").select("athlete_name, weight_class").eq("event_key", "super32-2025").eq("gender", "F").limit(1000)
  const hints = (girls ?? []).map((r) => ({ gender: "girls" as const, weight: String(r.weight_class), name: String(r.athlete_name), state: "NC" }))
  // Stand-in seeds (2025 placers) so seeded-win counts and tiers are exercised.
  const everyone = summarizeEntrants(splitDivisions(parsed, hints).bouts, { seeds: [], credentials: [], seedsFinal: false }, () => true)
  const seeds: SeedRow[] = everyone.filter((e) => e.placement).map((e) => ({ gender: e.gender, weight: e.weight, seed: e.placement!, name: e.name, state: e.team }))
  // The whole NC field, unseeded, as the bracket PDFs give it on Saturday.
  for (const e of everyone) if (e.team === "NC" && !e.placement) seeds.push({ gender: e.gender, weight: e.weight, seed: null, name: e.name, state: "NC" })

  // Order the file the way the day unfolds, then cut it into growing uploads.
  const order = rows.map((line, k) => ({ line, p: roundProgress(parsed[k]?.round ?? "") }))
  order.sort((a, b) => a.p - b.p)
  const cuts = [0.12, 0.25, 0.33, 0.5, 0.62, 0.75, 0.88, 1].map((f) => Math.round(order.length * f))
  let prev: SnapshotData | null = null
  let t = Date.parse("2026-10-24T13:00:00Z")
  for (const n of cuts) {
    const file = [header, ...order.slice(0, n).map((x) => x.line)].join("\n")
    t += 30 * 60_000
    const { data, latestRecap, newKeys } = await computeSnapshot(c, "replay", { floContent: file, seeds, seedsFinal: true, prev, hints, eventYear: 2025, credentials: false }, new Date(t).toISOString())
    // Independent check: the recap's W-L must equal the NC results among this upload's new bouts.
    let w = 0, l = 0
    for (const e of data.entrants) for (const b of e.bouts) if (newKeys.has(b.key) && b.opponent && !/^bye$/i.test(b.winType)) b.win ? w++ : l++
    const sb = data.scoreboards.all
    console.log(`\nUpload @${new Date(t).toISOString().slice(11, 16)}Z  rows ${n}  new bouts ${newKeys.size}`)
    if (latestRecap) {
      console.log(`  label: ${latestRecap.label}`)
      console.log(`  recap ${latestRecap.wins}-${latestRecap.losses} | check ${w}-${l} ${latestRecap.wins === w && latestRecap.losses === l ? "OK" : "MISMATCH"} | seeded ${latestRecap.seededWins} huge ${latestRecap.huge} big ${latestRecap.big} | alive ${latestRecap.stillAlive}`)
      console.log(`  "${latestRecap.sentence}"`)
      if (latestRecap.topPerformance) console.log(`  top: ${latestRecap.topPerformance.name} ${latestRecap.topPerformance.line}`)
      if (latestRecap.biggestUpset) console.log(`  upset: ${latestRecap.biggestUpset.name} ${latestRecap.biggestUpset.line}`)
      if (latestRecap.longestStreak) console.log(`  streak: ${latestRecap.longestStreak.name} ${latestRecap.longestStreak.streak}`)
      if (latestRecap.notableEliminations.length) console.log(`  out: ${latestRecap.notableEliminations.map((x) => x.name + (x.seed ? " #" + x.seed : "")).join(", ")}`)
    } else console.log("  (no recap: no new NC bouts)")
    console.log(`  scoreboard ${sb.wins}-${sb.losses} alive ${sb.stillAlive} (${sb.aliveChamp} champ / ${sb.aliveConsi} consi) AA ${sb.allAmericans} recaps stored ${data.recaps.length}`)
    prev = data
  }
}
main()
