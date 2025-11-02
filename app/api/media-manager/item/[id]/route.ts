import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data, error } = await supabase.from("media_items").select("*").eq("id", id).single()

    if (error || !data) {
      return NextResponse.json({ error: "Media item not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Get item error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get item" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params
    const updates = await request.json()

    // Only allow certain fields to be updated
    const allowedFields = ["alt_text", "caption", "category", "entity_id", "entity_type", "is_active", "tags"]
    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase.from("media_items").update(filteredUpdates).eq("id", id).select().single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Media item updated successfully",
    })
  } catch (error) {
    console.error("Update API error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 500 })
  }
}
