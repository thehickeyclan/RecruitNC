import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Simple media upload API called")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const category = (formData.get("category") as string) || "general"
    const altText = formData.get("altText") as string
    const caption = formData.get("caption") as string

    console.log("[v0] Upload request:", {
      filename: file.name,
      size: file.size,
      category,
      altText,
    })

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()
    const uniqueFilename = `${category}/${nanoid()}-${altText || file.name}.${fileExtension}`

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, file, {
      access: "public",
    })

    console.log("[v0] Upload successful:", blob.url)

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        filename: uniqueFilename,
        category,
        size: file.size,
      },
      message: "Media uploaded successfully",
    })
  } catch (error) {
    console.error("[v0] Simple media upload error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    )
  }
}
