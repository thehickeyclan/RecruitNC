/**
 * Whether college coaches have viewed this profile - yes or no, nothing more - for the claim
 * prompt on an unclaimed profile. Signed-in viewers only: a public page should not announce
 * that a particular minor is being recruited. Never names a program.
 */
import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { athleteHasCollegeViews } from "@/lib/college-view-signal"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ viewed: false })
  const admin = createAdminClient()
  const { data: athlete } = await admin.from("athletes").select("claimed_by_user_id").eq("id", id).maybeSingle()
  // Only an unclaimed profile asks to be claimed; an owner has the full panel.
  if (!athlete || athlete.claimed_by_user_id) return NextResponse.json({ viewed: false })
  return NextResponse.json({ viewed: await athleteHasCollegeViews(admin, id) })
}
