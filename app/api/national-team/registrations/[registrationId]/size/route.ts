import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Sizes allowed for gear (Singlet, Shorts, Shirt) — same as Blue. */
const GEAR_SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"] as const

function parseSize(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : ""
  return raw && GEAR_SIZES.includes(raw as (typeof GEAR_SIZES)[number]) ? raw : null
}

/** PATCH: Parent updates gear sizes for their registration. Body: { shirt_size?, singlet_size?, shorts_size? } — partial, realtime. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { registrationId } = await params
  const regId = (registrationId ?? "").trim()
  if (!regId) return NextResponse.json({ error: "Registration ID required" }, { status: 400 })

  let body: { shirt_size?: string; singlet_size?: string; shorts_size?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const update: Record<string, string | null> = { updated_at: new Date().toISOString() }
  if (Object.prototype.hasOwnProperty.call(body, "shirt_size")) update.shirt_size = parseSize(body.shirt_size)
  if (Object.prototype.hasOwnProperty.call(body, "singlet_size")) update.singlet_size = parseSize(body.singlet_size)
  if (Object.prototype.hasOwnProperty.call(body, "shorts_size")) update.shorts_size = parseSize(body.shorts_size)
  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: "Send at least one of shirt_size, singlet_size, shorts_size" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: reg, error: fetchErr } = await admin
    .from("national_team_event_registrations")
    .select("id, parent_email, parent_user_id, status")
    .eq("id", regId)
    .single()

  if (fetchErr || !reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 })
  }

  const row = reg as { id: string; parent_email: string | null; parent_user_id: string | null; status: string }
  if (row.status !== "paid") {
    return NextResponse.json({ error: "Only paid registrations can be updated" }, { status: 403 })
  }

  const isParent =
    row.parent_user_id === user.id ||
    (user.email && (row.parent_email ?? "").toLowerCase() === user.email.toLowerCase())
  if (!isParent) {
    return NextResponse.json({ error: "You can only update your own registration" }, { status: 403 })
  }

  const { error: updateErr } = await admin
    .from("national_team_event_registrations")
    .update(update)
    .eq("id", regId)

  if (updateErr) {
    console.error("[national-team/registrations/size] update error:", updateErr)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    shirt_size: update.shirt_size ?? undefined,
    singlet_size: update.singlet_size ?? undefined,
    shorts_size: update.shorts_size ?? undefined,
  })
}
