import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAverageColor } from "fast-average-color-node"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(
  _req: Request,
  { params }: { params: { schoolId: string } },
) {
  try {
    const id = params.schoolId
    const { data: school, error: fetchErr } = await supabase
      .from("schools")
      .select("id, logo_url")
      .eq("id", id)
      .single()
    if (fetchErr || !school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }
    if (!school.logo_url) {
      return NextResponse.json({ error: "School has no logo_url to infer colors from" }, { status: 400 })
    }
    let primary: string | null = null
    let secondary: string | null = null
    try {
      const avg = await getAverageColor(school.logo_url)
      if (avg?.hex) {
        primary = avg.hex
        const hex = avg.hex.replace("#", "")
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        const yiq = (r * 299 + g * 587 + b * 114) / 1000
        secondary = yiq >= 150 ? "#111111" : "#FFFFFF"
      }
    } catch (e) {
      return NextResponse.json({ error: "Failed to analyze logo colors" }, { status: 500 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from("schools")
      .update({ primary_color: primary, secondary_color: secondary })
      .eq("id", id)
      .select()
      .single()
    if (updateErr) {
      return NextResponse.json({ error: "Failed to update school colors" }, { status: 500 })
    }
    return NextResponse.json({ success: true, school: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}


