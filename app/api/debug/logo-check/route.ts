import { NextResponse } from "next/server"
import { getLogoUrl } from "@/lib/logo-mappings"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get("type") || "highschool"
  const name = url.searchParams.get("name") || "McDowell"

  try {
    console.log(`Checking logo for ${type}: "${name}"`)
    const logoUrl = await getLogoUrl(type, name)

    return NextResponse.json({
      success: true,
      type,
      name,
      logoUrl,
      found: !!logoUrl,
    })
  } catch (error) {
    console.error(`Error checking logo for ${type} ${name}:`, error)
    return NextResponse.json(
      {
        success: false,
        type,
        name,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
