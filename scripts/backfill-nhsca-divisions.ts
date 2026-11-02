#!/usr/bin/env npx tsx
/**
 * The NHSCA High School Nationals grade division on every national bout (Matt, 29 Oct 2026: "why
 * aren't we tracking divisions for NHSCA?"). Flo's export put the Freshman, Sophomore, Junior and
 * Senior brackets in one file under one event name, so at 152 in 2026 the bouts showed four boys
 * "NHSCA champions" (Hill, Dube, Ellis, Desena) and a freshman title read like the senior one.
 *
 * Source: scripts/data/nhsca-divisions-2023-2026.csv (Muse, 29 Oct 2026, from FloArena's own
 * bracket labels). Joined on (year, weight, wrestler name); a name in two divisions at one weight
 * is settled by the row's state stamp, or held (2026 Isaac Young, 152: NC in both). Fills
 * `division` on other_tournament_bouts AND on national_event_placers - the bouts say who beat
 * whom, the placers table is what prints the credential a coach reads - only where it is empty,
 * and logs every id it writes, so a run can be undone exactly (set division back to null on
 * those ids).
 *
 * Needs the column first (Matt runs it in Supabase):
 *   ALTER TABLE other_tournament_bouts ADD COLUMN IF NOT EXISTS division text;
 *
 *   npx tsx scripts/backfill-nhsca-divisions.ts            # dry run
 *   npx tsx scripts/backfill-nhsca-divisions.ts --write
 */
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const WRITE = process.argv.includes("--write")
const FILE = path.join(process.cwd(), "scripts/data/nhsca-divisions-2023-2026.csv")
const YEARS = [2023, 2024, 2025, 2026]

const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "")
const weightKey = (w: unknown) => String(w ?? "").replace(/\D/g, "")

type Entry = { division: string; state: string }

async function main() {
  console.log(`${WRITE ? "WRITING" : "DRY RUN — nothing is written"}\n`)
  const byKey = new Map<string, Entry[]>()
  for (const line of fs.readFileSync(FILE, "utf8").split("\n").slice(1).filter(Boolean)) {
    const p = line.split(",")
    // year,event,division,weight,wrestler_name,team_state,bouts — a name may hold a comma.
    const [year, , division, weight] = p
    const state = p[p.length - 2]!
    const name = p.slice(4, -2).join(",")
    const k = `${year}|${weightKey(weight)}|${norm(name)}`
    byKey.set(k, [...(byKey.get(k) ?? []), { division: division!, state }])
  }

  const writes = new Map<string, string[]>() // division -> bout ids
  const held: string[] = []
  const missing = new Map<string, number>()
  for (const year of YEARS) {
    const rows: Array<{ id: string; athlete_name: string; weight_class: string; athlete_club: string | null }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from("other_tournament_bouts")
        .select("id, athlete_name, weight_class, athlete_club")
        .eq("event_key", `nhsca-nationals-${year}`)
        .is("division", null)
        .order("id")
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      rows.push(...(data as typeof rows))
      if (data.length < 1000) break
    }
    let filled = 0
    for (const r of rows) {
      const cands = byKey.get(`${year}|${weightKey(r.weight_class)}|${norm(r.athlete_name)}`)
      if (!cands) {
        const k = `${year} ${r.weight_class} ${r.athlete_name}`
        missing.set(k, (missing.get(k) ?? 0) + 1)
        continue
      }
      const pick = cands.length === 1 ? cands : cands.filter((c) => c.state === r.athlete_club)
      if (pick.length !== 1) {
        held.push(`${year} ${r.weight_class} ${r.athlete_name} (${r.athlete_club ?? "?"}): ${cands.map((c) => `${c.division} ${c.state}`).join(" / ")}`)
        continue
      }
      writes.set(pick[0]!.division, [...(writes.get(pick[0]!.division) ?? []), r.id])
      filled++
    }
    console.log(`${year}: ${rows.length} bouts without a division · ${filled} matched`)
  }
  /*
   * The placers table carries the same division, and it is the one the credential labels read.
   * A bout says who beat whom; `national_event_placers` is what prints "2026 NHScA freshman
   * Champion (152)" on a profile, so a division filled only on the bouts leaves the sentence a
   * coach actually sees unable to tell a freshman title from a senior one.
   */
  const placerWrites = new Map<string, string[]>()
  const placerHeld: string[] = []
  let placerMissing = 0
  {
    const rows: Array<{ id: string; year: number; weight: unknown; wrestler_name: string; state: string | null }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from("national_event_placers")
        .select("id, year, weight, wrestler_name, state, event_name")
        .ilike("event_name", "%nhsca%")
        .is("division", null)
        .order("id")
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      rows.push(...(data as typeof rows))
      if (data.length < 1000) break
    }
    for (const r of rows) {
      const cands = byKey.get(`${r.year}|${weightKey(String(r.weight ?? ""))}|${norm(r.wrestler_name)}`)
      if (!cands) {
        placerMissing++
        continue
      }
      const pick = cands.length === 1 ? cands : cands.filter((c) => c.state === String(r.state ?? "").toUpperCase())
      if (pick.length !== 1) {
        placerHeld.push(`${r.year} ${r.weight} ${r.wrestler_name} (${r.state ?? "?"}): ${cands.map((c) => `${c.division} ${c.state}`).join(" / ")}`)
        continue
      }
      placerWrites.set(pick[0]!.division, [...(placerWrites.get(pick[0]!.division) ?? []), r.id])
    }
    const filled = [...placerWrites.values()].reduce((a, b) => a + b.length, 0)
    console.log(`\nnational_event_placers: ${rows.length} NHSCA rows without a division · ${filled} matched · ${placerHeld.length} held · ${placerMissing} not in the file`)
    for (const h of [...new Set(placerHeld)]) console.log(`   ${h}`)
  }

  console.log(`\nby division: ${[...writes].map(([d, ids]) => `${d} ${ids.length}`).join(" · ")}`)
  console.log(`held (two divisions, same state): ${held.length}`)
  for (const h of [...new Set(held)]) console.log(`   ${h}`)
  console.log(`not in the file: ${[...missing.values()].reduce((a, b) => a + b, 0)} bouts`)
  for (const [k, n] of missing) console.log(`   ${n}  ${k}`)

  if (!WRITE) {
    console.log("\nRe-run with --write.")
    return
  }
  const log = path.join(process.cwd(), "ranking-snapshots", `nhsca-divisions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`)
  fs.writeFileSync(
    log,
    JSON.stringify({ other_tournament_bouts: Object.fromEntries(writes), national_event_placers: Object.fromEntries(placerWrites) }, null, 1),
  )
  console.log(`\nids logged to ${path.relative(process.cwd(), log)}`)
  let written = 0
  for (const [division, ids] of writes) {
    for (let i = 0; i < ids.length; i += 300) {
      const { error, count } = await sb
        .from("other_tournament_bouts")
        .update({ division }, { count: "exact" })
        .in("id", ids.slice(i, i + 300))
        .is("division", null)
      if (error) throw new Error(error.message)
      written += count ?? 0
    }
  }
  console.log(`wrote division on ${written} bouts`)
  let placersWritten = 0
  for (const [division, ids] of placerWrites) {
    for (let i = 0; i < ids.length; i += 300) {
      const { error, count } = await sb
        .from("national_event_placers")
        .update({ division }, { count: "exact" })
        .in("id", ids.slice(i, i + 300))
        .is("division", null)
      if (error) throw new Error(error.message)
      placersWritten += count ?? 0
    }
  }
  console.log(`wrote division on ${placersWritten} placer rows`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
