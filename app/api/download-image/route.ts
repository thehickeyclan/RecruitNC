import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, athleteId, filename } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg"

    // Upload to Vercel Blob
    const { url } = await put(`athlete-photos/${filename}`, imageBuffer, {
      access: "public",
      contentType,
    })

    // If athleteId is provided, update the athlete record
    if (athleteId) {
      // You could add database update logic here
      console.log(`Updated athlete ${athleteId} with photo URL: ${url}`)
    }

    return NextResponse.json({
      success: true,
      url,
      message: "Image downloaded and uploaded successfully",
    })
  } catch (error) {
    console.error("Error downloading image:", error)
    return NextResponse.json({ error: "Failed to download image" }, { status: 500 })
  }
}
