import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Find the first media item to test with
    const { data: items, error: fetchError } = await supabase
      .from("media_items")
      .select("*")
      .eq("is_active", true)
      .limit(1)

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch test item: ${fetchError.message}`,
      })
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No media items found to test with",
      })
    }

    const testItem = items[0]
    const originalRecord = { ...testItem }

    // Update the item with a new name
    const newName = `Updated Test Name ${Date.now()}`
    const { data: updated, error: updateError } = await supabase
      .from("media_items")
      .update({
        original_name: newName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", testItem.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: `Update failed: ${updateError.message}`,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Media manager update test successful!",
      action: "updated",
      originalRecord,
      updatedRecord: updated,
    })
  } catch (error) {
    console.error("Test update error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
