#!/usr/bin/env npx tsx
/**
 * Fargo women's freestyle bouts - the matches behind the placements.
 *
 * We held 515 bout-by-bout Fargo results and every one was a boys' bracket, so a girl's profile
 * showed "Fargo · Freestyle 2026, 3-2" with nothing under it when you opened the row. The summary
 * import gave us the row; this gives us the five matches behind Brianna Palmer's record.
 *
 * The files are winner/loser per bout. The table is athlete/opponent per wrestler, so a bout
 * becomes one row for each North Carolina wrestler in it - two rows when both are ours, which is
 * right: each of them has that match on their own record, one as a win and one as a loss.
 *
 * The event key carries no gender: fargo-2026-16u-fs is the same string for the boys' bracket.
 * That is the existing scheme and it is safe because bouts are only ever fetched by athlete_id,
 * and the summary row's key is built the same way - change it here and a girl's row would find no
 * matches at all.
 *
 *   npx tsx scripts/import-fargo-girls-bouts.ts          # dry run
 *   npx tsx scripts/import-fargo-girls-bouts.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

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
const FILES = [
  { file: "fargo-2025-nc-girls-freestyle-bouts.csv", year: 2025 },
  { file: "fargo-2026-nc-girls-freestyle-bouts.csv", year: 2026 },
]

function csv(file: string): Array<Record<string, string>> {
  const lines = fs.readFileSync(path.join(`${process.env.HOME}/Downloads`, file), "utf8").trim().split("\n")
  const cols = lines[0].split(",").map((c) => c.trim())
  return lines.slice(1).map((line) => {
    const vals: string[] = []
    let cur = "", q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === "," && !q) { vals.push(cur); cur = "" }
      else cur += ch
    }
    vals.push(cur)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => (row[c] = (vals[i] ?? "").trim()))
    return row
  })
}

const isNC = (s: string) => String(s ?? "").trim().toUpperCase() === "NC"

/** "16U Girls FS", "16U Girls", "JR Girls FS" → the key the summary row will look for. */
function eventKey(year: number, division: string): string {
  const d = division.toLowerCase()
  const age = /16u/.test(d) ? "16u" : "junior"
  const style = /\bgr\b|greco/.test(d) ? "gr" : "fs"
  return `fargo-${year}-${age}-${style}`
}
function eventName(year: number, division: string): string {
  const d = division.toLowerCase()
  const age = /16u/.test(d) ? "16U" : "Junior"
  const style = /\bgr\b|greco/.test(d) ? "Greco-Roman" : "Freestyle"
  return `${year} Fargo ${age} Women's ${style}`
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const { data: girlsRaw } = await sb
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .eq("gender", "Female")
  const girls = (girlsRaw ?? []) as Array<{ id: string; name: string }>

  const rows: Array<Record<string, unknown>> = []
  const toCreate = new Set<string>()
  const unmatched = new Map<string, number>()
  const ambiguous = new Set<string>()

  for (const { file, year } of FILES) {
    const bouts = csv(file)
    let order = 0
    for (const b of bouts) {
      order += 1
      /* One row per North Carolina wrestler in the bout — both when it is NC against NC. */
      for (const side of ["winner", "loser"] as const) {
        const name = b[`${side}_name`]
        if (!isNC(b[`${side}_state`])) continue
        const other = side === "winner" ? "loser" : "winner"

        const hits = girls.filter((g) => namesLikelySamePerson(g.name, name))
        if (hits.length > 1) { ambiguous.add(name); continue }
        /*
         * No profile? Make one. These are girls' brackets, so a North Carolina wrestler in them is
         * a North Carolina girl - there is nothing to infer and nothing to guess. Leaving her out
         * would discard a real result because we had not met her yet, which is how 306 girls came
         * to have state placements attached to nobody.
         */
        if (hits.length === 0) {
          unmatched.set(name, (unmatched.get(name) ?? 0) + 1)
          toCreate.add(name)
        }

        rows.push({
          event_key: eventKey(year, b.division),
          event_name: eventName(year, b.division),
          year,
          weight_class: b.weight || null,
          round: b.round || null,
          source_round: b.round || null,
          bout_order: order,
          athlete_name: name,
          athlete_id: hits[0]?.id ?? null,
          athlete_club: "NC",
          opponent_name: b[`${other}_name`] || null,
          opponent_club: b[`${other}_state`] || null,
          win: side === "winner",
          is_bye: /bye/i.test(b[`${other}_name`] ?? ""),
          win_type: b.result_type || null,
          /* The published line: "4-3" or a fall time, whichever the bracket gave. */
          score: [b.score, b.time].filter(Boolean).join(" ") || null,
          source_file: file,
          event_date: `${year}-07-15`,
        })
      }
    }
    console.log(`${file}: ${bouts.length} bouts read`)
  }

  const linked = rows.filter((r) => r.athlete_id)
  console.log(`\nwrestler-rows to insert: ${rows.length} · matched to a profile: ${linked.length} · unmatched: ${rows.length - linked.length}`)
  if (ambiguous.size) console.log(`ambiguous names, left unlinked: ${[...ambiguous].join(", ")}`)
  if (unmatched.size) {
    console.log(`\nNC girls in these brackets with no profile (${unmatched.size}):`)
    for (const [n, c] of [...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${String(c).padStart(2)}  ${n}`)
  }

  const byAthlete = new Map<string, number>()
  for (const r of linked) byAthlete.set(String(r.athlete_name), (byAthlete.get(String(r.athlete_name)) ?? 0) + 1)
  console.log(`\nmatches per wrestler:`)
  for (const [n, c] of [...byAthlete].sort((a, b) => b[1] - a[1])) console.log(`   ${String(c).padStart(2)}  ${n}`)

  if (toCreate.size) {
    console.log(`\nwould create ${toCreate.size} profiles for girls in these brackets we do not hold:`)
    for (const n of toCreate) console.log(`   ${n}`)
  }

  if (!WRITE) { console.log("\nRe-run with --write to insert."); return }

  /*
   * Create the missing wrestlers first, then re-resolve, so their bouts land on a profile in the
   * same run. School comes from their own state results where we have them; class year is left
   * for a human, and until it is set their Fargo rows will not display - getFargoFromTable needs
   * a class year to build its window.
   */
  for (const name of toCreate) {
    const last = name.split(" ").slice(-1)[0]
    const { data: st } = await sb
      .from("wrestling_nchsaa_results")
      .select("school, wrestler_name")
      .ilike("classification", "%girls%")
      .ilike("wrestler_name", `%${last}%`)
    const own = (st ?? []).find((r: any) => namesLikelySamePerson(String(r.wrestler_name), name))
    const { data: made, error } = await sb
      .from("athletes")
      .insert({
        name,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" "),
        gender: "Female",
        highschool: (own as any)?.school ?? null,
        is_nc_athlete: true,
      } as never)
      .select("id, name")
      .maybeSingle()
    if (error || !made) { console.error(`  could not create ${name}: ${error?.message}`); continue }
    girls.push(made as never)
    for (const r of rows) if (!r.athlete_id && r.athlete_name === name) r.athlete_id = (made as any).id
    console.log(`  created ${name}${(own as any)?.school ? ` (${(own as any).school})` : " — no school on file"}`)
  }

  /* Re-runnable: clear what this importer wrote before, never anyone else's rows. */
  for (const { file } of FILES) await sb.from("other_tournament_bouts").delete().eq("source_file", file)
  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from("other_tournament_bouts").insert(rows.slice(i, i + 200) as never)
    if (error) { console.error("FAILED:", error.message); break }
    inserted += rows.slice(i, i + 200).length
  }
  console.log(`\ninserted ${inserted}`)
}
main()
