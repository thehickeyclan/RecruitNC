import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const athleteId = formData.get("athleteId") as string
    const uploadedBy = formData.get("uploadedBy") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!athleteId) {
      return NextResponse.json({ error: "No athlete ID provided" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    console.log(`Processing public image upload for athlete ${athleteId}`)

    // Generate a unique filename
    const uniqueId = nanoid(8)
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const blobFilename = `athletes/${athleteId}/user-uploads/headshot-${uniqueId}-${timestamp}.${fileExtension}`

    // Upload to Vercel Blob
    const blob = await put(blobFilename, file, {
      access: "public",
    })

    console.log(`Public image uploaded to Blob: ${blob.url}`)

    // Store the upload in a pending_uploads table for admin review
    const supabase = createClient()

    // First, try to create the pending_uploads table if it doesn't exist
    const { error: createTableError } = await supabase.rpc("create_pending_uploads_table")

    // If the function doesn't exist, create the table directly
    if (createTableError) {
      const { error: directCreateError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "pending_uploads")
        .single()

      if (directCreateError) {
        // Table doesn't exist, create it
        await supabase.rpc("exec", {
          sql: `
            CREATE TABLE IF NOT EXISTS pending_uploads (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              athlete_id UUID REFERENCES athletes(id),
              image_url TEXT NOT NULL,
              image_type TEXT DEFAULT 'user_headshot',
              uploaded_by UUID,
              status TEXT DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              reviewed_at TIMESTAMP WITH TIME ZONE,
              reviewed_by UUID
            );
          `,
        })
      }
    }

    // Insert the pending upload record
    const { error: insertError } = await supabase.from("pending_uploads").insert({
      athlete_id: athleteId,
      image_url: blob.url,
      image_type: "user_headshot",
      uploaded_by: uploadedBy,
      status: "pending",
    })

    if (insertError) {
      console.error("Error creating pending upload record:", insertError)
      // Don't fail the upload if we can't create the record
    }

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: "Image uploaded successfully and submitted for review",
    })
  } catch (error) {
    console.error("Error processing public image upload:", error)
    return NextResponse.json(
      {
        error: "Failed to process image upload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
