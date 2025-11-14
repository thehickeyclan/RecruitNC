import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get("category")
    const entityType = searchParams.get("entity_type")
    const search = searchParams.get("search")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = supabase
      .from("media_items")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (category) {
      query = query.eq("category", category)
    }

    if (entityType) {
      query = query.eq("entity_type", entityType)
    }

    if (search) {
      query = query.or(
        `filename.ilike.%${search}%,original_name.ilike.%${search}%,entity_name.ilike.%${search}%,alias.ilike.%${search}%`,
      )
    }

    if (tags && tags.length > 0) {
      query = query.overlaps("tags", tags)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching media items:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      filename,
      original_name,
      url,
      category,
      entity_type,
      entity_name,
      alias,
      alt_text,
      caption,
      tags,
      mime_type,
      size_bytes,
      metadata,
    } = body

    const { data, error } = await supabase
      .from("media_items")
      .insert({
        filename,
        original_name,
        url,
        category,
        entity_type,
        entity_name,
        alias,
        alt_text,
        caption,
        tags: tags || [],
        mime_type,
        size_bytes,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating media item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
