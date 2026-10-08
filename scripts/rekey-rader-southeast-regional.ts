#!/usr/bin/env npx tsx
/**
 * Re-key the Frank E. Rader Southeast Regional results by division, gender included.
 *
 * The first import merged boys and girls into one event_key per age group and style, keeping the
 * distinction only in the event_name text: `southeast-regional-2026-junior-fs` held 425 rows named
 * "Junior Freestyle" beside 130 named "Junior Girls Freestyle". Since event_key is what joins
 * matches to placements and what an importer replaces, that made the match data impossible to land
 * - loading the girls would have deleted the boys.
 *
 * It also dropped the event's real name. The official pages confirm it:
 *   usawrestlingevents.com/results/12264 -> 2025 Frank E. Rader Southeast Regional Championships
 *   usawrestlingevents.com/results/19501 -> 2026 Frank E. Rader Southeast Regional Championships
 *
 * Everything needed is already on the row: the old key holds the age group and style, and the old
 * name says whether it is the girls bracket. The results page URL is NOT recorded - this table has
 * no source_url column, and the event_name now carries the real tournament name instead. Nothing is matched back to the source CSV on purpose.
 * A first attempt did, on (year, name, weight, placement, record), and moved 50 rows from freestyle
 * into Greco - a wrestler who entered both styles at one weight with the same placement and record
 * collides on that key, and three of the NC girls in this event did exactly that.
 *
 *   npx tsx scripts/rekey-rader-southeast-regional.ts [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const WRITE = process.argv.includes("--write")

/** The age group and style, read off the key the first import wrote. */
const AGE_STYLE: Record<string, string> = {
  "16u-fs": "16U|Freestyle",
  "16u-gr": "16U|Greco-Roman",
  "junior-fs": "Junior|Freestyle",
  "junior-gr": "Junior|Greco-Roman",
}
async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const held: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("other_tournament_results")
      .select("*")
      .or("event_name.ilike.%southeast%,event_name.ilike.%rader%")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    held.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  console.log(`rows on file: ${held.length}`)

  const updates: Array<{ id: string; patch: Record<string, unknown> }> = []
  const tally = { done: 0, submitted: 0, skipped: 0 }
  for (const row of held) {
    if (row.verification_status === "family-submitted") { tally.submitted++; continue }
    const m = String(row.event_key ?? "").match(/^southeast-regional-(20\d\d)-(16u-fs|16u-gr|junior-fs|junior-gr)$/)
    if (!m) { tally.skipped++; continue }
    const [, year, slug] = m
    const [age, style] = AGE_STYLE[slug!]!.split("|")
    /* The old name is the only record of which bracket a row came from. */
    const girls = /girls|women/i.test(String(row.event_name))
    const label = `${age} ${girls ? "Girls" : "Boys"} ${style}`
    updates.push({
      id: row.id,
      patch: {
        event_key: `rader-southeast-regional-${year}-${age!.toLowerCase()}-${girls ? "girls" : "boys"}-${style === "Freestyle" ? "fs" : "gr"}`,
        event_name: `${year} Frank E. Rader Southeast Regional Championships - ${label}`,
        event_short_name: "Frank E. Rader Southeast Regional",
        gender: girls ? "F" : "M",
      },
    })
    tally.done++
  }
  console.log(`   re-keyed from their own key and name : ${tally.done}`)
  console.log(`   family-submitted, left alone         : ${tally.submitted}`)
  console.log(`   key did not match the old pattern    : ${tally.skipped}`)

  const keys = new Map<string, number>()
  for (const u of updates) keys.set(String(u.patch.event_key), (keys.get(String(u.patch.event_key)) ?? 0) + 1)
  console.log(`\nkeys after re-keying (${keys.size}):`)
  for (const [k, n] of [...keys].sort()) console.log(`   ${String(n).padStart(4)}  ${k}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let done = 0
  for (const u of updates) {
    const { error } = await sb.from("other_tournament_results").update({ ...u.patch, updated_at: new Date().toISOString() }).eq("id", u.id)
    if (error) { console.error(`  ${u.id} FAILED: ${error.message}`); continue }
    done++
    if (done % 500 === 0) console.log(`   updated ${done}/${updates.length}`)
  }
  console.log(`\nre-keyed ${done} rows`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
