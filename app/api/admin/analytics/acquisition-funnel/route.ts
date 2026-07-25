import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"

export const dynamic = "force-dynamic"

const FUNNEL_EVENTS = [
  "login_wall_view",
  "signup_started",
  "signup_submitted",
  "signup_error",
  "signup_completed",
  "verification_email_sent",
  "verification_resend_requested",
  "verification_completed",
  "signin_started",
  "signin_completed",
] as const

type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

function emptyCounts(): Record<FunnelEvent, number> {
  return {
    login_wall_view: 0,
    signup_started: 0,
    signup_submitted: 0,
    signup_error: 0,
    signup_completed: 0,
    verification_email_sent: 0,
    verification_resend_requested: 0,
    verification_completed: 0,
    signin_started: 0,
    signin_completed: 0,
  }
}

export async function GET() {
  const authCheck = await getCachedAdminCheck()
  if (authCheck.response) return authCheck.response
  if (!authCheck.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const { data, error } = await admin
    .from("user_analytics")
    .select("event_type, page_url, referrer, created_at")
    .in("event_type", [...FUNNEL_EVENTS])
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000)

  if (error) {
    console.warn("[acquisition-funnel]", error.message)
    return NextResponse.json({ error: "Could not load funnel" }, { status: 500 })
  }

  const last7 = emptyCounts()
  const last30 = emptyCounts()
  const topLoginWallTargets = new Map<string, number>()

  for (const row of data ?? []) {
    const event = row.event_type as FunnelEvent
    if (!FUNNEL_EVENTS.includes(event)) continue

    const createdAt = new Date(row.created_at as string)
    if (Number.isNaN(createdAt.getTime())) continue

    last30[event] += 1
    if (createdAt >= sevenDaysAgo) last7[event] += 1

    if (event === "login_wall_view") {
      const target = String(row.referrer || row.page_url || "/")
      topLoginWallTargets.set(target, (topLoginWallTargets.get(target) || 0) + 1)
    }
  }

  const signupStartToCreateRate7d =
    last7.signup_started > 0 ? Math.round((last7.signup_completed / last7.signup_started) * 100) : null
  const signupSubmitSuccessRate7d =
    last7.signup_submitted > 0 ? Math.round((last7.signup_completed / last7.signup_submitted) * 100) : null
  const verificationRate7d =
    last7.signup_completed > 0 ? Math.round((last7.verification_completed / last7.signup_completed) * 100) : null

  return NextResponse.json({
    success: true,
    last7,
    last30,
    signupCompletionRate7d: signupStartToCreateRate7d,
    signupStartToCreateRate7d,
    signupSubmitSuccessRate7d,
    verificationRate7d,
    topLoginWallTargets: [...topLoginWallTargets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => ({ path, count })),
  })
}
