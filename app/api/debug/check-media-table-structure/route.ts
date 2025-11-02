import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Try to query the table to see if it exists
    const { data, error } = await supabase.from("media_items").select("*").limit(1)

    if (error && error.message.includes("does not exist")) {
      return NextResponse.json({
        status: "MISSING",
        error: "Table likely doesn't exist: " + error.message,
        columns: [],
      })
    }

    // If we got here, the table exists, so let's get its columns
    const { data: columnsData, error: columnsError } = await supabase.rpc("get_table_columns", {
      table_name: "media_items",
    })

    if (columnsError) {
      return NextResponse.json({
        status: "ERROR",
        error: "Failed to get columns: " + columnsError.message,
        columns: [],
      })
    }

    return NextResponse.json({
      status: "OK",
      columns: columnsData || [],
    })
  } catch (error) {
    console.error("Error checking media table structure:", error)
    return NextResponse.json({
      status: "ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
      columns: [],
    })
  }
}
