/**
 * Step one of wrestler identity: decide which profile each tournament result belongs to.
 *
 *   npx tsx scripts/identity/backfill-result-links.ts            dry run (default): read-only, prints rates
 *   npx tsx scripts/identity/backfill-result-links.ts --write    stores decisions in result_athlete_links
 *
 * Writes only to result_athlete_links. Never touches the source tables or their athlete_id columns,
 * and nothing on the site reads the link table yet - so a dry run, or a write, cannot change what
 * any page shows. See docs/scale/WRESTLER-IDENTITY-STEP-1.md.
 */
import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"
import {
  LINK_MATCHER_VERSION,
  buildNameIndex,
  decideLink,
  type AthleteForLink,
  type LinkDecision,
  type ResultRowForLink,
} from "../../lib/identity/result-athlete-link"

type Source = {
  table: string
  select: string
  map: (r: Record<string, any>) => ResultRowForLink
}

const SOURCES: Source[] = [
  { table: "wrestling_nchsaa_results", select: "id,wrestler_name,school,year,athlete_id",
    map: (r) => ({ name: r.wrestler_name, school: r.school, year: r.year, state: "NC", existingAthleteId: r.athlete_id }) },
  { table: "nhsca_placements", select: "id,athlete_name,high_school,year,division,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, division: r.division, state: r.state, existingAthleteId: r.athlete_id }) },
  { table: "wrestling_nhsca_results", select: "id,athlete_name,high_school,year,division,state",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, division: r.division, state: r.state }) },
  { table: "super32_results", select: "id,athlete_name,high_school,school,year,state",
    map: (r) => ({ name: r.athlete_name, school: r.high_school || r.school, year: r.year, state: r.state }) },
  { table: "fargo_results", select: "id,athlete_name,high_school,year,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, state: r.state, existingAthleteId: r.athlete_id }) },
  { table: "other_tournament_results", select: "id,athlete_name,high_school,year,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, state: r.state, existingAthleteId: r.athlete_id }) },
  { table: "national_rankings", select: "id,athlete_name,high_school,ranking_month,class_year,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.ranking_month ? Number(String(r.ranking_month).slice(0, 4)) : null, classYear: r.class_year, state: r.state, existingAthleteId: r.athlete_id }) },
]

async function all(admin: any, table: string, select: string) {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(select).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  const write = process.argv.includes("--write")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const athletes: AthleteForLink[] = (await all(admin, "athletes", "id,name,wrestling_name,graduationyear,highschool,state")).map((a) => ({
    id: a.id, name: a.name ?? "", wrestlingName: a.wrestling_name, graduationYear: a.graduationyear, highSchool: a.highschool, state: a.state,
  }))
  const find = buildNameIndex(athletes)
  const summary: Record<string, Record<string, number>> = {}
  const review: any[] = []
  const records: any[] = []

  for (const src of SOURCES) {
    const rows = await all(admin, src.table, src.select)
    const tally: Record<string, number> = { rows: rows.length }
    for (const r of rows) {
      const row = src.map(r)
      const d: LinkDecision = decideLink(row, find(row.name ?? ""))
      const key = d.status === "no_match" ? d.reason : d.status
      tally[key] = (tally[key] ?? 0) + 1
      if (d.status === "linked" && row.existingAthleteId) tally.existing_confirmed = (tally.existing_confirmed ?? 0) + 1
      if (d.status === "linked" && !row.existingAthleteId) tally.newly_linked = (tally.newly_linked ?? 0) + 1
      if (d.status === "review") review.push({ table: src.table, id: r.id, row, reason: d.reason, candidates: d.candidates })
      if (d.status !== "no_match") {
        records.push({
          source_table: src.table, source_id: r.id,
          athlete_id: d.status === "linked" ? d.athleteId : null,
          status: d.status, method: d.status === "linked" ? (row.existingAthleteId ? "existing" : "auto") : "auto",
          score: d.status === "linked" ? d.score : null, reason: d.reason,
          candidates: d.candidates, matcher_version: LINK_MATCHER_VERSION,
        })
      }
    }
    summary[src.table] = tally
  }

  console.table(summary)
  const out = process.env.OUT ?? "/tmp/result-links-dry-run.json"
  writeFileSync(out, JSON.stringify({ summary, review }, null, 1))
  console.log(`review list: ${review.length} rows -> ${out}`)

  if (!write) { console.log("dry run: nothing written"); return }
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await admin.from("result_athlete_links").upsert(records.slice(i, i + 500), { onConflict: "source_table,source_id", ignoreDuplicates: false })
    if (error) throw new Error(`write: ${error.message}`)
  }
  console.log(`wrote ${records.length} link decisions`)
}

main().catch((e) => { console.error(e); process.exit(1) })
