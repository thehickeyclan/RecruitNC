import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    console.log('[v0] Removing background from:', imageUrl)
    
    // Use fal's birefnet model for background removal
    const result = await fal.subscribe("fal-ai/birefnet", {
      input: {
        image_url: imageUrl,
      },
    })

    console.log('[v0] Fal result:', JSON.stringify(result))

    const outputImageUrl = (result as { image?: { url?: string } }).image?.url

    if (!outputImageUrl) {
      throw new Error("No image returned from background removal")
    }

    return NextResponse.json({ imageUrl: outputImageUrl })
  } catch (error) {
    console.error("[v0] remove-background Error:", error)
    const message = error instanceof Error ? error.message : "Failed to remove background"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
