import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest) {
  try {
    const publicPath = path.join(process.cwd(), "public")
    const issues: string[] = []
    const fixed: string[] = []

    console.log("[v0] Checking public folder structure...")

    // Check if public directory exists
    if (!fs.existsSync(publicPath)) {
      return NextResponse.json({ error: "Public directory does not exist" }, { status: 500 })
    }

    // Specific problematic files from the debug logs
    const problematicFiles = [
      "gold-medal.jpeg",
      "bronze-medal.jpeg",
      "silver-medal.jpeg",
      "gold-medal.png",
      "silver-medal.png",
      "bronze-medal.png",
      "appalachian-state-mountains.png",
      "focused-wrestler.png",
    ]

    // First, specifically check and fix the problematic files
    for (const fileName of problematicFiles) {
      const fullPath = path.join(publicPath, fileName)

      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath)
        if (stats.isDirectory()) {
          issues.push(`${fileName} is a directory but should be a file`)

          try {
            // Remove the directory
            fs.rmSync(fullPath, { recursive: true, force: true })

            // Create a minimal placeholder file
            const placeholderContent = Buffer.from("placeholder-image-data")
            fs.writeFileSync(fullPath, placeholderContent)
            fixed.push(`Fixed ${fileName}`)
          } catch (error) {
            issues.push(`Failed to fix ${fileName}: ${error}`)
          }
        }
      }
    }

    // Get all entries in public folder
    const entries = fs.readdirSync(publicPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(publicPath, entry.name)

      // Check if image files are incorrectly marked as directories
      if (entry.name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
        if (entry.isDirectory()) {
          issues.push(`${entry.name} is a directory but should be a file`)

          try {
            // Remove the directory
            fs.rmSync(fullPath, { recursive: true, force: true })

            // Create a placeholder file
            fs.writeFileSync(fullPath, Buffer.from("placeholder"))
            fixed.push(`Fixed ${entry.name}`)
          } catch (error) {
            issues.push(`Failed to fix ${entry.name}: ${error}`)
          }
        }
      }
    }

    // Also check division-logos subdirectory
    const divisionLogosPath = path.join(publicPath, "division-logos")
    if (fs.existsSync(divisionLogosPath)) {
      const divisionEntries = fs.readdirSync(divisionLogosPath, { withFileTypes: true })

      for (const entry of divisionEntries) {
        const fullPath = path.join(divisionLogosPath, entry.name)

        if (entry.name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
          if (entry.isDirectory()) {
            issues.push(`division-logos/${entry.name} is a directory but should be a file`)

            try {
              fs.rmSync(fullPath, { recursive: true, force: true })
              fs.writeFileSync(fullPath, Buffer.from("placeholder"))
              fixed.push(`Fixed division-logos/${entry.name}`)
            } catch (error) {
              issues.push(`Failed to fix division-logos/${entry.name}: ${error}`)
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: "File system diagnostic complete",
      issues,
      fixed,
      totalEntries: entries.length,
    })
  } catch (error) {
    console.error("[v0] File system diagnostic error:", error)
    return NextResponse.json(
      {
        error: "Failed to diagnose file system",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
