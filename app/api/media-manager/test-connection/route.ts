import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Test basic connection
    const { data, error } = await supabase.from("media_items").select("count(*)").limit(1)

    if (error && error.code === "42P01") {
      return NextResponse.json({
        success: true,
        message: "Database connection successful, but media_items table does not exist",
        tableExists: false,
        needsSetup: true,
      })
    }

    if (error) {
      return NextResponse.json({
        success: false,
        message: "Database connection failed",
        error: error.message,
        tableExists: false,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Database connection and table access successful",
      tableExists: true,
      needsSetup: false,
    })
  } catch (error) {
    console.error("Connection test error:", error)
    return NextResponse.json({
      success: false,
      message: "Connection test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      tableExists: false,
    })
  }
}
