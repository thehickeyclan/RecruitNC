import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileName = formData.get("fileName") as string

    if (!file || !fileName) {
      return NextResponse.json({ success: false, error: "File or filename missing" }, { status: 400 })
    }

    // Create directory if it doesn't exist
    const publicDir = path.join(process.cwd(), "public")
    const dirPath = path.join(publicDir, "division-logos")

    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Write file to disk
    const filePath = path.join(dirPath, fileName)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      message: `File ${fileName} uploaded successfully`,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
