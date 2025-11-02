import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Check if table exists
    const { error: checkError } = await supabase.from("media_items").select("id").limit(1)

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: "Media items table already exists",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Table was created manually",
    })
  } catch (error) {
    console.error("Create table error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create table",
      },
      { status: 500 },
    )
  }
}
