import { createClient } from "@supabase/ssr"

async function debugLiamHickeyData() {
  console.log("[v0] Starting debug script for Liam Hickey NCHSAA data")

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get: () => null,
      set: () => {},
      remove: () => {},
    },
  })

  // Try different name variations
  const nameVariations = ["Liam Hickey", "Hickey, Liam", "liam hickey", "hickey, liam"]

  console.log("\n=== Searching NCHSAA Results ===")
  for (const name of nameVariations) {
    console.log(`\nTrying name variation: "${name}"`)

    const { data, error } = await supabase
      .from("wrestling_nchsaa_results")
      .select("*")
      .ilike("wrestler_name", `%${name}%`)
      .order("year", { ascending: false })

    if (error) {
      console.error("Error:", error.message)
      continue
    }

    if (data && data.length > 0) {
      console.log(`Found ${data.length} results:`)
      data.forEach((result) => {
        console.log(
          `  ${result.year} - ${result.wrestler_name} - ${result.school} - Place: ${result.place} - Weight: ${result.weight_class} - Division: ${result.classification}`,
        )
      })
    } else {
      console.log("No results found")
    }
  }

  // Also check for partial matches
  console.log("\n=== Checking for partial name matches (Hickey) ===")
  const { data: hickeyData, error: hickeyError } = await supabase
    .from("wrestling_nchsaa_results")
    .select("*")
    .ilike("wrestler_name", "%hickey%")
    .order("year", { ascending: false })

  if (hickeyError) {
    console.error("Error:", hickeyError.message)
  } else if (hickeyData && hickeyData.length > 0) {
    console.log(`Found ${hickeyData.length} results with "Hickey":`)
    hickeyData.forEach((result) => {
      console.log(
        `  ${result.year} - ${result.wrestler_name} - ${result.school} - Place: ${result.place} - Weight: ${result.weight_class} - Division: ${result.classification}`,
      )
    })
  } else {
    console.log("No results found with 'Hickey'")
  }

  // Check what years are available in the database
  console.log("\n=== Available years in NCHSAA database ===")
  const { data: yearsData, error: yearsError } = await supabase
    .from("wrestling_nchsaa_results")
    .select("year")
    .order("year", { ascending: false })

  if (yearsError) {
    console.error("Error:", yearsError.message)
  } else if (yearsData) {
    const uniqueYears = [...new Set(yearsData.map((r) => r.year))].sort((a, b) => b - a)
    console.log("Years available:", uniqueYears.join(", "))
  }

  console.log("\n=== Debug script complete ===")
}

debugLiamHickeyData()
