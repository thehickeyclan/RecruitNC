import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({
        success: false,
        error: "ID is required",
      })
    }

    const supabase = createClient()

    // Soft delete - mark as inactive
    const { data, error } = await supabase
      .from("media_items")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Media item deleted successfully",
      data,
    })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    })
  }
}
