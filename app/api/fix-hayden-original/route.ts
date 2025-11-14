import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// This is the beginning of the original data URL that was uploaded
// We're using the part the user shared in their message
const ORIGINAL_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEHU..."

export async function GET() {
  try {
    const supabase = createClient()

    // First, let's check if we have the full data URL stored somewhere
    const { data: backups, error: backupError } = await supabase
      .from("image_backups")
      .select("original_url")
      .eq("athlete_id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
      .order("backup_date", { ascending: false })
      .limit(1)

    let originalUrl = null

    // If we have a backup, use it
    if (backups && backups.length > 0 && backups[0].original_url) {
      originalUrl = backups[0].original_url
    }
    // Otherwise, use a placeholder image
    else {
      originalUrl = "/wrestler-profile.png"
    }

    // Get Hayden's current record
    const { data: hayden, error: fetchError } = await supabase
      .from("athletes")
      .select("id, name, photourl")
      .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Update Hayden's record with the original URL
    const { error: updateError } = await supabase
      .from("athletes")
      .update({ photourl: originalUrl })
      .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's image has been updated",
      previous: {
        photourl_type: hayden.photourl?.startsWith("data:") ? "data URL" : "regular URL",
        photourl_preview: hayden.photourl?.substring(0, 50) + "...",
      },
      new: {
        photourl_type: originalUrl.startsWith("data:") ? "data URL" : "regular URL",
        photourl_preview: originalUrl.startsWith("data:") ? originalUrl.substring(0, 50) + "..." : originalUrl,
      },
    })
  } catch (error) {
    console.error("Error updating Hayden's image:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
