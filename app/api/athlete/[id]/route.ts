import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/athlete/[id]
 * Returns full athlete row. Used by profile page so server never blocks.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: athlete, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", id.trim())
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: 200 }
      )
    }
    if (!athlete) {
      return NextResponse.json({ ok: false, error: "no row" }, { status: 200 })
    }

    return NextResponse.json({ ok: true, athlete })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[api/athlete]", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
