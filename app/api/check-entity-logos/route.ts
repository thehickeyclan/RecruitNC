import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { entities } = await request.json()
    console.log("check-entity-logos received:", entities)

    if (!entities || !Array.isArray(entities)) {
      console.error("Invalid entities data:", entities)
      return NextResponse.json({ error: "Invalid entities data" }, { status: 400 })
    }

    const supabase = createClient()
    const results = []

    for (const entity of entities) {
      try {
        console.log(`Checking logo for ${entity.name} (${entity.type})`)

        // Check if logo exists in logo_mappings table
        const { data: logoMapping, error } = await supabase
          .from("logo_mappings")
          .select("logo_url")
          .eq("entity_name", entity.name)
          .eq("entity_type", entity.type)
          .maybeSingle()

        console.log(`Logo check result for ${entity.name}:`, { logoMapping, error })

        // Only consider it exists if we have a valid logo_url
        const exists = !error && logoMapping && logoMapping.logo_url && logoMapping.logo_url.trim() !== ""

        results.push({
          name: entity.name,
          type: entity.type,
          exists: exists,
          logoUrl: exists ? logoMapping.logo_url : null,
        })

        console.log(`${entity.name} logo exists: ${exists}`)
      } catch (error) {
        console.error(`Error checking logo for ${entity.name}:`, error)
        // Assume logo doesn't exist if there's an error
        results.push({
          name: entity.name,
          type: entity.type,
          exists: false,
          logoUrl: null,
        })
      }
    }

    console.log("Final check-entity-logos results:", results)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error in check-entity-logos:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
