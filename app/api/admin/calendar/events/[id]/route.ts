import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import type { EventCategory } from "@/lib/nc-united-calendar/types"

export const dynamic = "force-dynamic"

type Body = {
  title?: string
  startDate?: string
  endDate?: string | null
  startTime?: string
  endTime?: string
  category?: EventCategory
  location?: string
  description?: string
  coach?: string
  registrationDeadline?: string | null
  entryFee?: number | null
  travelInfo?: string
  weightClasses?: string[] | string
  rsvpRequired?: boolean
  externalLink?: string
  logoUrl?: string
  dropInRegistrationLink?: string
  maxDropIns?: number | null
}

function normalizeWeightClasses(v: Body["weightClasses"]): string[] | null {
  if (v == null) return null
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean)
  if (typeof v === "string") {
    return v
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return null
}

function bodyToRow(body: Body): Record<string, unknown> {
  const weightClasses = normalizeWeightClasses(body.weightClasses)
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) row.title = body.title.trim()
  if (body.startDate !== undefined) row.start_date = body.startDate
  if (body.endDate !== undefined) row.end_date = body.endDate
  if (body.startTime !== undefined) row.start_time = body.startTime?.trim() || null
  if (body.endTime !== undefined) row.end_time = body.endTime?.trim() || null
  if (body.category !== undefined) row.category = body.category
  if (body.location !== undefined) row.location = body.location?.trim() || null
  if (body.description !== undefined) row.description = body.description?.trim() || null
  if (body.coach !== undefined) row.coach = body.coach?.trim() || null
  if (body.registrationDeadline !== undefined) row.registration_deadline = body.registrationDeadline || null
  if (body.entryFee !== undefined) row.entry_fee = body.entryFee
  if (body.travelInfo !== undefined) row.travel_info = body.travelInfo?.trim() || null
  if (body.weightClasses !== undefined) {
    row.weight_classes = weightClasses && weightClasses.length > 0 ? weightClasses : null
  }
  if (body.rsvpRequired !== undefined) row.rsvp_required = body.rsvpRequired
  if (body.externalLink !== undefined) row.external_link = body.externalLink?.trim() || null
  if (body.logoUrl !== undefined) row.logo_url = body.logoUrl?.trim() || null
  if (body.dropInRegistrationLink !== undefined) row.drop_in_registration_link = body.dropInRegistrationLink?.trim() || null
  if (body.maxDropIns !== undefined) {
    row.max_drop_ins = body.maxDropIns != null && Number.isFinite(body.maxDropIns) ? body.maxDropIns : null
  }
  return row
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const row = bodyToRow(body)
  const admin = createAdminClient()
  const { data, error } = await admin.from("events").update(row).eq("id", id).select("*").single()
  if (error) {
    console.error("[admin/calendar/events] PATCH:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ event: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }
  const admin = createAdminClient()
  const { error } = await admin.from("events").delete().eq("id", id)
  if (error) {
    console.error("[admin/calendar/events] DELETE:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
