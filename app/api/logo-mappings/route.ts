import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeEntityName, normalizeEntityType } from "@/lib/logo-mappings-normalize"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const limit = Number.parseInt(searchParams.get("limit") || "1000") // Increased default limit

    const supabase = await createClient()

    let query = supabase.from("logo_mappings").select("*").order("entity_name", { ascending: true }) // Order by name for easier browsing

    if (entityType && entityType !== "all") {
      query = query.eq("entity_type", entityType)
    }

    if (limit > 0) {
      query = query.limit(limit)
    }

    const { data: mappings, error } = await query

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        mappings: [],
      })
    }

    return NextResponse.json({
      success: true,
      mappings: mappings || [],
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      mappings: [],
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entity_name, entity_type, logo_url, aliases, division } = body

    if (!entity_name || !entity_type || !logo_url) {
      return NextResponse.json(
        { success: false, error: "Entity name, type, and logo URL are required" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const canonicalName = normalizeEntityName(entity_name)
    const canonicalType = normalizeEntityType(entity_type)

    const { data, error } = await supabase
      .from("logo_mappings")
      .insert({
        entity_name: canonicalName,
        entity_type: canonicalType,
        logo_url,
        aliases: aliases || null,
        division: division || null,
      })
      .select()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, mapping: data?.[0] || data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
