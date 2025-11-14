import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    console.log("=== TABLE CHECK START ===")

    // Try to query the table
    const { data, error } = await supabase.from("media_items").select("id").limit(1)

    if (error) {
      console.error("Table check error:", error.message)

      if (error.message.includes("does not exist") || error.code === "42P01") {
        return NextResponse.json({
          exists: false,
          error: "Table does not exist",
          needsCreation: true,
        })
      }

      return NextResponse.json({
        exists: false,
        error: error.message,
      })
    }

    console.log("=== TABLE EXISTS ===")
    return NextResponse.json({
      exists: true,
      message: "Table exists and is accessible",
    })
  } catch (error) {
    console.error("Table check exception:", error)
    return NextResponse.json({
      exists: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
