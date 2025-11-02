import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const filename = (formData.get("filename") as string) || "image"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
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
    const safeFileName = filename.toLowerCase().replace(/[^a-z0-9.]/g, "-")
    const uniqueId = nanoid(8)
    const timestamp = Date.now()
    const blobFilename = `athlete/${uniqueId}-${timestamp}${getExtension(safeFileName)}`

    console.log(`Uploading file: ${blobFilename}`)

    // Upload to Vercel Blob
    const blob = await put(blobFilename, file, {
      access: "public",
    })

    console.log(`File uploaded successfully to ${blob.url}`)

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: blobFilename,
      originalName: filename,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Helper function to get file extension
function getExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ""
}
