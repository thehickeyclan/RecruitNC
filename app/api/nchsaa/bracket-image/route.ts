import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/nchsaa/bracket-image?year=2026&classification=1A&weightClass=106
 * Returns { url } for the bracket image, or 404 if not found.
 * Public (no auth) — bracket images are public.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
    const classification = searchParams.get("classification")
    const weightClass = searchParams.get("weightClass")

    if (!year || !classification || !weightClass) {
      return NextResponse.json(
        { error: "Missing year, classification, or weightClass" },
        { status: 400 }
      )
    }

    const yearNum = parseInt(year, 10)
    if (Number.isNaN(yearNum)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("nchsaa_bracket_images")
      .select("image_url")
      .eq("year", yearNum)
      .eq("classification", classification.trim())
      .eq("weight_class", weightClass.trim())
      .maybeSingle()

    if (error) {
      console.error("[RecruitNC] nchsaa bracket-image fetch error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!data?.image_url) {
      return NextResponse.json({ error: "Bracket not found" }, { status: 404 })
    }

    return NextResponse.json({ url: data.image_url })
  } catch (e) {
    console.error("[RecruitNC] bracket-image error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
