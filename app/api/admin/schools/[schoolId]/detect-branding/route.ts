import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(
  _req: Request,
  { params }: { params: { schoolId: string } },
) {
  try {
    const id = params.schoolId
    const { data: school, error: fetchErr } = await supabase
      .from("schools")
      .select("id, logo_url, name")
      .eq("id", id)
      .single()
    if (fetchErr || !school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 })
    }
    if (!school.logo_url) {
      return NextResponse.json({ error: "School has no logo_url to infer colors from" }, { status: 400 })
    }
    // Color detection temporarily disabled; attempt brand map fallback for well-known programs
    const name = (school.name || "").toLowerCase()
    type Palette = { primary: string; secondary: string }
    const brandMap: Array<{ match: (n: string, logo: string) => boolean; palette: Palette }> = [
      {
        match: (n, _logo) => n.includes("rochester institute of technology") || n === "rit" || n.includes("tigers"),
        palette: { primary: "#F76902", secondary: "#000000" },
      },
      {
        match: (n, _logo) => n.includes("appalachian state"),
        palette: { primary: "#FFCC00", secondary: "#000000" },
      },
    ]
    const found = brandMap.find((b) => b.match(name, school.logo_url))
    if (!found) {
      return NextResponse.json({ error: "Brand color detection temporarily disabled" }, { status: 501 })
    }
    const { data: updated, error: updateErr } = await supabase
      .from("schools")
      .update({ primary_color: found.palette.primary, secondary_color: found.palette.secondary })
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


