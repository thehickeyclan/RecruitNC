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
  const start = Date.now()
  try {
    const { id } = await params
    console.log("[profile-debug] GET /api/athlete/[id] received", { id: id ?? null, trimmed: id?.trim()?.slice(0, 8) })
    if (!id?.trim()) {
      console.log("[profile-debug] GET /api/athlete/[id] missing id")
      return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: athlete, error } = await supabase
      .from("athletes")
      .select("*")
      .eq("id", id.trim())
      .single()

    const elapsed = Date.now() - start
    if (error) {
      console.log("[profile-debug] GET /api/athlete/[id] Supabase error", { id: id.slice(0, 8), code: error.code, message: error.message, elapsed })
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: 200 }
      )
    }
    if (!athlete) {
      console.log("[profile-debug] GET /api/athlete/[id] no row", { id: id.slice(0, 8), elapsed })
      return NextResponse.json({ ok: false, error: "no row" }, { status: 200 })
    }

    console.log("[profile-debug] GET /api/athlete/[id] ok", { id: id.slice(0, 8), elapsed })
    return NextResponse.json({ ok: true, athlete })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[profile-debug] GET /api/athlete/[id] exception", { message, elapsed: Date.now() - start })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
