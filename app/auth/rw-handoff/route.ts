import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeRole } from "@/lib/viewer-role"
import { RW_ORIGIN, safeNextPath } from "@/lib/recruiting/coach-cutover"

export const dynamic = "force-dynamic"

/**
 * A college coach signed in at NC United, handed across to RecruitWrestlers.com signed in (Matt,
 * 29 Oct 2026: "logging in via NC United is fully supported"). The two addresses keep separate
 * sessions, so this mints a one-time sign-in for the coach's own account - single use, minutes
 * long, never emailed - and spends it on RecruitWrestlers' own callback, which continues to the
 * page he asked for. Only a signed-in college coach is handed across; anyone else carries on here.
 */
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"))
  const stay = NextResponse.redirect(new URL(next, request.url), 307)
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user?.email) {
    // His session here has lapsed: he signs in on RecruitWrestlers instead.
    return NextResponse.redirect(`${RW_ORIGIN}/auth/signin?returnTo=${encodeURIComponent(next)}`, 307)
  }
  const admin = createAdminClient()
  const { data: profile } = await admin.from("user_profiles").select("role, profile_type, is_admin").eq("user_id", user.id).maybeSingle()
  const role = normalizeRole(profile?.role || profile?.profile_type)
  if (!profile || profile.is_admin === true || role !== "college_coach") return stay

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email })
  const hash = data?.properties?.hashed_token
  if (error || !hash) {
    console.error("[rw-handoff] could not mint a sign-in", error?.message)
    return NextResponse.redirect(`${RW_ORIGIN}/auth/signin?returnTo=${encodeURIComponent(next)}`, 307)
  }
  // ?from=ncu shows the welcome note once on the other side.
  const landing = `${next}${next.includes("?") ? "&" : "?"}from=ncu`
  const res = NextResponse.redirect(`${RW_ORIGIN}/auth/callback?token_hash=${encodeURIComponent(hash)}&type=magiclink&next=${encodeURIComponent(landing)}`, 307)
  res.headers.set("Cache-Control", "no-store")
  res.headers.set("Referrer-Policy", "no-referrer")
  return res
}
