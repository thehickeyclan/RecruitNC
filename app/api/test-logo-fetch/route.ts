import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get("type")
  const entityName = searchParams.get("name")

  if (!entityType || !entityName) {
    return NextResponse.json(
      {
        error: "Missing type or name parameter",
      },
      { status: 400 },
    )
  }

  try {
    console.log(`Fetching logo for ${entityType}: ${entityName}`)

    const { data, error } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", entityType)
      .ilike("entity_name", `%${entityName}%`)
      .limit(1)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        logo_url: data[0].logo_url,
        entity_name: data[0].entity_name,
        match_type: "exact",
      })
    }

    // Try fuzzy matching
    const { data: fuzzyData, error: fuzzyError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", entityType)
      .limit(10)

    if (fuzzyError) {
      console.error("Fuzzy search error:", fuzzyError)
    }

    if (fuzzyData && fuzzyData.length > 0) {
      // Simple fuzzy matching logic
      const searchTerms = entityName.toLowerCase().split(" ")
      const matches = fuzzyData.filter((item) => {
        const itemName = item.entity_name.toLowerCase()
        return searchTerms.some((term) => itemName.includes(term))
      })

      if (matches.length > 0) {
        return NextResponse.json({
          success: true,
          logo_url: matches[0].logo_url,
          entity_name: matches[0].entity_name,
          match_type: "fuzzy",
        })
      }
    }

    return NextResponse.json({
      success: false,
      message: "No logo found",
      searched_for: entityName,
      entity_type: entityType,
    })
  } catch (error) {
    console.error("Error fetching logo:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
