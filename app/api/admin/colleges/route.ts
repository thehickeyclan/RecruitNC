import { NextResponse } from "next/server"
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
