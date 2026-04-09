import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { aggregateDropInStats } from "@/lib/nc-united-calendar/aggregate-drop-in-stats"
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
  return {
    title: body.title?.trim(),
    start_date: body.startDate,
    end_date: body.endDate ?? null,
    start_time: body.startTime?.trim() || null,
    end_time: body.endTime?.trim() || null,
    category: body.category,
    location: body.location?.trim() || null,
    description: body.description?.trim() || null,
    coach: body.coach?.trim() || null,
    registration_deadline: body.registrationDeadline || null,
    entry_fee: body.entryFee ?? null,
    travel_info: body.travelInfo?.trim() || null,
    weight_classes: weightClasses && weightClasses.length > 0 ? weightClasses : null,
    rsvp_required: body.rsvpRequired ?? false,
    external_link: body.externalLink?.trim() || null,
    logo_url: body.logoUrl?.trim() || null,
    drop_in_registration_link: body.dropInRegistrationLink?.trim() || null,
    max_drop_ins: body.maxDropIns != null && Number.isFinite(body.maxDropIns) ? body.maxDropIns : null,
    updated_at: new Date().toISOString(),
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.from("events").select("*").order("start_date", { ascending: true })
  if (error) {
    console.error("[admin/calendar/events] GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: dropRows, error: dropErr } = await admin
    .from("drop_in_requests")
    .select("event_id, status, payment_status")

  if (dropErr) {
    console.error("[admin/calendar/events] drop_in_requests:", dropErr)
  }

  const dropInStatsByEventId = aggregateDropInStats((dropRows ?? []) as { event_id: string; status: string; payment_status: string }[])

  return NextResponse.json({ events: data ?? [], dropInStatsByEventId })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.title?.trim() || !body.startDate?.trim() || !body.category) {
    return NextResponse.json({ error: "title, startDate, and category are required" }, { status: 400 })
  }
  const row = {
    ...bodyToRow(body),
    created_at: new Date().toISOString(),
  }
  const admin = createAdminClient()
  const { data, error } = await admin.from("events").insert(row).select("*").single()
  if (error) {
    console.error("[admin/calendar/events] POST:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ event: data })
}
