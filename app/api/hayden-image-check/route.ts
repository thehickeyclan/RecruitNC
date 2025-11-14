import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createClient()

    // Get Hayden's record
    const { data: hayden, error } = await supabase
      .from("athletes")
      .select("id, name, photourl")
      .eq("name", "Hayden Haynes")
      .single()

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Error fetching Hayden's record",
          error: error.message,
        },
        { status: 500 },
      )
    }

    if (!hayden) {
      return NextResponse.json(
        {
          success: false,
          message: "Hayden not found",
        },
        { status: 404 },
      )
    }

    // Check the type of image URL
    const isDataUrl = hayden.photourl?.startsWith("data:")
    const isRegularUrl = hayden.photourl?.startsWith("/") || hayden.photourl?.startsWith("http")

    return NextResponse.json({
      success: true,
      athlete: {
        id: hayden.id,
        name: hayden.name,
      },
      image: {
        url: hayden.photourl,
        type: isDataUrl ? "data URL" : isRegularUrl ? "regular URL" : "unknown",
        preview: hayden.photourl?.substring(0, 50) + "...",
      },
    })
  } catch (error) {
    console.error("Error checking Hayden's image:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
