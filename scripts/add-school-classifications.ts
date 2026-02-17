/**
 * Add/update school classifications (NCHSAA 1A–8A)
 * Run: npx tsx scripts/add-school-classifications.ts
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const SCHOOLS: { school_name: string; classification: string }[] = [
  { school_name: "Uwharrie Charter", classification: "4A" },
  // Add more as needed
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL)")
    process.exit(1)
  }
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(url, key)
  for (const row of SCHOOLS) {
    const { error } = await supabase.from("school_classifications").upsert(row, {
      onConflict: "school_name",
    })
    if (error) console.error(`Failed ${row.school_name}:`, error.message)
    else console.log(`OK: ${row.school_name} → ${row.classification}`)
  }
}

main()
