import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be less than 5MB" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || "jpg"
    const path = `profile-headshots/${user.id}/${nanoid(8)}-${Date.now()}.${ext}`

    let blobUrl: string
    try {
      const result = await put(path, file, { access: "public" })
      blobUrl = result.url
    } catch (err) {
      console.error("[profile/headshot-upload] Blob error:", err)
      const msg = process.env.BLOB_READ_WRITE_TOKEN
        ? "Upload failed"
        : "Image upload is not configured (missing BLOB_READ_WRITE_TOKEN)."
      return NextResponse.json(
        { error: msg, details: err instanceof Error ? err.message : String(err) },
        { status: 503 }
      )
    }

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ headshot_url: blobUrl })
      .eq("user_id", user.id)

    if (updateError) {
      const msg = String(updateError.message || "").toLowerCase()
      if (msg.includes("column") && msg.includes("does not exist")) {
        return NextResponse.json(
          { error: "Profile headshot is not set up yet. Run the migration: scripts/add-headshot-url-to-user-profiles.sql" },
          { status: 501 }
        )
      }
      console.error("[profile/headshot-upload] Update error:", updateError)
      return NextResponse.json({ error: "Failed to save headshot to profile" }, { status: 500 })
    }

    return NextResponse.json({ url: blobUrl })
  } catch (error) {
    console.error("[profile/headshot-upload]", error)
    return NextResponse.json(
      { error: "Failed to process upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
