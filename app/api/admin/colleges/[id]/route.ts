import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** Update a college (e.g. division) by id. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing college id" }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.division === "string") updates.division = body.division
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim()
    if (typeof body.logo_url === "string" && body.logo_url.trim()) {
      updates.logo_url = body.logo_url.trim()
    } else if (body.logo_url === null || body.logo_url === "") {
      updates.logo_url = null
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: "No valid updates" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("colleges")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[admin/colleges] PATCH error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, college: data })
  } catch (e) {
    console.error("[admin/colleges] PATCH error:", e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Failed to update college" },
      { status: 500 },
    )
  }
}
