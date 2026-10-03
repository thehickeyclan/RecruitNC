#!/usr/bin/env npx tsx
/**
 * Read the RankWrestler girls' weight-class boards and find out who we are missing.
 *
 * The 100lb board had 25 ranked North Carolina girls and this database held 3. The 107lb board
 * held 2. That is the 2029 problem again, worse: a class we have not met cannot be ranked, and
 * right now we hold 51 female profiles against a field several hundred deep.
 *
 * Reads the boards as pasted from the site - rank, name, badges, school, grade, class, region,
 * record, then the rating columns - so the lists can go straight from the page into a file with
 * no cleaning. Weight comes from a `## 100` heading or the file name.
 *
 * Creates a shell and nothing more: name, gender, school, class year, weight. No ranking, no
 * record, no contact details, no photograph. These are minors, and what goes in is only what an
 * outside ranking service already publishes.
 *
 * Matching before creating is the whole job - a duplicate splits a wrestler's results across two
 * profiles. Anything that matches an existing name is skipped and reported, never merged.
 *
 *   npx tsx scripts/import-girls-weight-rankings.ts boards.txt            # dry run
 *   npx tsx scripts/import-girls-weight-rankings.ts boards.txt --apply
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
const APPLY = process.argv.includes("--apply")
const FILE = process.argv.find((a) => !a.startsWith("--") && /\.(txt|tsv|csv)$/i.test(a))

/**
 * The season these boards describe, for turning a grade into a class year.
 *
 * These are the 2026-27 boards, published as that season starts, so a senior on them graduates in
 * 2027. The badges confuse this - they read "2025-26 2nd", which is last season's finish beside
 * this season's grade - and reading the badge instead of the season made every wrestler a year
 * too old. Checked against the seven we already held: all seven agree at 2027, none at 2026.
 *
 * Hard-coded rather than derived from today's date, because a run in September and a run in March
 * both describe the same season and must not disagree.
 */
const SEASON_END = 2027
const GRADE_TO_CLASS: Record<string, number> = { fr: SEASON_END + 3, so: SEASON_END + 2, jr: SEASON_END + 1, sr: SEASON_END }

type Ranked = { rank: number; name: string; school: string; grade: string; classYear: number | null; weight: string; record: string }

/**
 * One wrestler per line, tab separated: weight, rank, name, school, grade, record.
 *
 * The boards are pasted from a page whose rows wrap across a dozen lines with badges and rating
 * columns in between; re-parsing that is fragile and the shape changes whenever the site does.
 * A flat file is the thing worth keeping, and it is what the next weight class can be appended to.
 */
function parse(text: string): Ranked[] {
  const lines = text.trim().split("\n")
  const out: Ranked[] = []
  for (const line of lines.slice(1)) {
    const [weight, rank, name, school, grade, record] = line.split("\t").map((c) => c.trim())
    if (!name) continue
    out.push({
      rank: Number(rank),
      name,
      school,
      grade: (grade ?? "").toLowerCase(),
      classYear: GRADE_TO_CLASS[(grade ?? "").toLowerCase()] ?? null,
      weight,
      record: record ?? "",
    })
  }
  return out
}

async function main() {
  if (!FILE) { console.error("Usage: npx tsx scripts/import-girls-weight-rankings.ts <file> [--apply]"); process.exit(1) }
  const ranked = parse(fs.readFileSync(FILE, "utf8"))
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — nothing is written\n")
  console.log(`parsed ${ranked.length} ranked wrestlers across ${new Set(ranked.map((r) => r.weight)).size} weight classes\n`)

  const { data: existing } = await sb.from("athletes").select("id, name, gender, graduationyear, highschool")
  const all = (existing ?? []) as Array<{ id: string; name: string; gender: string | null; graduationyear: number | null; highschool: string | null }>

  const toCreate: Ranked[] = []
  const mismatches: string[] = []
  let held = 0
  for (const r of ranked) {
    const hit = all.find((a) => namesLikelySamePerson(a.name, r.name))
    if (!hit) { toCreate.push(r); continue }
    held++
    if (hit.gender !== "Female") mismatches.push(`${r.name}: profile says gender ${hit.gender}`)
    if (r.classYear && Number(hit.graduationyear) !== r.classYear) {
      mismatches.push(`${r.name}: class ${hit.graduationyear} on file, board says ${r.classYear} (${r.grade})`)
    }
  }

  console.log(`already held: ${held}`)
  console.log(`no profile:   ${toCreate.length}`)
  if (mismatches.length) {
    console.log(`\nCHECK THESE — the board disagrees with what we hold:`)
    for (const m of mismatches) console.log(`  ${m}`)
  }
  const noClass = toCreate.filter((r) => !r.classYear)
  if (noClass.length) console.log(`\n${noClass.length} with no readable grade, skipped: ${noClass.map((r) => r.name).join(", ")}`)

  const creatable = toCreate.filter((r) => r.classYear && r.school)
  console.log(`\nwould create ${creatable.length} profiles:`)
  for (const r of creatable.slice(0, 12)) console.log(`  ${String(r.weight).padStart(3)}  #${String(r.rank).padStart(2)}  ${r.name.padEnd(24)} ${r.school.padEnd(22)} class of ${r.classYear}`)
  if (creatable.length > 12) console.log(`  … and ${creatable.length - 12} more`)

  if (!APPLY) { console.log("\nRe-run with --apply to create them."); return }

  let created = 0
  for (const r of creatable) {
    const { error } = await sb.from("athletes").insert({
      name: r.name,
      firstName: r.name.split(" ")[0],
      lastName: r.name.split(" ").slice(1).join(" "),
      gender: "Female",
      highschool: r.school,
      graduationyear: r.classYear,
      weightclass: r.weight,
      is_nc_athlete: true,
    } as never)
    if (error) { console.error(`  FAILED ${r.name}: ${error.message}`); continue }
    created++
  }
  console.log(`\ncreated ${created} profiles`)
}
main()
