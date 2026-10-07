#!/usr/bin/env npx tsx
/**
 * Remove the 2026 girls' state-qualifier rows that were also written under boys' classifications.
 *
 * Every unplaced girl at the 2026 girls' state tournament was stored twice: once as "Girls 5A"
 * and once as plain "5A", so her profile listed the same qualifier twice (Jada Parrish, Mya
 * Craig). A plain row is removed only when a "Girls" row exists for the same name, weight and
 * year. Identity links on a removed row move to the "Girls" twin unless the twin is already linked,
 * and a profile id on the duplicate is copied to the twin when the twin has none. Backed up first.
 *
 *   npx tsx scripts/dedupe-girls-2026-qualifiers.ts           # dry run
 *   npx tsx scripts/dedupe-girls-2026-qualifiers.ts --apply
 */
import fs from "fs"; import path from "path"; import { createClient } from "@supabase/supabase-js"
for (const f of [".env.local", ".env"]) { const p = path.join(process.cwd(), f); if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "") } }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "")
;(async () => {
  const rows: any[] = []
  for (let i = 0; ; i += 1000) { const { data, error } = await sb.from("wrestling_nchsaa_results").select("*").eq("year", 2026).range(i, i + 999); if (error) throw error; rows.push(...data!); if (data!.length < 1000) break }
  const girls = rows.filter(r => /^girls /i.test(r.classification))
  const girlKey = new Map(girls.map(r => [`${r.classification.replace(/^girls /i, "").toUpperCase()}|${r.weight_class}|${norm(r.wrestler_name)}`, r]))
  const boysRows = rows.filter(r => !/^girls /i.test(r.classification) && r.classification !== "NCISA")
  const dups = boysRows.filter(r => girlKey.has(`${String(r.classification).toUpperCase()}|${r.weight_class}|${norm(r.wrestler_name)}`))
  // boys-classification rows at girls' weights with no girls twin: report, don't touch
  const orphans = boysRows.filter(r => !dups.includes(r) && ["100","107","114","235"].includes(String(r.weight_class)) )
  console.log("2026 rows", rows.length, "duplicates", dups.length, "placed among dups", dups.filter(d => Number(d.place) >= 1).length)
  console.log("by class", dups.reduce((m: any, d) => (m[d.classification] = (m[d.classification] || 0) + 1, m), {}))
  console.log("girls-weight rows in boys classes w/o twin", orphans.length, orphans.slice(0, 5).map(o => `${o.classification} ${o.weight_class} ${o.wrestler_name}`))
  // twin agreement checks
  let schoolDiff = 0, athleteDiff = 0; for (const d of dups) { const g = girlKey.get(`${String(d.classification).toUpperCase()}|${d.weight_class}|${norm(d.wrestler_name)}`)!; if (norm(g.school) !== norm(d.school)) schoolDiff++; if (d.athlete_id && g.athlete_id && d.athlete_id !== g.athlete_id) athleteDiff++ }
  console.log("school differs", schoolDiff, "athlete_id differs", athleteDiff, "dups with athlete_id", dups.filter(d => d.athlete_id).length)
  const ids = dups.map(d => d.id)
  const links: any[] = []; for (let i = 0; i < ids.length; i += 100) { const { data, error } = await sb.from("result_athlete_links").select("*").eq("source_table", "wrestling_nchsaa_results").in("source_id", ids.slice(i, i + 100).map(String)); if (error) { console.log("links err", error.message); break } links.push(...data!) }
  console.log("result_athlete_links pointing at dups", links.length)
  fs.writeFileSync("ranking-snapshots/nchsaa-2026-girls-duplicate-qualifiers-backup-2026-10-07.json", JSON.stringify({ rows: dups, links }, null, 1))
  const twinOf = new Map(dups.map(d => [String(d.id), girlKey.get(`${String(d.classification).toUpperCase()}|${d.weight_class}|${norm(d.wrestler_name)}`)!]))
  const twinIds = [...twinOf.values()].map(t => String(t.id))
  const twinLinks: any[] = []; for (let i = 0; i < twinIds.length; i += 100) { const { data } = await sb.from("result_athlete_links").select("source_id,athlete_id,status").eq("source_table", "wrestling_nchsaa_results").in("source_id", twinIds.slice(i, i + 100)); twinLinks.push(...data!) }
  const twinHas = new Set(twinLinks.map(l => `${l.source_id}|${l.athlete_id}`)); const twinAny = new Set(twinLinks.map(l => String(l.source_id)))
  const move = links.filter(l => !twinAny.has(String(twinOf.get(String(l.source_id))!.id)))
  const drop = links.filter(l => !move.includes(l))
  console.log("links: move to twin", move.length, "drop (twin already linked)", drop.length, "of which twin linked to SAME athlete", drop.filter(l => twinHas.has(`${twinOf.get(String(l.source_id))!.id}|${l.athlete_id}`)).length)
  console.log("link sample", JSON.stringify(links[0]))
  if (!process.argv.includes("--apply")) console.log("Dry run. Re-run with --apply.")
  if (process.argv.includes("--apply")) {
    for (const l of move) { const { error } = await sb.from("result_athlete_links").update({ source_id: String(twinOf.get(String(l.source_id))!.id) }).eq("id", l.id); if (error) throw error }
    for (let i = 0; i < drop.length; i += 100) { const { error } = await sb.from("result_athlete_links").delete().in("id", drop.slice(i, i + 100).map(l => l.id)); if (error) throw error }
    for (let i = 0; i < ids.length; i += 100) { const { error } = await sb.from("wrestling_nchsaa_results").delete().in("id", ids.slice(i, i + 100)); if (error) throw error }
    console.log("deleted", ids.length, "rows; moved", move.length, "links to the Girls row, dropped", drop.length)
  }
})()
