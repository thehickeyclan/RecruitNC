import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { type: string; name: string } }) {
  try {
    const { type, name } = params

    // Decode the URL-encoded name
    const decodedName = decodeURIComponent(name)

    const supabase = await createClient()

    // Normalize the entity type to match your database exactly
    let normalizedType = type.toLowerCase()
    if (normalizedType === "high_school" || normalizedType === "high-school") {
      normalizedType = "highschool"
    }
    if (normalizedType === "colleges") {
      normalizedType = "college"
    }
    if (normalizedType === "clubs") {
      normalizedType = "club"
    }

    // Try exact match first
    const { data: exactMatch, error: exactError } = await supabase
      .from("logo_mappings")
      .select("*")
      .eq("entity_type", normalizedType)
      .ilike("entity_name", decodedName)
      .maybeSingle()

    if (!exactError && exactMatch) {
      return NextResponse.json({
        success: true,
        logo_url: exactMatch.logo_url,
        entity_name: exactMatch.entity_name,
        matched_entity_type: exactMatch.entity_type,
        match_type: "exact",
      })
    }

    // Try partial match with various patterns
    const searchPatterns = [
      `%${decodedName}%`,
      `%${decodedName.replace(/\s+/g, "%")}%`,
      `${decodedName}%`,
      `%${decodedName}`,
    ]

    for (const pattern of searchPatterns) {
      const { data: partialMatches, error: partialError } = await supabase
        .from("logo_mappings")
        .select("*")
        .eq("entity_type", normalizedType)
        .ilike("entity_name", pattern)
        .limit(5)

      if (!partialError && partialMatches && partialMatches.length > 0) {
        const bestMatch = partialMatches[0]
        return NextResponse.json({
          success: true,
          logo_url: bestMatch.logo_url,
          entity_name: bestMatch.entity_name,
          matched_entity_type: bestMatch.entity_type,
          match_type: "partial",
          search_pattern: pattern,
          all_partial_matches: partialMatches.map((m) => m.entity_name),
        })
      }
    }

    // Get debugging info
    const { data: allEntries } = await supabase
      .from("logo_mappings")
      .select("entity_name, entity_type")
      .eq("entity_type", normalizedType)
      .limit(20)

    const { data: allTypes } = await supabase.from("logo_mappings").select("entity_type").limit(100)

    const availableTypes = [...new Set(allTypes?.map((t) => t.entity_type) || [])]
    const sampleNames = allEntries?.map((e) => e.entity_name) || []

    return NextResponse.json({
      success: false,
      error: `No logo found for ${normalizedType}: ${decodedName}`,
      searched_type: normalizedType,
      searched_name: decodedName,
      raw_name: name,
      available_entity_types: availableTypes,
      sample_names_for_type: sampleNames,
      tried_patterns: searchPatterns,
    })
  } catch (error) {
    console.error("❌ Logo API: Database error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
