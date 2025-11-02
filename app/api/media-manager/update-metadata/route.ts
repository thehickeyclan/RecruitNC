import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url, collegeName, division, entityName, altText, caption, category } = body

    console.log("=== UPDATING MEDIA METADATA ===")
    console.log("URL:", url)
    console.log("College Name:", collegeName)
    console.log("Division:", division)
    console.log("Entity Name:", entityName)
    console.log("Alt Text:", altText)
    console.log("Caption:", caption)
    console.log("Category:", category)

    const supabase = createClient()

    // First, update or create the college division mapping
    if (collegeName && division) {
      console.log(`Updating college mapping: ${collegeName} -> ${division}`)

      const { error: mappingError } = await supabase.from("college_division_mappings").upsert(
        {
          college_name: collegeName,
          division: division,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "college_name",
        },
      )

      if (mappingError) {
        console.error("Error updating college mapping:", mappingError)
      } else {
        console.log("Successfully updated college mapping")
      }
    }

    // Update logo mappings table if it exists
    if (entityName || collegeName) {
      const entityToSave = entityName || collegeName
      const entityType =
        category === "college"
          ? "college"
          : category === "highschool"
            ? "highschool"
            : category === "club"
              ? "club"
              : "college"

      console.log(`Updating logo mapping: ${entityToSave} (${entityType}) -> ${url}`)

      const { error: logoError } = await supabase.from("logo_mappings").upsert(
        {
          entity_name: entityToSave,
          entity_type: entityType,
          logo_url: url,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "entity_name,entity_type",
        },
      )

      if (logoError) {
        console.error("Error updating logo mapping:", logoError)
      } else {
        console.log("Successfully updated logo mapping")
      }
    }

    // Try to update media_items table if it exists
    try {
      const { error: mediaError } = await supabase.from("media_items").upsert(
        {
          url: url,
          college_name: collegeName,
          division: division,
          entity_name: entityName,
          alt_text: altText,
          caption: caption,
          entity_type: category,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "url",
        },
      )

      if (mediaError) {
        console.log("Media items table doesn't exist or error:", mediaError.message)
      } else {
        console.log("Successfully updated media items")
      }
    } catch (error) {
      console.log("Media items table not available:", error)
    }

    return NextResponse.json({
      success: true,
      message: "Media metadata updated successfully",
      data: {
        url,
        collegeName,
        division,
        entityName,
        altText,
        caption,
        category,
      },
    })
  } catch (error) {
    console.error("Error updating media metadata:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update metadata" },
      { status: 500 },
    )
  }
}
