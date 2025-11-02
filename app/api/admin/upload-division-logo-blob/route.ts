import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileName = formData.get("fileName") as string

    if (!file || !fileName) {
      return NextResponse.json({ success: false, error: "File or filename missing" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`division-logos/${fileName}.png`, file, {
      access: "public",
    })

    // Store the mapping in the database
    const supabase = createClient()

    // Insert or update the logo mapping
    const { error } = await supabase.from("division_logos").upsert(
      {
        name: fileName,
        url: blob.url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    )

    if (error) {
      console.error("Error saving to database:", error)
      return NextResponse.json({
        success: true,
        url: blob.url,
        message: `File uploaded to Blob Storage, but database update failed: ${error.message}`,
      })
    }

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: `File ${fileName} uploaded successfully`,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
