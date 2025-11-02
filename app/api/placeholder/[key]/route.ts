import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const supabase = createClient()

    // Check if we have a custom placeholder in media manager
    const { data, error } = await supabase
      .from("media_items")
      .select("url")
      .eq("category", "placeholder")
      .eq("name", params.key)
      .single()

    if (error || !data) {
      return NextResponse.json({
        success: false,
        error: "Placeholder not found in media manager",
      })
    }

    return NextResponse.json({
      success: true,
      url: data.url,
    })
  } catch (error) {
    console.error("Error fetching placeholder:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
