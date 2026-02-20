import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/profile-check/[id]
 * Minimal check: can we reach Supabase and fetch one athlete by id?
 * No auth, no tournament data. Use to isolate profile failures.
 * Example: https://app.ncwrestlingunited.com/api/profile-check/63ea613d-0886-4af0-b64b-1c3d80fe0332
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
      .select("id, name, highschool, graduationyear")
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

    return NextResponse.json({
      ok: true,
      id: athlete.id,
      name: athlete.name,
      highschool: athlete.highschool,
      graduationyear: athlete.graduationyear,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[profile-check]", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
