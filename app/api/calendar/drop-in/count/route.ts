import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * How full a practice is, for anyone looking at the calendar.
 *
 * The event popup used to read every drop_in_requests row straight from the browser to count
 * them - and then listed each one: parent name and email, wrestler cell, date of birth and
 * weight, shown to any visitor. Counting is all the public needs, so that is all this returns.
 * The list itself is for admins (/api/admin/calendar/events/[id]/drop-ins).
 */
export async function GET(request: NextRequest) {
  const eventId = new URL(request.url).searchParams.get("eventId")
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 })

  const { data, error } = await createAdminClient()
    .from("drop_in_requests")
    .select("payment_status")
    .eq("event_id", eventId)
  if (error) return NextResponse.json({ error: "Could not load drop-ins" }, { status: 500 })

  const statuses = (data ?? []).map((r) => String(r.payment_status ?? "unpaid"))
  return NextResponse.json(
    {
      active: statuses.filter((s) => s === "paid" || s === "pending").length,
      paid: statuses.filter((s) => s === "paid").length,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
