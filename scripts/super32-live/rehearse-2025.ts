/**
 * Runs the Command Center engine on the 2025 Flo export. 2025 has no seeds, so the girls'
 * brackets are told apart by the NC girls we already hold for 2025.
 *   NODE_PATH=$PWD/node_modules npx tsx --env-file=.env.local scripts/super32-live/rehearse-2025.ts <csv>
 */
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { parseFloExport, splitDivisions, summarizeEntrants, scoreboard } from "@/lib/super32-live/engine"

async function main() {
  const rows = parseFloExport(fs.readFileSync(process.argv[2]!, "utf8"))
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await c.from("other_tournament_bouts").select("athlete_name,weight_class").eq("event_key", "super32-2025").eq("gender", "F").limit(1000)
  const hints = [...new Map((data ?? []).map((r) => [`${r.athlete_name}|${r.weight_class}`, { gender: "girls" as const, weight: String(r.weight_class), name: String(r.athlete_name), state: "NC" }])).values()]
  const split = splitDivisions(rows, hints)
  console.log("rows", rows.length, "hs bouts", split.bouts.length)
  console.log("unresolved", split.unresolved)
  console.log("brackets", split.brackets.map((b) => `${b.gender[0]}${b.weight}:${b.entrants}${b.how === "seeds" ? `(${b.seedsMatched})` : ""}`).join(" "))
  const es = summarizeEntrants(split.bouts, { seeds: [], credentials: [], seedsFinal: false })
  for (const g of ["boys", "girls"] as const) {
    const s = scoreboard(es, g)
    console.log(g, `wrestlers ${s.wrestlers} ${s.wins}-${s.losses} winning ${s.winningRecords} AA ${s.allAmericans} finalists ${s.finalists}`)
  }
  for (const e of es.filter((x) => x.aaClinched || x.placement)) console.log(" AA", e.gender, e.weight, e.name, `${e.wins}-${e.losses}`, "place", e.placement, e.bouts.map((b) => `${b.win ? "W" : "L"}:${b.bout.round}`).join(", "))
}
main()
