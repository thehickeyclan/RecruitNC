import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const imagePath = searchParams.get("path")

  if (!imagePath) {
    return NextResponse.json({ error: "No image path provided" }, { status: 400 })
  }

  try {
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith("/") ? imagePath.substring(1) : imagePath

    // Check if the file exists in the public directory
    const fullPath = path.join(process.cwd(), "public", cleanPath)

    const exists = fs.existsSync(fullPath)

    if (exists) {
      const stats = fs.statSync(fullPath)
      return NextResponse.json({
        exists: true,
        path: imagePath,
        fullPath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      })
    } else {
      return NextResponse.json({
        exists: false,
        path: imagePath,
        fullPath,
        availableFiles: fs
          .readdirSync(path.join(process.cwd(), "public"))
          .filter((file) => file.includes("wrestler") || file.includes("diverse")),
      })
    }
  } catch (error) {
    console.error("Error checking image:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
