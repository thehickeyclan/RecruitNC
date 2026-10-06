#!/usr/bin/env npx tsx
/**
 * Every state qualifier still in school with no class year, best credential first.
 *
 * The goal is a grad year for every state qualifier in the country. We will not finish 71,000 in
 * one pass, so the order decides when the work starts paying off — and collecting from state
 * ranking lists spread the effort evenly across ability, leaving a state champion barely better
 * covered than a wrestler who went 0-2. This inverts that: it starts from wrestlers we already
 * know hold a credential, so every lookup lands on someone a college coach might actually call.
 *
 * "Still in school" means seen in the 2025 season or later. A wrestler last seen in 2024 has
 * almost certainly graduated, and a class year for them changes nothing anyone will ask about.
 *
 *   npx tsx scripts/export-qualifiers-needing-grad-year.ts [--out <path>] [--gender F|M]
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
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const OUT = arg("out") ?? "ranking-snapshots/qualifiers-needing-grad-year.csv"
const ONLY = arg("gender")?.toUpperCase()
const g1 = (v: unknown) => (/^[fgw]/i.test(String(v ?? "").trim()) ? "F" : "M")
const csv = (v: unknown) => {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  const ids: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("athlete_identities")
      .select("canonical_name, first_name, last_name, state, gender, primary_school, graduation_year, last_seen_season, first_seen_season, evidence")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    ids.push(...((data ?? []) as Array<Record<string, unknown>>))
    if (!data || data.length < 1000) break
  }

  const places = (e: unknown) => (((e as { placements?: unknown[] })?.placements ?? []) as unknown[]).map(Number).filter((n) => n > 0)
  const rows = ids
    .filter((i) => !(Number(i.graduation_year) > 0))
    .filter((i) => Number(i.last_seen_season) >= 2025)
    .filter((i) => !ONLY || g1(i.gender) === ONLY)
    .map((i) => {
      const p = places(i.evidence)
      const best = p.length ? Math.min(...p) : null
      const weights = (((i.evidence as { weights?: unknown[] })?.weights ?? []) as unknown[]).map(String)
      return {
        name: i.canonical_name,
        state: i.state,
        gender: g1(i.gender) === "F" ? "Girls" : "Boys",
        school: i.primary_school,
        best_placement: best,
        /* Champions first: they are the wrestlers a coach asks about by name. */
        priority: best === 1 ? "1-state champion" : best && best <= 3 ? "2-top three" : best && best <= 8 ? "3-top eight" : "4-qualifier",
        weights: weights.join("/"),
        seasons: `${i.first_seen_season ?? ""}-${i.last_seen_season ?? ""}`,
      }
    })
    .sort((a, b) => a.priority.localeCompare(b.priority) || String(a.state).localeCompare(String(b.state)) || String(a.name).localeCompare(String(b.name)))

  const head = ["name", "state", "gender", "school", "best_placement", "priority", "weights", "seasons"]
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, [head.join(","), ...rows.map((r) => head.map((h) => csv((r as Record<string, unknown>)[h])).join(","))].join("\n") + "\n")

  const tally = new Map<string, number>()
  for (const r of rows) tally.set(`${r.priority} ${r.gender}`, (tally.get(`${r.priority} ${r.gender}`) ?? 0) + 1)
  console.log(`wrote ${rows.length} wrestlers to ${OUT}`)
  for (const [k, v] of [...tally].sort()) console.log(`   ${k.padEnd(26)} ${v}`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
