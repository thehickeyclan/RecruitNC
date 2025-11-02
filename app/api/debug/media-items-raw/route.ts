import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    console.log("Attempting to query media_items table...")

    // Try to query the table directly - if it doesn't exist, we'll get an error
    const { data, error, count } = await supabase
      .from("media_items")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Supabase query error:", error)

      // Check for table doesn't exist errors
      if (
        error.code === "42P01" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("relation") ||
        error.details?.includes("does not exist")
      ) {
        console.log("Table does not exist - returning setup needed response")
        return NextResponse.json({
          success: false,
          tableExists: false,
          error: "The media_items table does not exist in your database",
          data: [],
          count: 0,
          needsSetup: true,
          setupMessage: "Click 'Create Table' to set up the database table",
        })
      }

      // Other database errors
      return NextResponse.json({
        success: false,
        tableExists: true,
        error: `Database error: ${error.message} (Code: ${error.code})`,
        data: [],
        count: 0,
        details: error.details || "No additional details",
      })
    }

    // Success - table exists and query worked
    console.log(`Successfully queried media_items table, found ${count} items`)

    return NextResponse.json({
      success: true,
      tableExists: true,
      data: data || [],
      count: count || 0,
      message: `Successfully loaded ${count || 0} media items`,
    })
  } catch (error) {
    console.error("Unexpected error in media-items-raw:", error)

    // Handle any other unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    // Check if the error message indicates table doesn't exist
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
      return NextResponse.json({
        success: false,
        tableExists: false,
        error: "Table does not exist",
        data: [],
        count: 0,
        needsSetup: true,
        setupMessage: "The media_items table needs to be created",
      })
    }

    return NextResponse.json({
      success: false,
      tableExists: false,
      error: `Unexpected error: ${errorMessage}`,
      data: [],
      count: 0,
      needsSetup: true,
    })
  }
}
