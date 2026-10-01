/**
 * Decide which profile every tournament result belongs to, across the whole database.
 *
 *   npx tsx scripts/identity/backfill-result-links.ts            dry run (default): read-only, prints rates
 *   npx tsx scripts/identity/backfill-result-links.ts --write    stores decisions in result_athlete_links
 *
 * The same routine importers and the hourly cron run (lib/identity/link-results.ts), over every row.
 * Writes only to result_athlete_links and never rewrites a row a person reviewed.
 * See docs/scale/WRESTLER-IDENTITY-STEP-1.md.
 */
import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"
import { linkResults } from "../../lib/identity/link-results"

async function main() {
  const write = process.argv.includes("--write")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const result = await linkResults(admin, { dryRun: !write })
  console.table(result.summary)
  const out = process.env.OUT ?? "/tmp/result-links-dry-run.json"
  writeFileSync(out, JSON.stringify({ summary: result.summary, review: result.review }, null, 1))
  console.log(`review list: ${result.review.length} rows -> ${out}`)
  if (!write) {
    console.log("dry run: nothing written")
    return
  }
  console.log(`keeping ${result.keptReviewed} hand-reviewed decisions`)
  console.log(`wrote ${result.written} link decisions`)
  console.log(`removed ${result.removed} rows the current rules no longer link or queue`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
