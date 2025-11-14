import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dataUrlToBlob, uploadImage } from "@/lib/image-service"

export async function GET() {
  try {
    const supabase = createClient()

    // Get Hayden's record to check if we have the original data URL
    const { data: hayden, error: haydenError } = await supabase
      .from("athletes")
      .select("id, name, photourl")
      .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
      .single()

    if (haydenError) {
      return NextResponse.json({ error: haydenError.message }, { status: 500 })
    }

    // Check if we have a backup of the original data URL
    const { data: backup, error: backupError } = await supabase
      .from("image_backups")
      .select("original_url")
      .eq("athlete_id", hayden.id)
      .order("backup_date", { ascending: false })
      .limit(1)
      .single()

    // If we have a backup, use it
    let originalDataUrl = backup?.original_url

    // If no backup but the current photourl is a data URL, use it
    if (!originalDataUrl && hayden.photourl?.startsWith("data:")) {
      originalDataUrl = hayden.photourl

      // Create a backup of this data URL
      await supabase.from("image_backups").insert({
        athlete_id: hayden.id,
        original_url: hayden.photourl,
        notes: "Automatic backup before conversion to Blob storage",
      })
    }

    // If we don't have the original data URL, return an error
    if (!originalDataUrl) {
      return NextResponse.json(
        {
          error: "Original image data not found",
          current_url: hayden.photourl,
        },
        { status: 404 },
      )
    }

    // Convert data URL to blob and upload to Vercel Blob
    const blob = dataUrlToBlob(originalDataUrl)
    const url = await uploadImage(blob, "athlete", hayden.name)

    // Update Hayden's record with the new URL
    const { error: updateError } = await supabase.from("athletes").update({ photourl: url }).eq("id", hayden.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's original image has been restored and uploaded to Blob storage",
      previous_url: hayden.photourl,
      new_url: url,
    })
  } catch (error) {
    console.error("Error restoring Hayden's image:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
