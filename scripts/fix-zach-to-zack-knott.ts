/**
 * Script to correct "Zach Knott" → "Zack Knott" across the database.
 * Ensures name consistency so Data Dawg and College Recruiting Guide find Super32/NHSCA results.
 *
 * Usage:
 *   npx tsx scripts/fix-zach-to-zack-knott.ts
 *
 *   # Dry run (no writes):
 *   npx tsx scripts/fix-zach-to-zack-knott.ts --dry-run
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CORRECT_NAME = "Zack Knott"

async function fixAthletes(dryRun: boolean) {
  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, name, wrestling_name")
    .or("name.ilike.%Zach Knott%,wrestling_name.ilike.%Zach Knott%")

  if (error) {
    console.error("Error fetching athletes:", error)
    return
  }

  if (!athletes?.length) {
    console.log("No athletes found with 'Zach Knott'. Nothing to fix.")
    return
  }

  console.log(`Found ${athletes.length} athlete(s) to fix:`)
  athletes.forEach((a) => console.log(`  - ${a.name} (wrestling_name: ${a.wrestling_name || "(none)"})`))

  if (dryRun) {
    console.log("\n[DRY RUN] Would update to name/wrestling_name = 'Zack Knott'. Run without --dry-run to apply.")
    return
  }

  for (const a of athletes) {
    const { error: upd } = await supabase
      .from("athletes")
      .update({ name: CORRECT_NAME, wrestling_name: CORRECT_NAME })
      .eq("id", a.id)

    if (upd) {
      console.error(`Failed to update ${a.name}:`, upd)
    } else {
      console.log(`Updated: ${a.name} → ${CORRECT_NAME}`)
    }
  }
}

async function fixSuper32(dryRun: boolean) {
  const { data: rows, error } = await supabase
    .from("super32_results")
    .select("id, athlete_name")
    .ilike("athlete_name", "%Zach Knott%")

  if (error || !rows?.length) return

  console.log(`\nFound ${rows.length} super32_results row(s) with 'Zach Knott'`)
  if (dryRun) {
    console.log("[DRY RUN] Would update to athlete_name = 'Zack Knott'")
    return
  }

  for (const r of rows) {
    const { error: upd } = await supabase
      .from("super32_results")
      .update({ athlete_name: CORRECT_NAME })
      .eq("id", r.id)
    if (upd) console.error(`Failed super32 update:`, upd)
    else console.log(`Updated super32_results: ${r.athlete_name} → ${CORRECT_NAME}`)
  }
}

async function fixNHSCA(dryRun: boolean) {
  for (const table of ["nhsca_placements", "wrestling_nhsca_results"]) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("id, athlete_name")
      .ilike("athlete_name", "%Zach Knott%")

    if (error || !rows?.length) continue

    console.log(`\nFound ${rows.length} ${table} row(s) with 'Zach Knott'`)
    if (dryRun) {
      console.log(`[DRY RUN] Would update to athlete_name = 'Zack Knott'`)
      continue
    }

    for (const r of rows) {
      const { error: upd } = await supabase
        .from(table)
        .update({ athlete_name: CORRECT_NAME })
        .eq("id", r.id)
      if (upd) console.error(`Failed ${table} update:`, upd)
      else console.log(`Updated ${table}: ${r.athlete_name} → ${CORRECT_NAME}`)
    }
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  if (dryRun) console.log("Running in DRY RUN mode (no changes will be made)\n")

  await fixAthletes(dryRun)
  await fixSuper32(dryRun)
  await fixNHSCA(dryRun)

  console.log("\nDone.")
}

main().catch(console.error)
