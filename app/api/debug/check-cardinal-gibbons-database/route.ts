import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all Cardinal Gibbons entries
    const { data: cardinalGibbonsEntries, error: cardinalError } = await supabase
      .from("logo_mappings")
      .select("*")
      .ilike("entity_name", "%cardinal gibbons%")

    if (cardinalError) {
      console.error("Error fetching Cardinal Gibbons entries:", cardinalError)
    }

    // Get all unique entity types for high schools
    const { data: highSchoolTypes, error: typesError } = await supabase
      .from("logo_mappings")
      .select("entity_type")
      .ilike("entity_name", "%high school%")

    if (typesError) {
      console.error("Error fetching high school types:", typesError)
    }

    // Get unique entity types
    const uniqueTypes = [...new Set(highSchoolTypes?.map((item) => item.entity_type) || [])]

    // Get sample high school entries
    const { data: sampleHighSchools, error: sampleError } = await supabase
      .from("logo_mappings")
      .select("entity_name, entity_type, logo_url")
      .ilike("entity_name", "%high school%")
      .limit(10)

    if (sampleError) {
      console.error("Error fetching sample high schools:", sampleError)
    }

    return NextResponse.json({
      cardinalGibbonsEntries: cardinalGibbonsEntries || [],
      highSchoolTypes: uniqueTypes,
      sampleHighSchools: sampleHighSchools || [],
    })
  } catch (error) {
    console.error("Exception in check-cardinal-gibbons-database:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
