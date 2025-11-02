import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload request received")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = formData.get("category") as string
    const name = formData.get("name") as string

    if (!file) {
      console.log("[v0] No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] File received:", {
      name: file.name,
      size: file.size,
      type: file.type,
      category,
      customName: name,
    })

    // Generate a unique filename
    const uniqueId = nanoid(8)
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const cleanName = name ? name.replace(/[^a-z0-9-]/g, "") : "image"
    const blobFilename = `${category || "uploads"}/${cleanName}-${uniqueId}-${timestamp}.${fileExtension}`

    console.log("[v0] Uploading to blob:", blobFilename)

    // Upload to Vercel Blob - File object is passed directly
    const blob = await put(blobFilename, file, {
      access: "public",
    })

    console.log("[v0] Blob upload successful:", blob.url)

    return NextResponse.json({
      success: true,
      url: blob.url,
      message: "Image uploaded successfully",
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
