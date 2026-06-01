import { type NextRequest, NextResponse } from "next/server"
import { getDirectEntityLogoUrl, resolveEntityLogoUrl } from "@/lib/entity-logo-resolve"
import { normalizeEntityName, normalizeEntityType } from "@/lib/logo-mappings-normalize"

export async function POST(request: NextRequest) {
  try {
    const { entityName, entityType } = await request.json()

    if (!entityName || !entityType) {
      return NextResponse.json({ success: false, error: "Missing entityName or entityType" })
    }

    const trimmed = String(entityName).trim()
    const normalizedType = normalizeEntityType(entityType)

    const direct = getDirectEntityLogoUrl(normalizedType, trimmed)
    if (direct) {
      return NextResponse.json({
        success: true,
        logoUrl: direct,
        matchInfo: {
          confidence: 100,
          matchType: "exact",
          originalQuery: trimmed,
          matchedName: normalizeEntityName(trimmed),
        },
      })
    }

    const logoUrl = await resolveEntityLogoUrl(normalizedType, trimmed)
    if (logoUrl) {
      return NextResponse.json({
        success: true,
        logoUrl,
        matchInfo: {
          confidence: 90,
          matchType: "fuzzy",
          originalQuery: trimmed,
          matchedName: normalizeEntityName(trimmed),
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: "No logo found",
      logoUrl: null,
    })
  } catch (error) {
    console.error("Smart match error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" })
  }
}
