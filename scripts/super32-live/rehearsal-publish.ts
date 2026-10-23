/**
 * Publishes the 2025 event as the Command Center's permanent 2025 view (event key super32-2025),
 * and removes the old rehearsal copies from the 2026 key. 2025 has no seed file and today's
 * rankings would be anachronistic, so it carries no seeds, tiers or opponent credentials: records,
 * finishes and All-Americans only (Matt, 23 Oct). No alerts, nothing written to profiles.
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/super32-live/rehearsal-publish.ts [--remove]
 */
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { computeSnapshot, SUPER32_EVENT_KEY } from "@/lib/super32-live/snapshot"

const MARK = "rehearsal-2025"

async function main() {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: gone } = await c.from("super32_live_snapshots").delete().eq("event_key", SUPER32_EVENT_KEY).contains("data", { rehearsal: MARK }).select("id")
  console.log(`removed ${gone?.length ?? 0} rehearsal snapshot(s) from ${SUPER32_EVENT_KEY}`)
  if (process.argv.includes("--remove")) return
  const KEY_2025 = "super32-2025"
  const csv = fs.readFileSync("scripts/data/super32-2025-flo-export.csv", "utf8")
  const { data: girls } = await c.from("other_tournament_bouts").select("athlete_name, weight_class").eq("event_key", "super32-2025").eq("gender", "F").limit(1000)
  const hints = (girls ?? []).map((r) => ({ gender: "girls" as const, weight: String(r.weight_class), name: String(r.athlete_name), state: "NC" }))
  const { data } = await computeSnapshot(c, KEY_2025, { floContent: csv, seeds: [], seedsFinal: false, prev: null, hints, eventYear: 2025, credentials: false })
  await c.from("super32_live_snapshots").delete().eq("event_key", KEY_2025)
  const { data: row, error } = await c.from("super32_live_snapshots")
    .insert({ event_key: KEY_2025, data: { ...data, rehearsal: MARK }, published: true, published_at: new Date().toISOString() })
    .select("id").single()
  if (error) throw new Error(error.message)
  const s = data.scoreboards.all
  console.log(`published rehearsal ${row!.id}: ${s.wrestlers} NC, ${s.wins}-${s.losses}, Huge ${s.huge}, Big ${s.big}, AA ${s.allAmericans}`)
}
main().catch((e) => { console.error(e.message); process.exit(1) })
