import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data, error } = await supabase.from("media_items").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching media item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params
    const body = await request.json()

    const { filename, original_name, category, entity_type, entity_name, alias, alt_text, caption, tags, metadata } =
      body

    const { data, error } = await supabase
      .from("media_items")
      .update({
        filename,
        original_name,
        category,
        entity_type,
        entity_name,
        alias,
        alt_text,
        caption,
        tags: tags || [],
        metadata: metadata || {},
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating media item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    // Check if media item is being used
    const { data: usage, error: usageError } = await supabase.from("media_usage").select("*").eq("media_id", id)

    if (usageError) {
      console.error("Error checking media usage:", usageError)
      return NextResponse.json({ error: usageError.message }, { status: 500 })
    }

    if (usage && usage.length > 0) {
      return NextResponse.json({ error: "Cannot delete media item that is currently in use" }, { status: 400 })
    }

    const { error } = await supabase.from("media_items").delete().eq("id", id)

    if (error) {
      console.error("Error deleting media item:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
