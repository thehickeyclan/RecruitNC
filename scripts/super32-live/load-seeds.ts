/**
 * Load a seed CSV and publish a fresh snapshot, as the admin page does.
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/super32-live/load-seeds.ts <csv> [--final]
 */
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { buildSnapshot, SUPER32_EVENT_KEY } from "@/lib/super32-live/snapshot"

async function main() {
  const file = process.argv[2]!
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await c.from("super32_live_uploads").insert({
    event_key: SUPER32_EVENT_KEY, kind: "seeds", file_name: path.basename(file),
    content: fs.readFileSync(file, "utf8"), seeds_final: process.argv.includes("--final"),
  })
  if (error) throw new Error(JSON.stringify(error))
  const snap = await buildSnapshot(c)
  await c.from("super32_live_snapshots").update({ published: false }).eq("event_key", SUPER32_EVENT_KEY).eq("published", true)
  await c.from("super32_live_snapshots").update({ published: true, published_at: new Date().toISOString() }).eq("id", snap.id)
  const s = snap.data.scoreboards.all
  console.log(`published ${snap.id}: ${s.wrestlers} NC entrants, alerts queued ${snap.alertsQueued}`)
  console.log(snap.data.entrants.map((e) => `${e.name} ${e.gender} ${e.weight} #${e.seed} ${e.athleteId ? "linked" : "UNLINKED"} [${e.chips.join("; ")}]`).join("\n"))
}
main()
