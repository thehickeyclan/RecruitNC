import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** List all colleges from the colleges table (for admin division editing). */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("colleges")
      .select("id, name, division, slug, logo_url, created_at, updated_at")
      .order("name")

    if (error) {
      console.error("[admin/colleges] GET error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, colleges: data ?? [] })
  } catch (e) {
    console.error("[admin/colleges] GET error:", e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Failed to fetch colleges" },
      { status: 500 },
    )
  }
}

/** Add a new college to the colleges table. Shows up in the college dropdown on admin profiles. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const division = typeof body.division === "string" ? body.division : ""

    if (!name) {
      return NextResponse.json({ success: false, error: "College name is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("colleges")
      .insert({ name, division, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: false, error: "A college with that name already exists" }, { status: 409 })
      }
      console.error("[admin/colleges] POST error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, college: data })
  } catch (e) {
    console.error("[admin/colleges] POST error:", e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Failed to create college" },
      { status: 500 },
    )
  }
}
