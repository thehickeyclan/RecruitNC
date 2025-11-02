import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const athleteId = formData.get("athleteId") as string
    const athleteName = formData.get("athleteName") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!athleteId) {
      return NextResponse.json({ error: "No athlete ID provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Generate a unique filename
    const safeFileName = athleteName ? athleteName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "athlete"
    const timestamp = Date.now()
    const filename = `athlete/${safeFileName}-${timestamp}${getExtension(file.name)}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    // Update the athlete record in Supabase
    const supabase = createClient()
    const { error } = await supabase.from("athletes").update({ photourl: blob.url }).eq("id", athleteId)

    if (error) {
      console.error("Error updating athlete record:", error)
      return NextResponse.json({ error: "Failed to update athlete record" }, { status: 500 })
    }

    return NextResponse.json({
      url: blob.url,
      success: true,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

// Helper function to get file extension
function getExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ""
}
