import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/messaging/athlete-contact?athlete_id=
 * Returns the messageable user_id for an athlete (claimed_by_user_id), if any.
 * Used by the envelope "Message" button on rankings and profiles.
 * Returns { user_id: string | null }. Do not message self.
 */
export async function GET(request: Request) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get("athlete_id")?.trim()
  if (!athleteId) return NextResponse.json({ error: "athlete_id is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("athletes")
    .select("claimed_by_user_id")
    .eq("id", athleteId)
    .maybeSingle()

  if (error) {
    console.error("[messaging/athlete-contact]", error)
    return NextResponse.json({ error: "Failed to look up athlete" }, { status: 500 })
  }

  const claimedBy = (row as { claimed_by_user_id?: string | null } | null)?.claimed_by_user_id ?? null
  if (!claimedBy || claimedBy === user.id) {
    return NextResponse.json({ user_id: null })
  }

  return NextResponse.json({ user_id: claimedBy })
}
