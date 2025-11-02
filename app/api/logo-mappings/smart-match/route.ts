import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { entityName, entityType } = await request.json()

    if (!entityName || !entityType) {
      return NextResponse.json({ success: false, error: "Missing entityName or entityType" })
    }

    const supabase = createClient()

    // First try exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from("logo_mappings")
      .select("logo_url, entity_name")
      .eq("entity_type", entityType)
      .ilike("entity_name", entityName)
      .maybeSingle()

    if (!exactError && exactMatch?.logo_url) {
      return NextResponse.json({
        success: true,
        logoUrl: exactMatch.logo_url,
        matchInfo: {
          confidence: 100,
          matchType: "exact",
          originalQuery: entityName,
          matchedName: exactMatch.entity_name,
        },
      })
    }

    // Try fuzzy matching with LIKE
    const { data: fuzzyMatches, error: fuzzyError } = await supabase
      .from("logo_mappings")
      .select("logo_url, entity_name")
      .eq("entity_type", entityType)
      .or(`entity_name.ilike.%${entityName}%,entity_name.ilike.%${entityName.split(" ")[0]}%`)
      .limit(1)

    if (!fuzzyError && fuzzyMatches && fuzzyMatches.length > 0) {
      return NextResponse.json({
        success: true,
        logoUrl: fuzzyMatches[0].logo_url,
        matchInfo: {
          confidence: 75,
          matchType: "fuzzy",
          originalQuery: entityName,
          matchedName: fuzzyMatches[0].entity_name,
        },
      })
    }

    // No match found
    return NextResponse.json({
      success: false,
      error: "No logo found",
      logoUrl: null,
    })
  } catch (error) {
    console.error("Smart match error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" })
  }
}
