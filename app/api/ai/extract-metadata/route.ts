import { type NextRequest, NextResponse } from "next/server"
import { MetadataExtractionService } from "@/lib/ai/metadata-extraction-service"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const metadata = await MetadataExtractionService.extractMetadata(file)
    return NextResponse.json(metadata)
  } catch (error) {
    console.error("Metadata extraction error:", error)
    return NextResponse.json({ error: "Failed to extract metadata" }, { status: 500 })
  }
}
