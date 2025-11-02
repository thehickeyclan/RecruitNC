import { NextResponse } from "next/server"
import { list } from "@vercel/blob"
import { findLogoForEntity } from "@/lib/image-utils"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const name = searchParams.get("name")

    if (!category || !name) {
      return NextResponse.json({ error: "Category and name parameters are required" }, { status: 400 })
    }

    if (!["athlete", "highschool", "college", "club"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    // List all images in the category
    const blobs = await list({ prefix: `${category}/` })

    // Find the matching logo
    const logoUrl = findLogoForEntity(name, blobs.blobs)

    // For debugging
    console.log(`Looking for ${category} logo for "${name}". Found: ${logoUrl ? logoUrl : "No match"}`)

    return NextResponse.json({ url: logoUrl })
  } catch (error) {
    console.error("Error finding entity image:", error)
    return NextResponse.json({ error: "Failed to find image" }, { status: 500 })
  }
}
