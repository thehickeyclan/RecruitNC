import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { id, name } = await request.json()

    console.log("=== UPDATE NAME REQUEST ===")
    console.log("ID:", id)
    console.log("Name:", name)

    if (!id || !name) {
      return NextResponse.json({
        success: false,
        error: "ID and name are required",
      })
    }

    const supabase = createClient()

    // Update the record
    const { data, error } = await supabase
      .from("media_items")
      .update({
        original_name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update error:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    console.log("=== UPDATE SUCCESS ===")
    console.log("Updated data:", data)

    return NextResponse.json({
      success: true,
      message: "Name updated successfully",
      data: data,
    })
  } catch (error) {
    console.error("Update exception:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
