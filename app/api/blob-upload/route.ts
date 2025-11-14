import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = formData.get("category") as string
    const entityName = formData.get("entityName") as string | null
    const name = formData.get("name") as string | null

    console.log("=== BLOB UPLOAD API ===")
    console.log("File:", file?.name)
    console.log("Category:", category)
    console.log("Entity Name:", entityName)
    console.log("Name:", name)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: "No category provided" }, { status: 400 })
    }

    // Generate filename
    let filename: string

    if (name && name.trim()) {
      // Use the provided name
      const sanitizedName = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
      const fileExtension = file.name.split(".").pop()
      filename = `${sanitizedName}.${fileExtension}`
    } else if (entityName && entityName.trim()) {
      // Fallback to entityName if provided
      const sanitizedEntityName = entityName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
      const fileExtension = file.name.split(".").pop()
      filename = `${sanitizedEntityName}.${fileExtension}`
    } else {
      // Use original filename as last resort
      filename = file.name
    }

    console.log("Generated filename:", filename)

    // Upload to Vercel Blob with category prefix
    const pathname = `${category}/${filename}`

    const blob = await put(pathname, file, {
      access: "public",
    })

    console.log("Upload successful:", blob.url)

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      filename: filename,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
