import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dataUrlToBlob, uploadImage } from "@/lib/image-service"

export async function GET() {
  try {
    const supabase = createClient()
    const results = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    }

    // Get all athletes with data URLs
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, photourl")
      .filter("photourl", "ilike", "data:%")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    results.total = athletes?.length || 0

    // Process each athlete
    for (const athlete of athletes || []) {
      try {
        if (!athlete.photourl || !athlete.photourl.startsWith("data:")) {
          results.skipped++
          results.details.push({
            id: athlete.id,
            name: athlete.name,
            status: "skipped",
            reason: "Not a data URL",
          })
          continue
        }

        // Create a backup
        await supabase.from("image_backups").insert({
          athlete_id: athlete.id,
          original_url: athlete.photourl,
          notes: "Automatic backup during migration to Blob storage",
        })

        // Convert data URL to blob and upload to Vercel Blob
        const blob = dataUrlToBlob(athlete.photourl)
        const url = await uploadImage(blob, "athlete", athlete.name)

        // Update athlete record
        const { error: updateError } = await supabase.from("athletes").update({ photourl: url }).eq("id", athlete.id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        results.migrated++
        results.details.push({
          id: athlete.id,
          name: athlete.name,
          status: "migrated",
          new_url: url,
        })
      } catch (err) {
        console.error(`Error processing athlete ${athlete.id}:`, err)
        results.errors++
        results.details.push({
          id: athlete.id,
          name: athlete.name,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. ${results.migrated} images migrated, ${results.skipped} skipped, ${results.errors} errors.`,
      results,
    })
  } catch (error) {
    console.error("Error during migration:", error)
    return NextResponse.json({ error: "An unexpected error occurred during migration" }, { status: 500 })
  }
}
