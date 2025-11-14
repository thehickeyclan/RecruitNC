import { type NextRequest, NextResponse } from "next/server"
import { getLogoUrl } from "@/lib/logo-mappings"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get("entity")
    const type = searchParams.get("type")

    if (!entity || !type) {
      return NextResponse.json({ error: "Missing entity or type parameter" }, { status: 400 })
    }

    console.log(`🔍 API: Looking up ${type} logo for "${entity}"`)

    const logoUrl = await getLogoUrl(type, entity)

    if (logoUrl) {
      console.log(`✅ API: Found logo for "${entity}":`, logoUrl)
      return NextResponse.json({ logoUrl, success: true })
    } else {
      console.log(`❌ API: No logo found for "${entity}"`)
      return NextResponse.json({ logoUrl: null, success: false })
    }
  } catch (error) {
    console.error("Error in logo-mappings-simple API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
