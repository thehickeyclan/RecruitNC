import { NextResponse, type NextRequest } from "next/server"

import { ownsAthlete } from "@/lib/college-programs/schedule"
import { loadNeedsForAthlete } from "@/lib/recruiting/needs-server"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } }

/**
 * "Programs recruiting your weight and class" for a wrestler's own family (and admins): live,
 * coach-confirmed needs that fit him. Free - no subscription is checked. Anyone else gets
 * `visible: false` and the profile shows no such row.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hidden = NextResponse.json({ visible: false, needs: [] }, PRIVATE)
  const userId = await resolveRequestUserId(request).catch(() => null)
  if (!userId) return hidden
  const admin = createAdminClient()
  const [family, { data: me }] = await Promise.all([
    ownsAthlete(admin, userId, id).catch(() => false),
    admin.from("user_profiles").select("is_admin, role").eq("user_id", userId).maybeSingle(),
  ])
  if (!family && !(me?.is_admin === true || me?.role === "admin")) return hidden
  const since = request.nextUrl.searchParams.get("since") ?? undefined
  const needs = await loadNeedsForAthlete(admin, id, { since })
  return NextResponse.json({ visible: true, family, needs }, PRIVATE)
}
