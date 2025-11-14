import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // First, get Hayden's current data
    const { data: haydenData, error: fetchError } = await supabase
      .from("athletes")
      .select("*")
      .eq("name", "Hayden Haynes")
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!haydenData) {
      return NextResponse.json({ error: "Hayden not found" }, { status: 404 })
    }

    // Check if photourl is a data URL
    const hasPhotoUrl = !!haydenData.photourl
    const isDataUrl = hasPhotoUrl && haydenData.photourl.startsWith("data:")
    const photoUrlLength = hasPhotoUrl ? haydenData.photourl.length : 0

    // Update to use a better default image
    const { data: updateData, error: updateError } = await supabase
      .from("athletes")
      .update({ photourl: "/wrestler-silhouette.png" })
      .eq("name", "Hayden Haynes")
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's image has been updated to use a better default image",
      previous: {
        has_photourl: hasPhotoUrl,
        photourl_type: isDataUrl ? "data URL" : "regular URL",
        photourl_length: photoUrlLength,
      },
      new: {
        photourl: updateData.photourl,
      },
    })
  } catch (error) {
    console.error("Error in fix-hayden API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
