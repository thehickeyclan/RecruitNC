import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { resolveAthleteOwnership } from "@/lib/mobile/athlete-ownership"

/**
 * Tournament results a family reports themselves.
 *
 * This route took a service-role client and wrote whatever it was handed, with no check of any
 * kind: an unauthenticated PUT to `/api/athletes/<id>/tournament-results` replaced the NHSCA and
 * Super 32 results of any wrestler on the site, from anywhere, and answered 200. Those results
 * feed the credential pills and the ranking engine, so the hole reached the product being sold.
 *
 * Now the same rule the mobile edit endpoints use: the athlete who claimed the profile, or a
 * parent linked to them. An admin editing here would leave a change that looks like the family
 * made it, so staff work belongs on the admin surfaces where it is attributed.
 *
 * The shape is still trusted to the caller in one respect - what is submitted is what the family
 * says happened. That is the trade this form exists to make, and it is why nothing written here
 * is treated as verified: `last_edited_by` records who typed it.
 */

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: athleteId } = await params
    const admin = createAdminClient()

    const viewerId = await resolveRequestUserId(request)
    const ownership = await resolveAthleteOwnership(admin, athleteId, viewerId)
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const body = await request.json()

    // Only the two result arrays, whatever else the body carries.
    const nhsca = Array.isArray(body?.nhsca_results) ? body.nhsca_results : []
    const super32 = Array.isArray(body?.super32_results) ? body.super32_results : []

    const { data, error } = await admin
      .from("athletes")
      .update({
        nhsca_results: nhsca,
        super32_results: super32,
        updated_at: new Date().toISOString(),
        last_edited_by: viewerId,
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", athleteId)
      .select("id")

    if (error) {
      console.error("[tournament-results] update failed:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Failed to update tournament results"
    console.error("[tournament-results]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
