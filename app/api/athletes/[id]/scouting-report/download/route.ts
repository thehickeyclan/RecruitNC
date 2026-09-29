import { NextRequest, NextResponse } from "next/server"

import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Record that a scouting report was downloaded.
 *
 * Opening a report is already logged in `scouting_report_access`. Saving it is a separate and
 * stronger signal - a coach keeping the PDF for a staff meeting - and it happens in the browser's
 * print dialog or the app's share sheet, neither of which the server sees. Both report each save
 * here; it lands in `user_analytics` as `scouting_report_download`, beside the profile views, so no
 * table is needed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // The app saves reports too, and sends a bearer token rather than cookies.
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  await createAdminClient()
    .from("user_analytics")
    .insert({
      user_id: user.id,
      event_type: "scouting_report_download",
      page_url: `/athletes/${id}/scouting-report`,
      user_agent: request.headers.get("user-agent"),
      event_data: { athlete_id: id, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    })
    .then(undefined, () => undefined)

  return NextResponse.json({ ok: true })
}
