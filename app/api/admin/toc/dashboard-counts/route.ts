import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [sponsors, volunteers, nominations, media, email, users, collegeCoaches, cornerCoaches] = await Promise.all([
    admin.from("toc_sponsor_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("toc_volunteer_signups").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("toc_nominations").select("id", { count: "exact", head: true }).eq("reviewed", false),
    admin.from("toc_media_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("toc_email_subscribers").select("id", { count: "exact", head: true }).eq("unsubscribed", false).gte("created_at", sevenDaysAgo),
    admin.schema("auth").from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("toc_college_coaches").select("id", { count: "exact", head: true }).eq("status", "registered"),
    /** Designations a family has filed and nobody has approved yet — the actionable number. */
    admin.from("toc_coach_designations").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  const results = {
    sponsors,
    volunteers,
    nominations,
    media,
    email,
    users,
    collegeCoaches,
    cornerCoaches,
  }
  const failed = Object.entries(results).filter(([, result]) => result.error)
  if (failed.length > 0) {
    console.error(
      "[RecruitNC] TOC dashboard counts",
      failed.map(([key, result]) => `${key}: ${result.error?.message}`),
    )
  }

  return NextResponse.json({
    counts: Object.fromEntries(Object.entries(results).map(([key, result]) => [key, result.error ? 0 : (result.count ?? 0)])),
  })
}
