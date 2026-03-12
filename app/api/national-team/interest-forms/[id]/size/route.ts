import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const GEAR_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const

function parseSize(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : ""
  return raw && GEAR_SIZES.includes(raw as (typeof GEAR_SIZES)[number]) ? raw : null
}

/** PATCH: Update gear sizes for a lineup row (national_team_interest_forms). Caller must be hub member or admin. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const formId = (id ?? "").trim()
  if (!formId) return NextResponse.json({ error: "ID required" }, { status: 400 })

  let body: { shirt_size?: string; singlet_size?: string; shorts_size?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const update: Record<string, string | null> = {}
  if (Object.prototype.hasOwnProperty.call(body, "shirt_size")) update.shirt_size = parseSize(body.shirt_size)
  if (Object.prototype.hasOwnProperty.call(body, "singlet_size")) update.singlet_size = parseSize(body.singlet_size)
  if (Object.prototype.hasOwnProperty.call(body, "shorts_size")) update.shorts_size = parseSize(body.shorts_size)
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Send at least one of shirt_size, singlet_size, shorts_size" }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .maybeSingle()
  const isAdmin = !!(profile as { is_admin?: boolean; role?: string } | null)?.is_admin ||
    (profile as { role?: string } | null)?.role === "admin"

  if (!isAdmin) {
    const { data: wm } = await admin
      .from("event_workspace_members")
      .select("event_slug")
      .eq("user_id", user.id)
    const slugs = (wm ?? []).map((r) => (r as { event_slug: string }).event_slug)
    const allowed = slugs.some((s) => s === "nhsca-duals-2026" || s === "nhsca-duals-2026-select")
    if (!allowed) {
      return NextResponse.json({ error: "You must be a member of the event hub to update lineup sizes." }, { status: 403 })
    }
  }

  const { data: row, error: fetchErr } = await admin
    .from("national_team_interest_forms")
    .select("id")
    .eq("id", formId)
    .single()

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Lineup row not found" }, { status: 404 })
  }

  const { error: updateErr } = await admin
    .from("national_team_interest_forms")
    .update(update)
    .eq("id", formId)

  if (updateErr) {
    console.error("[national-team/interest-forms/size] update error:", updateErr)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    shirt_size: update.shirt_size ?? undefined,
    singlet_size: update.singlet_size ?? undefined,
    shorts_size: update.shorts_size ?? undefined,
  })
}
