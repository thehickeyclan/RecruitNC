import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    const supabase = createClient()

    // First check if table exists
    const { data: tableCheck, error: tableError } = await supabase.from("media_items").select("id").limit(1)

    if (tableError && tableError.code === "42P01") {
      return NextResponse.json({
        success: false,
        needsSetup: true,
        message: "Media items table does not exist",
        data: [],
      })
    }

    // Build query - fix the count issue by removing it
    let query = supabase.from("media_items").select("*").eq("is_active", true).order("created_at", { ascending: false })

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    if (search) {
      query = query.or(`original_name.ilike.%${search}%,filename.ilike.%${search}%`)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error("Search error:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        data: [],
      })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("Search exception:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
    })
  }
}
