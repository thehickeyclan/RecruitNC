/**
 * Turns a pasted RankWrestler class listing into an idempotent upsert.
 *
 *   npx tsx scripts/import-rankwrestler.ts <paste-file> <classYear> [edition-YYYY-MM-DD]
 *
 * Same loop as the GoFan coach tickets: Matt pastes, this writes the SQL, nobody transcribes a
 * rank by eye. Athletes are matched by name and school so a rank lands on the right wrestler —
 * unmatched rows still import, and the board simply shows no outside number for them.
 */
import { readFileSync } from "fs"
import { parseRankWrestlerPaste } from "@/lib/rankwrestler-import"

const [file, classYearRaw, editionRaw] = process.argv.slice(2)
if (!file || !classYearRaw) {
  console.error("usage: npx tsx scripts/import-rankwrestler.ts <paste-file> <classYear> [edition-YYYY-MM-DD]")
  process.exit(1)
}
const classYear = Number(classYearRaw)
if (!Number.isInteger(classYear)) {
  console.error(`"${classYearRaw}" is not a class year.`)
  process.exit(1)
}
const edition = editionRaw ?? new Date().toISOString().slice(0, 10)

const rows = parseRankWrestlerPaste(readFileSync(file, "utf8"))
if (!rows.length) {
  console.error("No wrestlers found in that paste.")
  process.exit(1)
}

const q = (v: string | null) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`)

console.log(`-- RankWrestler, Class of ${classYear}, edition ${edition}: ${rows.length} wrestlers`)
console.log(`insert into public.rankwrestler_rankings
  (class_year, edition, rank, wrestler_name, school, weight_class, grade, classification, region, record, notes)
values`)
console.log(
  rows
    .map(
      (r) =>
        `  (${classYear}, '${edition}'::date, ${r.rank}, ${q(r.wrestlerName)}, ${q(r.school)}, ${q(r.weightClass)}, ` +
        `${q(r.grade)}, ${q(r.classification)}, ${q(r.region)}, ${q(r.record)}, ${q(r.notes.join(" · ") || null)})`,
    )
    .join(",\n"),
)
console.log(`on conflict (class_year, edition, wrestler_name) do update set
  rank           = excluded.rank,
  school         = excluded.school,
  weight_class   = excluded.weight_class,
  grade          = excluded.grade,
  classification = excluded.classification,
  region         = excluded.region,
  record         = excluded.record,
  notes          = excluded.notes,
  updated_at     = now();`)

// Link to profiles by name, then by name and school where the name alone is ambiguous.
console.log(`
-- Attach each rank to a profile. Name and class must both agree; school breaks a tie.
update public.rankwrestler_rankings r
   set athlete_id = a.id
  from public.athletes a
 where r.athlete_id is null
   and r.class_year = ${classYear}
   and r.edition = '${edition}'::date
   and a.graduationyear = r.class_year
   and lower(btrim(a.name)) = lower(btrim(r.wrestler_name));`)
