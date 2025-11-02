import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dataUrlToBlob, uploadImage } from "@/lib/image-service"

export async function GET() {
  try {
    const supabase = createClient()

    // First, check if we have a backup of Hayden's original image
    const { data: backupData, error: backupError } = await supabase
      .from("image_backups")
      .select("original_url")
      .eq("athlete_id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
      .single()

    if (backupError && backupError.code !== "PGRST116") {
      return NextResponse.json({ error: backupError.message }, { status: 500 })
    }

    let originalDataUrl = null

    // If we have a backup, use it
    if (backupData?.original_url) {
      originalDataUrl = backupData.original_url
    } else {
      // Otherwise, check if the original data URL is still in the database
      const { data: hayden, error: haydenError } = await supabase
        .from("athletes")
        .select("photourl")
        .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
        .single()

      if (haydenError) {
        return NextResponse.json({ error: haydenError.message }, { status: 500 })
      }

      // If the current photourl is a data URL, use it
      if (hayden?.photourl?.startsWith("data:")) {
        originalDataUrl = hayden.photourl
      } else {
        return NextResponse.json(
          {
            error: "Original image not found in database or backups",
            current_url: hayden?.photourl || null,
          },
          { status: 404 },
        )
      }
    }

    // Convert data URL to blob and upload to Vercel Blob
    const blob = dataUrlToBlob(originalDataUrl)
    const url = await uploadImage(blob, "athlete", "hayden-haynes")

    // Update Hayden's record with the new URL
    const { error: updateError } = await supabase
      .from("athletes")
      .update({ photourl: url })
      .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's original image has been restored",
      new_url: url,
    })
  } catch (error) {
    console.error("Error restoring Hayden's image:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
