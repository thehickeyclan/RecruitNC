import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const entityName = formData.get("entityName") as string
    const entityType = formData.get("entityType") as string

    if (!file || !entityName || !entityType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a clean filename
    const cleanName = entityName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
    const filename = `${entityType}-logos/${cleanName}.${file.name.split(".").pop()}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    // Save to database
    const supabase = createClient()

    // Check if mapping already exists
    const { data: existingMapping, error: findError } = await supabase
      .from("logo_mappings")
      .select("id")
      .eq("entity_type", entityType)
      .ilike("entity_name", entityName)
      .maybeSingle()

    if (findError && findError.code !== "PGRST116") {
      console.error("Error checking for existing mapping:", findError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    let result
    if (existingMapping?.id) {
      // Update existing mapping
      result = await supabase
        .from("logo_mappings")
        .update({
          logo_url: blob.url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMapping.id)
    } else {
      // Insert new mapping
      result = await supabase.from("logo_mappings").insert([
        {
          entity_name: entityName,
          entity_type: entityType,
          logo_url: blob.url,
        },
      ])
    }

    const { error } = result
    if (error) {
      console.error("Error saving logo mapping:", error)
      return NextResponse.json({ error: "Failed to save logo mapping" }, { status: 500 })
    }

    // Also save to media_items table for the media manager
    const { error: mediaError } = await supabase.from("media_items").insert([
      {
        name: entityName,
        url: blob.url,
        type: file.type,
        category: "logo",
        size: file.size,
        entity_type: entityType,
        entity_name: entityName,
      },
    ])

    if (mediaError) {
      console.log("Note: Could not save to media_items (table may not exist):", mediaError)
    }

    return NextResponse.json({
      success: true,
      message: existingMapping ? "Logo updated successfully" : "Logo uploaded successfully",
      url: blob.url,
    })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 })
  }
}
