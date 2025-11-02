import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public")
    const divisionLogosDir = path.join(publicDir, "division-logos")

    // Create directory if it doesn't exist
    if (!fs.existsSync(divisionLogosDir)) {
      fs.mkdirSync(divisionLogosDir, { recursive: true })
    }

    return NextResponse.json({ success: true, message: "Division logos directory created" })
  } catch (error) {
    console.error("Error creating division logos directory:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
