import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = formData.get("category") as string
    const entityType = formData.get("entityType") as string
    const entityName = formData.get("entityName") as string
    const alt = formData.get("alt") as string
    const caption = formData.get("caption") as string
    const tags = formData.get("tags") as string

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "No file provided",
      })
    }

    // Create proper file path based on category
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const cleanName = entityName ? entityName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-") : "unnamed"
    const fileName = `${category}/${cleanName}-${timestamp}.${fileExtension}`

    // Upload to Vercel Blob with proper path
    const blob = await put(fileName, file, {
      access: "public",
    })

    // Parse tags
    const parsedTags = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []

    // Save to database
    const supabase = createClient()
    const { data, error } = await supabase
      .from("media_items")
      .insert({
        filename: fileName,
        original_name: entityName || file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        url: blob.url,
        category: category || "general",
        entity_type: entityType || null,
        entity_name: entityName || null,
        alt_text: alt || null,
        caption: caption || null,
        tags: parsedTags,
        mime_type: file.type,
        size_bytes: file.size,
        metadata: {
          uploadedAt: new Date().toISOString(),
          downloadUrl: blob.downloadUrl,
        },
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({
        success: false,
        error: `Database error: ${error.message}`,
      })
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    })
  }
}
