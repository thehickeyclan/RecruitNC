/**
 * TEMPORARY: publish the 2025 event on the live page so it can be reviewed on a phone.
 * No alerts are queued and nothing is written to profiles. Remove with --remove.
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/super32-live/rehearsal-publish.ts [--remove]
 */
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { parseFloExport, splitDivisions, summarizeEntrants, type SeedRow } from "@/lib/super32-live/engine"
import { computeSnapshot, SUPER32_EVENT_KEY } from "@/lib/super32-live/snapshot"

const MARK = "rehearsal-2025"

async function main() {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (process.argv.includes("--remove")) {
    const { data } = await c.from("super32_live_snapshots").delete().eq("event_key", SUPER32_EVENT_KEY).contains("data", { rehearsal: MARK }).select("id")
    console.log(`removed ${data?.length ?? 0} rehearsal snapshot(s)`)
    return
  }
  const csv = fs.readFileSync("scripts/data/super32-2025-flo-export.csv", "utf8")
  const { data: girls } = await c.from("other_tournament_bouts").select("athlete_name, weight_class").eq("event_key", "super32-2025").eq("gender", "F").limit(1000)
  const hints = (girls ?? []).map((r) => ({ gender: "girls" as const, weight: String(r.weight_class), name: String(r.athlete_name), state: "NC" }))
  const split = splitDivisions(parseFloExport(csv), hints)
  const everyone = summarizeEntrants(split.bouts, { seeds: [], credentials: [], seedsFinal: false }, () => true)
  const seeds: SeedRow[] = everyone.filter((e) => e.placement).map((e) => ({ gender: e.gender, weight: e.weight, seed: e.placement!, name: e.name, state: e.team }))
  const { data } = await computeSnapshot(c, SUPER32_EVENT_KEY, { floContent: csv, seeds, seedsFinal: true, prev: null, hints, eventYear: 2025 })
  await c.from("super32_live_snapshots").update({ published: false }).eq("event_key", SUPER32_EVENT_KEY).eq("published", true)
  const { data: row, error } = await c.from("super32_live_snapshots")
    .insert({ event_key: SUPER32_EVENT_KEY, data: { ...data, rehearsal: MARK }, published: true, published_at: new Date().toISOString() })
    .select("id").single()
  if (error) throw new Error(error.message)
  const s = data.scoreboards.all
  console.log(`published rehearsal ${row!.id}: ${s.wrestlers} NC, ${s.wins}-${s.losses}, Huge ${s.huge}, Big ${s.big}, AA ${s.allAmericans}`)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
