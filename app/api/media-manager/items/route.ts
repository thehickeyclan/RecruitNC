import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const entityType = searchParams.get("entityType")
    const entityName = searchParams.get("entityName")
    const limit = Number.parseInt(searchParams.get("limit") || "1000") // Increased limit to show all logos
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("[v0] Loading media items from database...")
    const supabase = await createClient()

    let mediaItems = []
    let mediaError = null

    try {
      let query = supabase
        .from("media_items")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (category && category !== "all") {
        query = query.eq("category", category)
      }

      if (entityType) {
        query = query.eq("entity_type", entityType)
      }

      if (entityName) {
        query = query.eq("entity_name", entityName)
      }

      const result = await query
      mediaItems = result.data || []
      mediaError = result.error
    } catch (err) {
      console.log("[v0] media_items table might not exist, skipping:", err)
      mediaItems = []
    }

    // Get all logo mappings
    const { data: logoMappings, error: logoError } = await supabase
      .from("logo_mappings")
      .select("*")
      .order("created_at", { ascending: false })

    if (logoError) {
      console.error("[v0] Logo mappings error:", logoError)
      return NextResponse.json({
        success: false,
        error: logoError.message,
        data: [],
      })
    }

    console.log("[v0] Loaded data:", {
      mediaItems: mediaItems?.length || 0,
      logoMappings: logoMappings?.length || 0,
    })

    // Combine both into a unified format
    const allItems = []

    // Add media items
    if (mediaItems && mediaItems.length > 0) {
      mediaItems.forEach((item) => {
        allItems.push({
          id: item.id,
          entity_name: item.original_name || item.filename || "Unnamed",
          entity_type: item.category || "media",
          logo_url: item.url,
          created_at: item.created_at,
          updated_at: item.updated_at,
          source: "media_items",
        })
      })
    }

    // Add logo mappings
    if (logoMappings && logoMappings.length > 0) {
      logoMappings.forEach((logo) => {
        allItems.push({
          id: logo.id,
          entity_name: logo.entity_name,
          entity_type: logo.entity_type,
          logo_url: logo.logo_url,
          created_at: logo.created_at,
          updated_at: logo.updated_at,
          source: "logo_mappings",
        })
      })
    }

    // Apply limit and offset to the combined items
    const paginatedItems = allItems.slice(offset, offset + limit)

    console.log("[v0] Successfully loaded", paginatedItems.length, "media items out of", allItems.length, "total")

    return NextResponse.json({
      success: true,
      data: paginatedItems,
      stats: {
        total: allItems.length,
        media_items: mediaItems?.length || 0,
        logo_mappings: logoMappings?.length || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Get items error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    })
  }
}
