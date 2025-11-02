import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const { fileName, sourcePath, destinationPath } = await request.json()

    if (!fileName || !sourcePath) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    const supabase = createClient()

    // Create the destination directory if it doesn't exist
    const publicDir = path.join(process.cwd(), "public")
    const destDir = path.join(publicDir, destinationPath || "division-logos")

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    // Download the file from Supabase
    const { data, error } = await supabase.storage.from("images").download(`${sourcePath}/${fileName}`)

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 })
    }

    // Convert the blob to a buffer
    const buffer = Buffer.from(await data.arrayBuffer())

    // Save the file to the public directory
    const destPath = path.join(destDir, fileName)
    fs.writeFileSync(destPath, buffer)

    return NextResponse.json({
      success: true,
      message: `File ${fileName} copied to ${destinationPath || "division-logos"}`,
    })
  } catch (error) {
    console.error("Error copying file:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
