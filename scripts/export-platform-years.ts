#!/usr/bin/env npx tsx
/**
 * What class years the platform already holds, per state, for Muse to diff against before a pass.
 *
 *   npx tsx --env-file=.env.local scripts/export-platform-years.ts --out ~/Downloads/for-muse
 *
 * Her words, asked for directly and then named as the single biggest lever on her side: "I keep
 * building against my files while the platform holds years no local file has — VA's qualifier
 * queue was 1,209 from my side and 514 from yours. A platform export at the START of each state's
 * pass deletes most of that waste before it starts."
 *
 * Every entrant row: name, school, gender, season, placed or not, and the year we hold if we hold
 * one. She drops the ones we have already answered and queues only the rest, which is what turns
 * a 1,209-key RankWrestlers queue - serialized, the slowest resource either of us has - into a
 * 514-key one.
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"
import { HOME_STATE } from "@/lib/recruiting/states"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null)
const OUT = arg("--out") ?? path.join(process.env.HOME ?? ".", "Downloads", "for-muse")
const ONLY = arg("--state")?.toUpperCase() ?? null

const csv = (v: unknown) => {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const states = RECRUITING_BRAND.states.filter((s: any) => s.code !== HOME_STATE && (!ONLY || s.code === ONLY))
  const summary: string[] = ["| State | Entrant rows | We hold a year | Still blank |", "|---|---|---|---|"]
  for (const s of states as any[]) {
    const rows: any[] = []
    let after: string | null = null
    for (;;) {
      let q = sb
        .from("state_tournament_placers")
        .select("id,season,place,wrestler_name,school_clean,school_raw,gender,grad_year")
        .eq("state", s.code)
        .order("id", { ascending: true })
        .limit(1000)
      if (after) q = q.gt("id", after)
      const { data, error } = await q
      if (error) throw new Error(`${s.code}: ${error.message}`)
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
      after = String(data[data.length - 1]!.id)
    }
    if (!rows.length) continue
    const lines = ["wrestler_name,school,gender,season,placed,platform_class_year"]
    for (const r of rows) {
      lines.push(
        [csv(r.wrestler_name), csv(r.school_clean ?? r.school_raw), csv(r.gender), r.season, r.place != null ? "yes" : "no", r.grad_year ?? ""].join(","),
      )
    }
    fs.writeFileSync(path.join(OUT, `${s.code}-platform-years.csv`), lines.join("\n") + "\n")
    const held = rows.filter((r) => r.grad_year).length
    summary.push(`| ${s.code} | ${rows.length} | ${held} | ${rows.length - held} |`)
    process.stderr.write(`  ${s.code} ${rows.length}\r`)
  }
  const note = [
    "# What the platform already holds — per state",
    "",
    `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} by scripts/export-platform-years.ts.`,
    "",
    "One CSV per state, every entrant row we hold: name, school, gender, season, whether they",
    "placed, and our class year where we have one. Diff against this at the START of a pass and",
    "queue only the blanks — it is what turns Virginia's 1,209-key queue into 514.",
    "",
    "Regenerated on request; ask and it will be current.",
    "",
    ...summary,
    "",
  ].join("\n")
  fs.writeFileSync(path.join(OUT, "PLATFORM-YEARS.md"), note)
  console.log(`\nwrote ${states.length} state file(s) + PLATFORM-YEARS.md to ${OUT}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
