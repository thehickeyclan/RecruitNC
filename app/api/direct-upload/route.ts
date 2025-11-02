import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const athleteId = formData.get("athleteId") as string

    if (!file || !athleteId) {
      return NextResponse.json({ error: "File and athlete ID are required" }, { status: 400 })
    }

    console.log(`Processing direct upload for athlete ID: ${athleteId}`)
    console.log(`File name: ${file.name}, size: ${file.size}, type: ${file.type}`)

    // Generate a unique filename
    const filename = `athlete-${athleteId}-${Date.now()}.${file.name.split(".").pop()}`

    try {
      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: "public",
      })

      console.log(`File uploaded successfully to ${blob.url}`)

      // Update the athlete record in the database
      const { data, error } = await supabase.from("athletes").update({ photourl: blob.url }).eq("id", athleteId)

      if (error) {
        console.error(`Error updating athlete image:`, error)
        return NextResponse.json({
          success: false,
          error: `Database update failed: ${error.message}`,
          url: blob.url, // Still return the URL so the image isn't lost
        })
      }

      return NextResponse.json({
        success: true,
        url: blob.url,
      })
    } catch (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        {
          success: false,
          error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
