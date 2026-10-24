/**
 * Dry run of a Flo export against the live seeds: NC record, every NC bout, duplicates and any
 * division warnings. Writes nothing. Used to check each upload during the event.
 *   npx tsx --conditions=react-server --env-file=.env.local scripts/super32-live/check-export.ts <file.csv>
 */
import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { computeSnapshot, latestUpload, parseSeedsCsv } from "@/lib/super32-live/snapshot"
import { parseSuper32Csv } from "@/lib/super32-bout-import"
import { dedupeBouts } from "@/lib/super32-live/engine"

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const flo = fs.readFileSync(process.argv[2]!, "utf8")
  const raw = parseSuper32Csv(flo).filter((r) => r.winner)
  const real = raw.filter((r) => r.loser)
  console.log(`rows ${raw.length} · real bouts ${real.length} · duplicates collapsed ${raw.length - dedupeBouts(raw).length}`)
  const seedsUp = await latestUpload(sb, "super32-2026", "seeds")
  const { data } = await computeSnapshot(sb, "super32-2026", { floContent: flo, seeds: parseSeedsCsv(seedsUp!.content), seedsFinal: !!seedsUp!.seeds_final, prev: null })
  for (const g of ["all", "boys", "girls"] as const) {
    const s = data.scoreboards[g]
    console.log(`${g}: ${s.wins}-${s.losses} · alive ${s.stillAlive} · huge ${s.huge} · big ${s.big} · vs seeded ${s.seededWins}-${s.seededLosses} · AA ${s.allAmericans}`)
  }
  if (data.unresolved.length) console.log("WARN", data.unresolved.join(" | "))
  const lines: string[] = []
  for (const e of data.entrants) for (const b of e.bouts) {
    if (b.winType === "BYE") continue
    lines.push(`${e.gender === "girls" ? "G" : ""}${e.weight}\t${e.name}${e.seed ? ` (#${e.seed})` : ""}\t${b.win ? "W" : "L"} ${b.winType} ${b.result}\t${b.opponent} (${b.opponentTeam})${b.opponentSeed ? ` #${b.opponentSeed}` : ""}\t${b.round}${b.win && b.tier !== "win" ? `\t${String(b.tier).toUpperCase()}` : ""}${b.reasons?.length ? `\t[${b.reasons.join("; ")}]` : ""}`)
  }
  console.log(lines.join("\n"))
  // Raw cross-check: NC on either side of a real bout, straight from the file.
  const ncRaw = real.filter((r) => r.winnerTeam.trim() === "NC" || r.loserTeam.trim() === "NC").length
  console.log(`raw NC bouts in file ${ncRaw} · engine NC bouts ${lines.length}${ncRaw !== lines.length ? "  <-- MISMATCH (excluded or unmatched NC names)" : ""}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
