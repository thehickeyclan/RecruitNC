import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const timestamp = Date.now()
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg"
    const blobFilename = `uploads/${timestamp}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`

    const blob = await put(blobFilename, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
    })
  } catch (error) {
    console.error("[upload]", error)
    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
