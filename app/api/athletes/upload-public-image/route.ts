import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"

const TEMP_PROFILE_ID = "temp-profile"
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidAthleteId(id: string): boolean {
  return !!id && UUID_REGEX.test(id.trim())
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const athleteId = (formData.get("athleteId") as string)?.trim() || ""
    const uploadedBy = (formData.get("uploadedBy") as string)?.trim() || ""

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

    const uniqueId = nanoid(8)
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const blobFilename = `athletes/${athleteId}/user-uploads/headshot-${uniqueId}-${timestamp}.${fileExtension}`

    let blobUrl: string
    try {
      const blobResult = await put(blobFilename, file, {
        access: "public",
      })
      blobUrl = blobResult.url
      console.log(`Public image uploaded to Blob: ${blobUrl}`)
    } catch (blobError) {
      console.error("Vercel Blob upload failed:", blobError)
      const msg = process.env.BLOB_READ_WRITE_TOKEN
        ? "Upload failed"
        : "Image upload is not configured (missing BLOB_READ_WRITE_TOKEN). You can still create your profile without a photo."
      return NextResponse.json(
        { error: msg, details: blobError instanceof Error ? blobError.message : String(blobError) },
        { status: 503 },
      )
    }

    // Only write to pending_uploads when we have a real athlete UUID (skip for create-profile "temp-profile")
    if (isValidAthleteId(athleteId)) {
      try {
        const supabase = createClient()
        const { error: insertError } = await supabase.from("pending_uploads").insert({
          athlete_id: athleteId,
          image_url: blobUrl,
          image_type: "user_headshot",
          uploaded_by: uploadedBy || null,
          status: "pending",
        })
        if (insertError) {
          console.error("Error creating pending upload record (non-fatal):", insertError)
        }
      } catch (dbError) {
        console.error("Pending upload record failed (non-fatal):", dbError)
      }
    }

    return NextResponse.json({
      success: true,
      url: blobUrl,
      message: athleteId === TEMP_PROFILE_ID
        ? "Image uploaded. It will be saved when you create your profile."
        : "Image uploaded successfully and submitted for review",
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
