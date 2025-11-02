import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if media_items table exists
    const { data: mediaItems, error: mediaError } = await supabase.from("media_items").select("*").limit(5)

    // Check athletes table for comparison
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, image_url")
      .limit(5)

    return NextResponse.json({
      mediaItems: {
        success: !mediaError,
        error: mediaError?.message,
        data: mediaItems || [],
        count: mediaItems?.length || 0,
      },
      athletes: {
        success: !athletesError,
        error: athletesError?.message,
        data: athletes || [],
        count: athletes?.length || 0,
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
