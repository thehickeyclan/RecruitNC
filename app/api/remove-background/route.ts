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

    // Use fal's background removal model
    const result = await fal.subscribe("fal-ai/background-remover", {
      input: {
        image_url: imageUrl,
      },
    })

    const outputImageUrl = (result as { image?: { url?: string } }).image?.url

    if (!outputImageUrl) {
      throw new Error("No image returned from background removal")
    }

    return NextResponse.json({ imageUrl: outputImageUrl })
  } catch (error) {
    console.error("[remove-background] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to remove background"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
