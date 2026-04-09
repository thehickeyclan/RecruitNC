import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: dropInRequest, error } = await admin
      .from("drop_in_requests")
      .select(
        `
        *,
        events (
          title,
          start_date,
          start_time,
          end_time,
          location
        )
      `,
      )
      .eq("stripe_session_id", sessionId)
      .single()

    if (error || !dropInRequest) {
      console.error("[calendar/drop-in/success] Failed to find drop-in request:", error)
      return NextResponse.json({ error: "Drop-in request not found" }, { status: 404 })
    }

    const row = dropInRequest as {
      wrestler_name?: string
      event_title?: string | null
      event_date?: string | null
      events?: {
        title?: string
        start_date?: string
        start_time?: string
        end_time?: string
        location?: string
      } | null
      payment_status?: string
    }

    return NextResponse.json({
      dropInRequest: {
        wrestlerName: row.wrestler_name,
        eventTitle: row.events?.title || row.event_title || "NC United Practice",
        eventDate: row.events?.start_date || row.event_date || new Date().toISOString(),
        eventTime: row.events?.start_time,
        eventEndTime: row.events?.end_time,
        eventLocation: row.events?.location,
        paymentStatus: row.payment_status || "paid",
      },
    })
  } catch (error) {
    console.error("[calendar/drop-in/success] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
